'use strict';

const crypto = require('crypto');
const { freshPool } = require('./characters');

const STARTING_BUDGET = 100;
const ROSTER_SIZE = 5;
const MIN_BID_INCREMENT = 1;
const NOMINATION_SECONDS = 30;
const BIDDING_SECONDS = 15;
const ANTI_SNIPE_SECONDS = 5;
const VOTING_SECONDS = 25;

function id() {
  return crypto.randomUUID();
}

/**
 * One Room owns the entire lifecycle of a single game: lobby -> auction ->
 * voting -> results. It is transport-agnostic — it calls `onUpdate(room)`
 * whenever state changes and the server layer is responsible for actually
 * broadcasting it over Socket.IO.
 */
class Room {
  constructor(code, onUpdate) {
    this.code = code;
    this.onUpdate = onUpdate;
    this.phase = 'lobby'; // lobby | auction | voting | results
    this.players = new Map(); // playerId -> player
    this.playerOrder = []; // playerIds in join order (nomination rotation)
    this.hostId = null;
    this.pool = [];
    this.auction = null;
    this.voting = null;
    this.createdAt = Date.now();
    this.lastActivity = Date.now();
    this._timer = null;
  }

  touch() {
    this.lastActivity = Date.now();
  }

  // ---------- Lobby ----------

  addPlayer(name, socketId) {
    const trimmed = String(name || '').trim().slice(0, 20) || 'Player';
    const existingNames = new Set(
      [...this.players.values()].map((p) => p.name.toLowerCase())
    );
    let finalName = trimmed;
    let n = 2;
    while (existingNames.has(finalName.toLowerCase())) {
      finalName = `${trimmed} (${n++})`;
    }

    const player = {
      id: id(),
      name: finalName,
      socketId,
      connected: true,
      budget: STARTING_BUDGET,
      roster: [], // { id, name, anime, color, price }
      isHost: this.players.size === 0,
    };
    if (player.isHost) this.hostId = player.id;
    this.players.set(player.id, player);
    this.playerOrder.push(player.id);
    this.touch();
    return player;
  }

  findPlayerBySocket(socketId) {
    for (const p of this.players.values()) {
      if (p.socketId === socketId) return p;
    }
    return null;
  }

  findByNameInLobby(name) {
    const lower = String(name || '').trim().toLowerCase();
    for (const p of this.players.values()) {
      if (p.name.toLowerCase() === lower) return p;
    }
    return null;
  }

  reconnect(playerId, socketId) {
    const player = this.players.get(playerId);
    if (!player) return null;
    player.socketId = socketId;
    player.connected = true;
    this.touch();
    return player;
  }

  disconnectSocket(socketId) {
    const player = this.findPlayerBySocket(socketId);
    if (!player) return null;
    player.connected = false;
    player.socketId = null;
    // Reassign host if needed.
    if (this.hostId === player.id) {
      const next = this.playerOrder
        .map((pid) => this.players.get(pid))
        .find((p) => p && p.connected);
      if (next) {
        this.hostId = next.id;
        next.isHost = true;
      }
      player.isHost = false;
    }
    this.touch();
    return player;
  }

  connectedPlayers() {
    return this.playerOrder
      .map((pid) => this.players.get(pid))
      .filter((p) => p && p.connected);
  }

  canStart() {
    const n = this.players.size;
    return this.phase === 'lobby' && n >= 2 && n <= 4;
  }

  // ---------- Auction ----------

  startAuction() {
    if (!this.canStart()) return false;
    this.phase = 'auction';
    this.pool = freshPool();
    this.auction = {
      nominatorIndex: 0,
      stage: 'nominating', // nominating | bidding
      character: null,
      highestBid: 0,
      highestBidderId: null,
      bidLog: [],
      endsAt: Date.now() + NOMINATION_SECONDS * 1000,
    };
    this._advanceToEligibleNominator(0);
    this._armTimer(NOMINATION_SECONDS, () => this._autoNominate());
    this.touch();
    return true;
  }

  _slotsRemaining(player) {
    return ROSTER_SIZE - player.roster.length;
  }

  _eligibleNominators() {
    // Any connected player who still needs waifus.
    return this.playerOrder.filter((pid) => {
      const p = this.players.get(pid);
      return p && p.connected && this._slotsRemaining(p) > 0;
    });
  }

  _advanceToEligibleNominator(fromIndex) {
    const order = this.playerOrder;
    if (order.length === 0) return;
    let idx = fromIndex % order.length;
    for (let i = 0; i < order.length; i++) {
      const p = this.players.get(order[idx]);
      if (p && p.connected && this._slotsRemaining(p) > 0) {
        this.auction.nominatorIndex = idx;
        return;
      }
      idx = (idx + 1) % order.length;
    }
  }

  maxAffordableBid(player) {
    const slotsAfterThis = this._slotsRemaining(player) - 1; // slots still needed after winning current one
    const reserve = Math.max(0, slotsAfterThis) * MIN_BID_INCREMENT;
    return Math.max(0, player.budget - reserve);
  }

  currentNominator() {
    if (!this.auction) return null;
    const pid = this.playerOrder[this.auction.nominatorIndex];
    return this.players.get(pid) || null;
  }

  nominate(playerId, characterId) {
    if (!this.auction || this.auction.stage !== 'nominating') return { ok: false, error: 'not_nominating' };
    const nominator = this.currentNominator();
    if (!nominator || nominator.id !== playerId) return { ok: false, error: 'not_your_turn' };
    const idx = this.pool.findIndex((c) => c.id === characterId);
    if (idx === -1) return { ok: false, error: 'character_unavailable' };

    const [character] = this.pool.splice(idx, 1);
    this.auction.stage = 'bidding';
    this.auction.character = character;
    this.auction.highestBid = 0;
    this.auction.highestBidderId = null;
    this.auction.bidLog = [];
    this.auction.endsAt = Date.now() + BIDDING_SECONDS * 1000;
    this._armTimer(BIDDING_SECONDS, () => this._finalizeAuction());
    this.touch();
    this._emit();
    return { ok: true };
  }

  _autoNominate() {
    if (!this.auction || this.auction.stage !== 'nominating') return;
    if (this.pool.length === 0) {
      this._checkAuctionComplete();
      return;
    }
    const nominator = this.currentNominator();
    if (!nominator) {
      this._checkAuctionComplete();
      return;
    }
    const randomCharacter = this.pool[Math.floor(Math.random() * this.pool.length)];
    this.nominate(nominator.id, randomCharacter.id);
  }

  placeBid(playerId, amount) {
    if (!this.auction || this.auction.stage !== 'bidding') return { ok: false, error: 'not_bidding' };
    const player = this.players.get(playerId);
    if (!player || !player.connected) return { ok: false, error: 'invalid_player' };
    if (this._slotsRemaining(player) <= 0) return { ok: false, error: 'roster_full' };

    amount = Math.floor(Number(amount));
    if (!Number.isFinite(amount)) return { ok: false, error: 'invalid_amount' };

    const minNext = this.auction.highestBid + MIN_BID_INCREMENT;
    if (amount < minNext) return { ok: false, error: 'bid_too_low', minNext };

    const max = this.maxAffordableBid(player);
    if (amount > max) return { ok: false, error: 'bid_too_high', max };

    this.auction.highestBid = amount;
    this.auction.highestBidderId = player.id;
    this.auction.bidLog.push({ playerId: player.id, amount, at: Date.now() });

    // Anti-snipe: if under ANTI_SNIPE_SECONDS left, extend the clock.
    const remainingMs = this.auction.endsAt - Date.now();
    if (remainingMs < ANTI_SNIPE_SECONDS * 1000) {
      this.auction.endsAt = Date.now() + ANTI_SNIPE_SECONDS * 1000;
      this._armTimer(ANTI_SNIPE_SECONDS, () => this._finalizeAuction());
    }

    this.touch();
    this._emit();
    return { ok: true };
  }

  _finalizeAuction() {
    if (!this.auction || this.auction.stage !== 'bidding') return;
    const { character, highestBid, highestBidderId } = this.auction;
    let result = null;

    if (highestBidderId) {
      const winner = this.players.get(highestBidderId);
      winner.budget -= highestBid;
      winner.roster.push({ ...character, price: highestBid });
      result = { character, winnerId: winner.id, price: highestBid };
    } else {
      // No bids: character returns to the pool for a later round.
      this.pool.push(character);
      result = { character, winnerId: null, price: 0 };
    }

    this.auction.lastResult = result;
    this.auction.stage = 'result';
    this._emit();

    if (this._checkAuctionComplete()) return;

    // Brief pause so players can see the result, then move on.
    this._armTimer(3, () => this._startNextNomination());
  }

  _startNextNomination() {
    if (this.phase !== 'auction') return;
    this._advanceToEligibleNominator(this.auction.nominatorIndex + 1);
    this.auction.stage = 'nominating';
    this.auction.character = null;
    this.auction.lastResult = null;
    this.auction.endsAt = Date.now() + NOMINATION_SECONDS * 1000;
    this._armTimer(NOMINATION_SECONDS, () => this._autoNominate());
    this._emit();
  }

  _checkAuctionComplete() {
    const active = this.connectedPlayers();
    const allFull = active.length > 0 && active.every((p) => p.roster.length >= ROSTER_SIZE);
    const noOneEligible = this._eligibleNominators().length === 0;
    if (allFull || noOneEligible) {
      this._clearTimer();
      this._startVoting();
      return true;
    }
    return false;
  }

  // ---------- Voting ----------

  _startVoting() {
    this.phase = 'voting';
    this.voting = {
      round: 1,
      totalRounds: ROSTER_SIZE,
      votes: {}, // voterId -> candidatePlayerId
      history: [], // { round, tally: {playerId: count}, winners: [playerId] }
      scores: {}, // playerId -> total round wins
      endsAt: null,
    };
    for (const p of this.players.values()) this.voting.scores[p.id] = 0;
    this._startVotingRound();
  }

  _currentMatchup() {
    const r = this.voting.round;
    return this.playerOrder
      .map((pid) => this.players.get(pid))
      .filter((p) => p && p.roster.length >= r)
      .map((p) => ({ playerId: p.id, character: p.roster[r - 1] }));
  }

  _startVotingRound() {
    this.voting.votes = {};
    this.voting.matchup = this._currentMatchup();
    this.voting.endsAt = Date.now() + VOTING_SECONDS * 1000;
    this._armTimer(VOTING_SECONDS, () => this._finalizeVotingRound());
    this.touch();
    this._emit();
  }

  castVote(voterId, candidatePlayerId) {
    if (this.phase !== 'voting') return { ok: false, error: 'not_voting' };
    const voter = this.players.get(voterId);
    if (!voter || !voter.connected) return { ok: false, error: 'invalid_voter' };
    const candidateInMatchup = this.voting.matchup.some((m) => m.playerId === candidatePlayerId);
    if (!candidateInMatchup) return { ok: false, error: 'invalid_candidate' };

    this.voting.votes[voterId] = candidatePlayerId;
    this.touch();
    this._emit();

    const eligibleVoters = this.connectedPlayers();
    const allVoted = eligibleVoters.every((p) => this.voting.votes[p.id]);
    if (allVoted) {
      this._clearTimer();
      this._finalizeVotingRound();
    }
    return { ok: true };
  }

  _finalizeVotingRound() {
    if (this.phase !== 'voting') return;
    const tally = {};
    for (const m of this.voting.matchup) tally[m.playerId] = 0;
    for (const candidateId of Object.values(this.voting.votes)) {
      if (tally[candidateId] !== undefined) tally[candidateId]++;
    }
    const max = Math.max(0, ...Object.values(tally));
    const winners = max > 0 ? Object.keys(tally).filter((pid) => tally[pid] === max) : [];
    for (const w of winners) this.voting.scores[w] = (this.voting.scores[w] || 0) + 1;

    this.voting.history.push({
      round: this.voting.round,
      matchup: this.voting.matchup,
      tally,
      winners,
    });

    this._emit();

    if (this.voting.round >= this.voting.totalRounds) {
      this._armTimer(4, () => this._finishGame());
    } else {
      this._armTimer(4, () => {
        this.voting.round += 1;
        this._startVotingRound();
      });
    }
  }

  _finishGame() {
    this.phase = 'results';
    const standings = [...this.players.values()]
      .map((p) => ({
        playerId: p.id,
        name: p.name,
        score: this.voting.scores[p.id] || 0,
        roster: p.roster,
        budgetLeft: p.budget,
      }))
      .sort((a, b) => b.score - a.score);
    this.results = { standings, roundHistory: this.voting.history };
    this._emit();
  }

  resetToLobby() {
    this._clearTimer();
    this.phase = 'lobby';
    this.pool = [];
    this.auction = null;
    this.voting = null;
    this.results = null;
    for (const p of this.players.values()) {
      p.budget = STARTING_BUDGET;
      p.roster = [];
    }
    this.touch();
    this._emit();
    return true;
  }

  // ---------- Housekeeping ----------

  _armTimer(seconds, fn) {
    this._clearTimer();
    this._timer = setTimeout(fn, seconds * 1000);
  }

  _clearTimer() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  destroy() {
    this._clearTimer();
  }

  _emit() {
    if (this.onUpdate) this.onUpdate(this);
  }

  // ---------- Serialization ----------

  toJSON(forPlayerId) {
    const players = this.playerOrder
      .map((pid) => this.players.get(pid))
      .filter(Boolean)
      .map((p) => ({
        id: p.id,
        name: p.name,
        connected: p.connected,
        isHost: p.id === this.hostId,
        budget: p.budget,
        roster: p.roster,
      }));

    const base = {
      code: this.code,
      phase: this.phase,
      hostId: this.hostId,
      players,
      you: forPlayerId || null,
      poolRemaining: this.pool.length,
    };

    if (this.phase === 'auction' && this.auction) {
      const nominator = this.currentNominator();
      base.auction = {
        stage: this.auction.stage,
        nominatorId: nominator ? nominator.id : null,
        character: this.auction.character,
        highestBid: this.auction.highestBid,
        highestBidderId: this.auction.highestBidderId,
        bidLog: this.auction.bidLog.slice(-10),
        endsAt: this.auction.endsAt,
        lastResult: this.auction.lastResult || null,
        // Everyone can browse the remaining pool while a nomination is being made,
        // even though only the current nominator is allowed to pick from it.
        pool: this.auction.stage === 'nominating' ? this.pool : undefined,
      };
    }

    if (this.phase === 'voting' && this.voting) {
      base.voting = {
        round: this.voting.round,
        totalRounds: this.voting.totalRounds,
        matchup: this.voting.matchup,
        votes: this.voting.votes,
        scores: this.voting.scores,
        endsAt: this.voting.endsAt,
        history: this.voting.history,
      };
    }

    if (this.phase === 'results' && this.results) {
      base.results = this.results;
    }

    return base;
  }
}

module.exports = { Room, STARTING_BUDGET, ROSTER_SIZE };
