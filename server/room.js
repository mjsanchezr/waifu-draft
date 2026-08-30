'use strict';

const crypto = require('crypto');
const { freshPool } = require('./characters');

const DEFAULT_STARTING_BUDGET = 100;
const BUDGET_RANGE = {
  money: { min: 20, max: 500 },
  shots: { min: 5, max: 10 },
};
const DEFAULT_ROSTER_SIZE = 5;
const MIN_ROSTER_SIZE = 3;
const MAX_ROSTER_SIZE = 10;
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
    this.settings = {
      mode: 'choice', // choice (nominator picks) | random (auto-picked) | blind (auto-picked + hidden until won)
      noSelfVote: true, // players can't vote for their own submitted waifu
      rosterSize: DEFAULT_ROSTER_SIZE, // waifus each player collects before voting starts
      includeTroll: false, // mix in joke/mascot characters (Chopper, Ryuk, etc.) — waifu set only
      startingBudget: DEFAULT_STARTING_BUDGET, // amount each player starts the auction with
      currency: 'money', // money ($20-$500) | shots (5-10) — what the "budget" actually represents
      characterSet: 'waifu', // waifu | men — which catalog freshPool() draws from
    };
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
      budget: this.settings.startingBudget,
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

  leaveRoom(playerId) {
    if (this.phase !== 'lobby') return { ok: false, error: 'game_in_progress' };
    if (!this.players.has(playerId)) return { ok: false, error: 'invalid_player' };

    this.players.delete(playerId);
    this.playerOrder = this.playerOrder.filter((pid) => pid !== playerId);

    if (this.hostId === playerId) {
      const next = this.playerOrder
        .map((pid) => this.players.get(pid))
        .find((p) => p && p.connected);
      this.hostId = next ? next.id : null;
      if (next) next.isHost = true;
    }

    this.touch();
    const empty = this.players.size === 0;
    if (!empty) this._emit();
    return { ok: true, empty };
  }

  updateSettings(playerId, patch) {
    if (this.phase !== 'lobby') return { ok: false, error: 'game_in_progress' };
    if (playerId !== this.hostId) return { ok: false, error: 'not_host' };

    const next = { ...this.settings };
    if (patch && Object.prototype.hasOwnProperty.call(patch, 'mode')) {
      if (!['choice', 'random', 'blind'].includes(patch.mode)) {
        return { ok: false, error: 'invalid_mode' };
      }
      next.mode = patch.mode;
    }
    if (patch && Object.prototype.hasOwnProperty.call(patch, 'noSelfVote')) {
      next.noSelfVote = !!patch.noSelfVote;
    }
    if (patch && Object.prototype.hasOwnProperty.call(patch, 'includeTroll')) {
      next.includeTroll = !!patch.includeTroll;
    }
    if (patch && Object.prototype.hasOwnProperty.call(patch, 'rosterSize')) {
      const size = Math.floor(Number(patch.rosterSize));
      if (!Number.isFinite(size) || size < MIN_ROSTER_SIZE || size > MAX_ROSTER_SIZE) {
        return { ok: false, error: 'invalid_roster_size' };
      }
      next.rosterSize = size;
    }
    if (patch && Object.prototype.hasOwnProperty.call(patch, 'currency')) {
      if (!['money', 'shots'].includes(patch.currency)) {
        return { ok: false, error: 'invalid_currency' };
      }
      next.currency = patch.currency;
      // Snap the budget into the new currency's range so switching (e.g.
      // money's $100 default) into shots mode doesn't leave a value miles
      // outside 5-10 until someone happens to also touch the stepper.
      const range = BUDGET_RANGE[next.currency];
      next.startingBudget = Math.min(range.max, Math.max(range.min, next.startingBudget));
    }
    if (patch && Object.prototype.hasOwnProperty.call(patch, 'startingBudget')) {
      const budget = Math.floor(Number(patch.startingBudget));
      const range = BUDGET_RANGE[next.currency];
      if (!Number.isFinite(budget) || budget < range.min || budget > range.max) {
        return { ok: false, error: 'invalid_starting_budget' };
      }
      next.startingBudget = budget;
    }
    if (patch && Object.prototype.hasOwnProperty.call(patch, 'characterSet')) {
      if (!['waifu', 'men'].includes(patch.characterSet)) {
        return { ok: false, error: 'invalid_character_set' };
      }
      next.characterSet = patch.characterSet;
      if (patch.characterSet !== 'waifu') next.includeTroll = false; // no troll roster for other sets
    }
    this.settings = next;
    this.touch();
    this._emit();
    return { ok: true };
  }

  // ---------- Auction ----------

  startAuction() {
    if (!this.canStart()) return false;
    this.phase = 'auction';
    // Re-sync in case the host changed the budget after someone had already
    // joined with the old default baked into their player object.
    for (const p of this.players.values()) p.budget = this.settings.startingBudget;
    this.pool = freshPool({ includeTroll: this.settings.includeTroll, characterSet: this.settings.characterSet });
    this.auction = {
      nominatorIndex: 0,
      stage: 'nominating', // nominating | bidding | result
      character: null,
      highestBid: 0,
      highestBidderId: null,
      bidLog: [],
      endsAt: null,
    };
    this._advanceToEligibleNominator(0);
    this._beginNomination();
    this.touch();
    return true;
  }

  /** Opens the current nominator's turn: waits for a manual pick in "choice"
   * mode, or auto-resolves instantly in "random"/"blind" mode (in blind
   * mode nobody — not even the nominator — can see character names, so
   * there's nothing meaningful to manually pick from). */
  _beginNomination() {
    this.auction.stage = 'nominating';
    this.auction.character = null;
    this.auction.lastResult = null;
    if (this.settings.mode === 'random' || this.settings.mode === 'blind') {
      this.auction.endsAt = null;
      this._autoNominate(); // resolves synchronously and emits its own state
    } else {
      this.auction.endsAt = Date.now() + NOMINATION_SECONDS * 1000;
      this._armTimer(NOMINATION_SECONDS, () => this._autoNominate());
      this._emit();
    }
  }

  _slotsRemaining(player) {
    return this.settings.rosterSize - player.roster.length;
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
    this.auction.skipped = new Set();
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
    this.auction.skipped.delete(player.id); // bidding after a skip un-skips you

    // Anti-snipe: if under ANTI_SNIPE_SECONDS left, extend the clock.
    const remainingMs = this.auction.endsAt - Date.now();
    if (remainingMs < ANTI_SNIPE_SECONDS * 1000) {
      this.auction.endsAt = Date.now() + ANTI_SNIPE_SECONDS * 1000;
      this._armTimer(ANTI_SNIPE_SECONDS, () => this._finalizeAuction());
    }

    this.touch();
    this._emit();

    // Safe to auto-finalize here too: _allBiddersDecided() only counts the
    // *current* leader as settled, so an outbid player (not the leader, and
    // unable to skip once they've bid) always keeps the round open for
    // themselves — this only fires when literally everyone else has
    // explicitly skipped, e.g. skip -> skip -> bid ordering.
    if (this._allBiddersDecided()) {
      this._clearTimer();
      this._finalizeAuction();
    }
    return { ok: true };
  }

  _eligibleBidders() {
    return this.connectedPlayers().filter((p) => this._slotsRemaining(p) > 0);
  }

  /** True once every eligible bidder is either the current leader (nothing
   * more for them to do unless someone outbids them) or has explicitly
   * skipped. A player who bid and then got outbid is neither — they can't
   * skip anymore, but they're not "decided" either, so the round correctly
   * keeps running instead of being cut short on them. */
  _allBiddersDecided() {
    if (!this.auction || this.auction.stage !== 'bidding') return false;
    const leaderId = this.auction.highestBidderId;
    return this._eligibleBidders().every((p) => p.id === leaderId || this.auction.skipped.has(p.id));
  }

  skip(playerId) {
    if (!this.auction || this.auction.stage !== 'bidding') return { ok: false, error: 'not_bidding' };
    const player = this.players.get(playerId);
    if (!player || !player.connected) return { ok: false, error: 'invalid_player' };
    if (this._slotsRemaining(player) <= 0) return { ok: false, error: 'roster_full' };
    if (this.auction.bidLog.some((b) => b.playerId === playerId)) {
      return { ok: false, error: 'already_bid' };
    }

    this.auction.skipped.add(playerId);
    this.touch();
    this._emit();

    if (this._allBiddersDecided()) {
      this._clearTimer();
      this._finalizeAuction();
    }
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
    this._beginNomination();
  }

  _checkAuctionComplete() {
    const active = this.connectedPlayers();
    const allFull = active.length > 0 && active.every((p) => p.roster.length >= this.settings.rosterSize);
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
      totalRounds: this.settings.rosterSize,
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
    if (Object.prototype.hasOwnProperty.call(this.voting.votes, voterId)) {
      return { ok: false, error: 'already_voted' };
    }
    if (this.settings.noSelfVote && candidatePlayerId === voterId) {
      return { ok: false, error: 'self_vote_not_allowed' };
    }
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
      p.budget = this.settings.startingBudget;
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
      settings: this.settings,
    };

    if (this.phase === 'auction' && this.auction) {
      const nominator = this.currentNominator();
      const isBlind = this.settings.mode === 'blind';
      const rawCharacter = this.auction.character;
      const character =
        rawCharacter && isBlind && this.auction.stage === 'bidding'
          ? { anime: rawCharacter.anime, color: rawCharacter.color, hidden: true }
          : rawCharacter;
      base.auction = {
        stage: this.auction.stage,
        nominatorId: nominator ? nominator.id : null,
        character,
        highestBid: this.auction.highestBid,
        highestBidderId: this.auction.highestBidderId,
        bidLog: this.auction.bidLog.slice(-10),
        skipped: this.auction.skipped ? Array.from(this.auction.skipped) : [],
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

module.exports = {
  Room,
  DEFAULT_STARTING_BUDGET,
  BUDGET_RANGE,
  DEFAULT_ROSTER_SIZE,
  MIN_ROSTER_SIZE,
  MAX_ROSTER_SIZE,
};
