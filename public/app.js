'use strict';

const socket = io();

let myPlayerId = localStorage.getItem('wd_playerId') || null;
let myRoomCode = localStorage.getItem('wd_roomCode') || null;
let latestState = null;
let me = null;

// ---------- helpers ----------

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

let toastTimer = null;
function toast(msg, isError = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.style.borderColor = isError ? 'var(--bad)' : 'var(--accent)';
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

function showScreen(name) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  const el = document.getElementById(`screen-${name}`);
  if (el) el.classList.add('active');
}

const ERROR_MESSAGES = {
  room_not_found: 'No existe esa sala.',
  game_in_progress: 'Esa sala ya empezó a jugar.',
  room_full: 'La sala ya tiene 4 jugadores.',
  player_not_found: 'No se pudo reconectar a la sala.',
  not_host: 'Solo el host puede hacer eso.',
  not_your_turn: 'No es tu turno de nominar.',
  character_unavailable: 'Ese personaje ya no está disponible.',
  not_bidding: 'No hay ninguna subasta activa ahora mismo.',
  invalid_player: 'Jugador inválido.',
  roster_full: 'Ya completaste tus 5 waifus.',
  bid_too_low: 'Tu puja es demasiado baja.',
  bid_too_high: 'No puedes pujar tanto: te quedarías sin dinero para tus huecos restantes.',
  invalid_amount: 'Cantidad inválida.',
  not_voting: 'No hay votación activa.',
  invalid_candidate: 'Voto inválido.',
  not_finished: 'La partida todavía no ha terminado.',
  invalid_mode: 'Modo de juego inválido.',
  already_voted: 'Ya has votado en esta ronda — tu voto es definitivo.',
  self_vote_not_allowed: 'No puedes votar por tu propia waifu en esta partida.',
};
function errorMessage(code) {
  return ERROR_MESSAGES[code] || 'Algo salió mal.';
}

function maxAffordableBid(player) {
  const slotsAfterThis = (5 - player.roster.length) - 1;
  const reserve = Math.max(0, slotsAfterThis) * 1;
  return Math.max(0, player.budget - reserve);
}

function playerName(state, playerId) {
  const p = state.players.find((pl) => pl.id === playerId);
  return p ? p.name : '???';
}

// ---------- timers ----------

const timers = {};
function armTimer(elId, endsAt) {
  if (!endsAt) {
    delete timers[elId];
    setFill(elId, 0);
    return;
  }
  const prev = timers[elId];
  if (!prev || prev.endsAt !== endsAt) {
    timers[elId] = { endsAt, duration: Math.max(300, endsAt - Date.now()) };
  }
}
function setFill(elId, frac) {
  const bar = document.getElementById(elId);
  if (!bar) return;
  const fill = bar.querySelector('.timer-fill');
  if (fill) fill.style.width = `${Math.round(frac * 100)}%`;
}
setInterval(() => {
  for (const [elId, t] of Object.entries(timers)) {
    const remain = t.endsAt - Date.now();
    setFill(elId, Math.max(0, Math.min(1, remain / t.duration)));
  }
}, 150);

// ---------- home screen ----------

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`form-${tab.dataset.tab}`).classList.add('active');
  });
});

function persistIdentity(name) {
  localStorage.setItem('wd_playerId', myPlayerId);
  localStorage.setItem('wd_roomCode', myRoomCode);
  localStorage.setItem('wd_name', name);
}

document.getElementById('form-create').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('create-name').value.trim();
  if (!name) return;
  socket.emit('createRoom', { name }, (res) => {
    if (!res.ok) return toast(errorMessage(res.error), true);
    myPlayerId = res.playerId;
    myRoomCode = res.roomCode;
    persistIdentity(name);
  });
});

document.getElementById('form-join').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('join-name').value.trim();
  const code = document.getElementById('join-code').value.trim().toUpperCase();
  if (!name || !code) return;
  socket.emit('joinRoom', { name, code }, (res) => {
    if (!res.ok) return toast(errorMessage(res.error), true);
    myPlayerId = res.playerId;
    myRoomCode = res.roomCode;
    persistIdentity(name);
  });
});

// ---------- socket lifecycle ----------

socket.on('connect', () => {
  if (myPlayerId && myRoomCode) {
    socket.emit('rejoin', { code: myRoomCode, playerId: myPlayerId }, (res) => {
      if (!res.ok) {
        localStorage.removeItem('wd_playerId');
        localStorage.removeItem('wd_roomCode');
        myPlayerId = null;
        myRoomCode = null;
        showScreen('home');
      }
    });
  }
});

socket.on('disconnect', () => toast('Conexión perdida, reconectando…', true));

socket.on('state', (state) => {
  latestState = state;
  me = state.players.find((p) => p.id === myPlayerId) || null;
  render(state);
});

// ---------- render dispatch ----------

function render(state) {
  switch (state.phase) {
    case 'lobby':
      showScreen('lobby');
      renderLobby(state);
      break;
    case 'auction':
      showScreen('auction');
      renderAuction(state);
      break;
    case 'voting':
      showScreen('voting');
      renderVoting(state);
      break;
    case 'results':
      showScreen('results');
      renderResults(state);
      break;
  }
}

// ---------- shared: player chips ----------

function renderPlayersTopbar(elId, state, opts = {}) {
  const el = document.getElementById(elId);
  el.innerHTML = '';
  for (const p of state.players) {
    const chip = document.createElement('div');
    chip.className = 'player-chip';
    if (p.id === myPlayerId) chip.classList.add('is-me');
    if (opts.highlightTurnId && p.id === opts.highlightTurnId) chip.classList.add('is-turn');
    if (!p.connected) chip.classList.add('disconnected');

    let extra;
    if (opts.showScore) {
      const score = (state.voting && state.voting.scores[p.id]) || 0;
      extra = `<div class="pc-budget">${score} pt${score === 1 ? '' : 's'}</div>`;
    } else {
      const slots = Array.from({ length: 5 }, (_, i) => {
        const owned = p.roster[i];
        const style = owned ? ` style="background-image:url('${owned.image || ''}')"` : '';
        return `<span class="slot-dot ${owned ? 'filled' : ''}"${style} title="${owned ? escapeHtml(owned.name) : ''}"></span>`;
      }).join('');
      extra = `<div class="pc-budget">$${p.budget}</div><div class="pc-slots">${slots}</div>`;
    }

    chip.innerHTML = `
      <div class="pc-name">${escapeHtml(p.name)}${p.isHost ? ' <span class="host-badge">HOST</span>' : ''}</div>
      ${extra}
    `;
    el.appendChild(chip);
  }
}

// ---------- lobby ----------

function renderLobby(state) {
  document.getElementById('lobby-code').textContent = state.code;

  const list = document.getElementById('lobby-players');
  list.innerHTML = '';
  for (const p of state.players) {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${escapeHtml(p.name)}${p.id === myPlayerId ? ' (tú)' : ''}${p.isHost ? ' <span class="host-badge">HOST</span>' : ''}</span>
      <span class="status-dot ${p.connected ? 'online' : ''}"></span>
    `;
    list.appendChild(li);
  }

  const isHost = state.hostId === myPlayerId;
  const n = state.players.length;
  const startBtn = document.getElementById('btn-start');
  startBtn.classList.toggle('hidden', !isHost);
  startBtn.disabled = !(isHost && n >= 2 && n <= 4);

  const hint = document.getElementById('lobby-hint');
  if (n < 2) hint.textContent = 'Esperando a que se una al menos un jugador más (mínimo 2)…';
  else if (isHost) hint.textContent = 'Ya podéis empezar cuando queráis (o esperar a más gente, máx. 4).';
  else hint.textContent = 'Esperando a que el host empiece la subasta…';

  renderSettingsPanel(state, isHost);
}

function renderSettingsPanel(state, isHost) {
  const settings = state.settings || { mode: 'choice', noSelfVote: true };

  document.querySelectorAll('#mode-segmented .segmented-option').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === settings.mode);
    btn.disabled = !isHost;
  });

  const selfVoteCheckbox = document.getElementById('setting-no-self-vote');
  selfVoteCheckbox.checked = settings.noSelfVote;
  selfVoteCheckbox.disabled = !isHost;

  document.getElementById('settings-readonly-hint').classList.toggle('hidden', isHost);
}

document.querySelectorAll('#mode-segmented .segmented-option').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (btn.disabled) return;
    socket.emit('updateSettings', { mode: btn.dataset.mode }, (res) => {
      if (!res.ok) toast(errorMessage(res.error), true);
    });
  });
});

document.getElementById('setting-no-self-vote').addEventListener('change', (e) => {
  socket.emit('updateSettings', { noSelfVote: e.target.checked }, (res) => {
    if (!res.ok) {
      toast(errorMessage(res.error), true);
      e.target.checked = !e.target.checked; // revert optimistic UI on rejection
    }
  });
});

document.getElementById('btn-copy-code').addEventListener('click', () => {
  if (!latestState) return;
  navigator.clipboard?.writeText(latestState.code).then(
    () => toast('Código copiado'),
    () => toast(`Código: ${latestState.code}`)
  );
});

document.getElementById('btn-start').addEventListener('click', () => {
  socket.emit('startGame', {}, (res) => {
    if (!res.ok) toast(errorMessage(res.error), true);
  });
});

// ---------- auction ----------

let poolSearch = '';
document.getElementById('pool-search').addEventListener('input', (e) => {
  poolSearch = e.target.value.trim().toLowerCase();
  if (latestState && latestState.phase === 'auction') renderAuction(latestState);
});

function renderAuction(state) {
  const a = state.auction;
  renderPlayersTopbar('auction-players', state, { highlightTurnId: a.nominatorId });

  const nomPanel = document.getElementById('auction-nominating');
  const bidPanel = document.getElementById('auction-bidding');
  const resPanel = document.getElementById('auction-result');
  nomPanel.classList.add('hidden');
  bidPanel.classList.add('hidden');
  resPanel.classList.add('hidden');

  if (a.stage === 'nominating') {
    nomPanel.classList.remove('hidden');
    armTimer('auction-timer-bar', a.endsAt);

    const isMyTurn = a.nominatorId === myPlayerId;
    document.getElementById('nominating-title').textContent = isMyTurn
      ? '¡Es tu turno de nominar!'
      : `${playerName(state, a.nominatorId)} está eligiendo…`;
    document.getElementById('nominating-sub').textContent = isMyTurn
      ? 'Elige qué personaje sale a subasta.'
      : `Quedan ${state.poolRemaining} personajes en la reserva.`;

    renderPool(state, isMyTurn);
  } else if (a.stage === 'bidding') {
    bidPanel.classList.remove('hidden');
    armTimer('auction-timer-bar', a.endsAt);

    document.getElementById('char-portrait').src = a.character.image || '';
    document.getElementById('char-portrait').alt = a.character.name;
    document.getElementById('char-anime').textContent = a.character.anime;
    document.getElementById('char-name').textContent = a.character.name;
    document.getElementById('bid-amount').textContent = `$${a.highestBid}`;
    document.getElementById('bid-leader').textContent = a.highestBidderId
      ? `${playerName(state, a.highestBidderId)} va ganando`
      : 'Sin pujas todavía — mínimo $1';

    const controls = document.getElementById('bid-controls');
    const help = document.getElementById('bid-help');
    if (me && me.roster.length < 5 && me.connected) {
      controls.classList.remove('hidden');
      const max = maxAffordableBid(me);
      help.textContent = `Tu presupuesto: $${me.budget} · Máximo que puedes pujar ahora: $${max}`;
      document.getElementById('bid-input').max = String(max);
    } else {
      controls.classList.add('hidden');
      help.textContent = me && me.roster.length >= 5
        ? 'Ya completaste tu equipo de 5. ¡Disfruta viendo la subasta!'
        : '';
    }

    const log = document.getElementById('bid-log');
    log.innerHTML = a.bidLog
      .slice()
      .reverse()
      .map((b) => `<div>${escapeHtml(playerName(state, b.playerId))} pujó $${b.amount}</div>`)
      .join('');
  } else if (a.stage === 'result') {
    resPanel.classList.remove('hidden');
    armTimer('auction-timer-bar', null);
    const r = a.lastResult;
    document.getElementById('result-title').textContent = r.winnerId
      ? `${r.character.name} (${r.character.anime}) → ¡se la lleva ${playerName(state, r.winnerId)} por $${r.price}!`
      : `Nadie pujó por ${r.character.name}. Vuelve a la reserva.`;
  }
}

function renderPool(state, clickable) {
  const container = document.getElementById('pool-list');
  const pool = (state.auction.pool || []).filter((c) => {
    if (!poolSearch) return true;
    return (
      c.name.toLowerCase().includes(poolSearch) || c.anime.toLowerCase().includes(poolSearch)
    );
  });
  container.innerHTML = '';
  for (const c of pool) {
    const item = document.createElement('div');
    item.className = 'pool-item' + (clickable ? '' : ' disabled');
    item.innerHTML = `
      <img class="pi-thumb" src="${c.image || ''}" alt="" loading="lazy" onerror="this.style.visibility='hidden'" />
      <div>
        <div class="pi-name">${escapeHtml(c.name)}</div>
        <div class="pi-anime">${escapeHtml(c.anime)}</div>
      </div>
    `;
    if (clickable) {
      item.addEventListener('click', () => {
        socket.emit('nominate', { characterId: c.id }, (res) => {
          if (!res.ok) toast(errorMessage(res.error), true);
        });
      });
    }
    container.appendChild(item);
  }
}

function submitBid(amount) {
  amount = Math.floor(Number(amount));
  if (!Number.isFinite(amount) || amount < 1) return;
  socket.emit('placeBid', { amount }, (res) => {
    if (!res.ok) toast(errorMessage(res.error), true);
  });
}

document.querySelectorAll('[data-bid-delta]').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (!latestState || latestState.phase !== 'auction') return;
    const delta = parseInt(btn.dataset.bidDelta, 10);
    const base = latestState.auction.highestBid;
    submitBid(base > 0 ? base + delta : delta);
  });
});
document.getElementById('btn-bid-max').addEventListener('click', () => {
  if (!me) return;
  submitBid(maxAffordableBid(me));
});
document.getElementById('btn-bid-custom').addEventListener('click', () => {
  const val = document.getElementById('bid-input').value;
  submitBid(val);
});

// ---------- voting ----------

function renderVoting(state) {
  renderPlayersTopbar('voting-scoreboard', state, { showScore: true });

  const v = state.voting;
  document.getElementById('voting-round-title').textContent = `Ronda ${v.round} de ${v.totalRounds}`;
  armTimer('voting-timer-bar', v.endsAt);

  const tally = {};
  for (const m of v.matchup) tally[m.playerId] = 0;
  const voteValues = Object.values(v.votes);
  for (const cid of voteValues) if (tally[cid] !== undefined) tally[cid]++;
  const totalVotes = voteValues.length || 1;

  const myVote = v.votes[myPlayerId];
  const hasVoted = myVote !== undefined;
  const noSelfVote = !!(state.settings && state.settings.noSelfVote);

  const statusEl = document.getElementById('voting-status');
  if (hasVoted) statusEl.textContent = 'Ya has votado en esta ronda — espera a que voten los demás.';
  else if (noSelfVote) statusEl.textContent = '¿Cuál es la mejor waifu de esta ronda? Vota tu favorita (no puedes votar la tuya).';
  else statusEl.textContent = '¿Cuál es la mejor waifu de esta ronda? Vota tu favorita.';

  const container = document.getElementById('voting-matchup');
  container.innerHTML = '';
  for (const m of v.matchup) {
    const count = tally[m.playerId] || 0;
    const pct = Math.round((count / totalVotes) * 100);
    const isOwn = m.playerId === myPlayerId;
    const isBlocked = (noSelfVote && isOwn) || hasVoted;
    const card = document.createElement('div');
    card.className = [
      'candidate',
      myVote === m.playerId ? 'voted' : '',
      noSelfVote && isOwn ? 'own' : '',
      isBlocked ? 'locked' : '',
    ].filter(Boolean).join(' ');
    card.innerHTML = `
      <img class="c-portrait" src="${m.character.image || ''}" alt="" loading="lazy" onerror="this.style.visibility='hidden'" />
      <div class="c-anime">${escapeHtml(m.character.anime)}</div>
      <div class="c-name">${escapeHtml(m.character.name)}</div>
      <div class="c-owner">de ${escapeHtml(playerName(state, m.playerId))}${isOwn ? ' (tú)' : ''}</div>
      ${noSelfVote && isOwn ? '<div class="c-blocked-tag">No puedes votar tu propia waifu</div>' : ''}
      <div class="c-bar"><div class="c-bar-fill" style="width:${pct}%"></div></div>
      <div class="c-votes">${count} voto${count === 1 ? '' : 's'}</div>
    `;
    if (!isBlocked) {
      card.addEventListener('click', () => {
        socket.emit('castVote', { candidatePlayerId: m.playerId }, (res) => {
          if (!res.ok) toast(errorMessage(res.error), true);
        });
      });
    }
    container.appendChild(card);
  }
}

// ---------- results ----------

const RANK_CLASSES = ['gold', 'silver', 'bronze'];

function renderResults(state) {
  const r = state.results;

  const standingsEl = document.getElementById('final-standings');
  standingsEl.innerHTML = r.standings
    .map((s, i) => {
      const badgeClass = RANK_CLASSES[i] || '';
      return `
      <div class="standing-row ${i === 0 ? 'rank-1' : ''}">
        <span class="sr-left">
          <span class="rank-badge ${badgeClass}">${i + 1}</span>
          ${escapeHtml(s.name)}${s.playerId === myPlayerId ? ' (tú)' : ''}
        </span>
        <span>${s.score} ronda${s.score === 1 ? '' : 's'} ganada${s.score === 1 ? '' : 's'}</span>
      </div>`;
    })
    .join('');

  const rostersEl = document.getElementById('final-rosters');
  rostersEl.innerHTML = r.standings
    .map((s) => {
      const items = s.roster
        .map(
          (c) => `<div class="rb-item">
            <span class="rb-left"><img class="rb-thumb" src="${c.image || ''}" alt="" loading="lazy" onerror="this.style.visibility='hidden'" /> ${escapeHtml(c.name)} (${escapeHtml(c.anime)})</span>
            <span>$${c.price}</span>
          </div>`
        )
        .join('');
      return `<div class="roster-block"><h3>${escapeHtml(s.name)} · $${s.budgetLeft} sin gastar</h3>${items}</div>`;
    })
    .join('');

  const isHost = state.hostId === myPlayerId;
  const playAgainBtn = document.getElementById('btn-play-again');
  playAgainBtn.classList.toggle('hidden', !isHost);
  document.getElementById('results-hint').textContent = isHost
    ? ''
    : 'Esperando a que el host empiece otra partida…';
}

document.getElementById('btn-play-again').addEventListener('click', () => {
  socket.emit('playAgain', {}, (res) => {
    if (!res.ok) toast(errorMessage(res.error), true);
  });
});
