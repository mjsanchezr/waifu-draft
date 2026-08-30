'use strict';

const socket = io();

let myPlayerId = localStorage.getItem('wd_playerId') || null;
let myRoomCode = localStorage.getItem('wd_roomCode') || null;
let latestState = null;
let me = null;

// ---------- decorative menu backdrop ----------

const SHOWCASE_IMAGES = [
  'https://s4.anilist.co/file/anilistcdn/character/large/b88575-Ayu8UPDA8NS6.png', // Rem
  'https://s4.anilist.co/file/anilistcdn/character/large/b127518-NRlq1CQ1v1ro.png', // Nezuko
  'https://s4.anilist.co/file/anilistcdn/character/large/b124381-2gAVq76HPfL2.png', // Zero Two
  'https://s4.anilist.co/file/anilistcdn/character/large/b40881-F3gr1PkreDvj.png', // Mikasa
  'https://s4.anilist.co/file/anilistcdn/character/large/b36828-j5ib0adAzGMx.png', // Asuna
  'https://s4.anilist.co/file/anilistcdn/character/large/b133676-kV2czE3C8Qls.png', // Marin
  'https://s4.anilist.co/file/anilistcdn/character/large/b138102-ZOAu9jI2d5ke.png', // Yor
  'https://s4.anilist.co/file/anilistcdn/character/large/b137080-UHcynYNjb5ZU.png', // Makima
  'https://s4.anilist.co/file/anilistcdn/character/large/b176754-PCnpqIOkjhFk.png', // Frieren
  'https://s4.anilist.co/file/anilistcdn/character/large/b70069-DEV7X6o2L7oG.jpg', // Kurumi
  'https://s4.anilist.co/file/anilistcdn/character/large/b50389-gIhJkyk8xj1P.png', // Rias
  'https://s4.anilist.co/file/anilistcdn/character/large/b90169-4wr1Zehnsac8.png', // Violet
  'https://s4.anilist.co/file/anilistcdn/character/large/b127222-Jh5hhP7vZ7s1.png', // Mai
  'https://s4.anilist.co/file/anilistcdn/character/large/b172759-cccVhJ2fQA92.png', // Ai Hoshino
  'https://s4.anilist.co/file/anilistcdn/character/large/b5189-GR1xdok9SFsN.jpg', // Erza
  'https://s4.anilist.co/file/anilistcdn/character/large/b16342-kVOF6V5Q94go.png', // Boa Hancock
  'https://s4.anilist.co/file/anilistcdn/character/large/b497-Yg5pNmC8kxzs.png', // Saber
  'https://s4.anilist.co/file/anilistcdn/character/large/b89361-tq8PQQ4MmF0M.png', // Megumin
];

const MEN_SHOWCASE_IMAGES = [
  'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/TomHolland-byPhilipRomano.jpg/500px-TomHolland-byPhilipRomano.jpg', // Tom Holland
  'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Chris_Evans_at_the_2025_Toronto_International_Film_Festival_%28cropped%29.jpg/500px-Chris_Evans_at_the_2025_Toronto_International_Film_Festival_%28cropped%29.jpg', // Chris Evans
  'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Chris_Hemsworth_-_Crime_101.jpg/500px-Chris_Hemsworth_-_Crime_101.jpg', // Chris Hemsworth
  'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Sebastian_Stan-64526.jpg/500px-Sebastian_Stan-64526.jpg', // Sebastian Stan
  'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/RobertDowneyJr-byPhilipRomano7_%28cropped%29.jpg/500px-RobertDowneyJr-byPhilipRomano7_%28cropped%29.jpg', // Robert Downey Jr
  'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/LeoPTABFI191125-28_%28cropped%29.jpg/500px-LeoPTABFI191125-28_%28cropped%29.jpg', // Leonardo DiCaprio
  'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Brad_Pitt-69858.jpg/500px-Brad_Pitt-69858.jpg', // Brad Pitt
  'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Tom_Cruise_at_53rd_Saturn_Awards_2026-01.jpg/500px-Tom_Cruise_at_53rd_Saturn_Awards_2026-01.jpg', // Tom Cruise
  'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Deadpool_2_Japan_Premiere_Red_Carpet_Ryan_Reynolds_%28cropped%29.jpg/500px-Deadpool_2_Japan_Premiere_Red_Carpet_Ryan_Reynolds_%28cropped%29.jpg', // Ryan Reynolds
  'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Channing_Tatum_at_the_2026_Berlin_International_Film_Festival-69843.jpg/500px-Channing_Tatum_at_the_2026_Berlin_International_Film_Festival-69843.jpg', // Channing Tatum
  'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/JacobElordi-TIFF2025-01_%28cropped_2%29.png/500px-JacobElordi-TIFF2025-01_%28cropped_2%29.png', // Jacob Elordi
  'https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Noah_Centineo_by_Gage_Skidmore.jpg/500px-Noah_Centineo_by_Gage_Skidmore.jpg', // Noah Centineo
  'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Robert_Pattinson_at_Berlinale_2025.jpg/500px-Robert_Pattinson_at_Berlinale_2025.jpg', // Robert Pattinson
  'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Andrew_Garfield_82nd_Venice_Film_Festival_%28cropped%29.jpg/500px-Andrew_Garfield_82nd_Venice_Film_Festival_%28cropped%29.jpg', // Andrew Garfield
  'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Nick_Jonas_at_DIFF_2026.jpg/500px-Nick_Jonas_at_DIFF_2026.jpg', // Nick Jonas
  'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/P20260719DT-1213_President_Donald_J._Trump_and_First_Lady_Melania_Trump_attend_the_FIFA_World_Cup_Final_%28cropped_2%29.jpg/500px-P20260719DT-1213_President_Donald_J._Trump_and_First_Lady_Melania_Trump_attend_the_FIFA_World_Cup_Final_%28cropped_2%29.jpg', // Justin Bieber
  'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/2023-11-16_Gala_de_los_Latin_Grammy%2C_20_%28Maluma%29.jpg/500px-2023-11-16_Gala_de_los_Latin_Grammy%2C_20_%28Maluma%29.jpg', // Maluma
  'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Glen_Powell_by_Gage_Skidmore.jpg/500px-Glen_Powell_by_Gage_Skidmore.jpg', // Glenn Powell
];

const BACKDROP_CELL_W = 113; // 110px min column + 3px gap
const BACKDROP_CELL_H = 133; // 130px row + 3px gap

function renderBackdrop(elId, flavor) {
  flavor = flavor || 'waifu';
  const el = document.getElementById(elId);
  if (!el) return;
  // Only (re)build once the element actually has layout — an inactive
  // screen (e.g. the lobby before you've joined a room) reports a 0x0 box,
  // so we'd otherwise under-fill it. Skip silently; whoever makes the
  // screen visible is responsible for calling this again.
  // Already showing this flavor? nothing to do. Showing the *other* one
  // (character-set toggle flipped)? clear and rebuild.
  if (el.dataset.flavor === flavor) return;
  const wrap = el.parentElement;
  const rect = wrap.getBoundingClientRect();
  if (rect.width < 10 || rect.height < 10) return;

  // The grid itself renders at 120% of its wrap (see CSS) so it has room to
  // pan without ever exposing a bare edge — size the tile count off that
  // larger virtual canvas, not the visible viewport, or tall/wide screens
  // would show empty space past whatever a fixed guess covered.
  const gridWidth = rect.width * 1.2;
  const gridHeight = rect.height * 1.2;
  const cols = Math.ceil(gridWidth / BACKDROP_CELL_W) + 1;
  const rows = Math.ceil(gridHeight / BACKDROP_CELL_H) + 1;
  const tileCount = Math.max(24, cols * rows);

  const source = flavor === 'men' ? MEN_SHOWCASE_IMAGES : SHOWCASE_IMAGES;
  // Shuffle a copy so home/lobby don't show the exact same tile order.
  const shuffled = [...source].sort(() => Math.random() - 0.5);
  const tiles = Array.from({ length: tileCount }, (_, i) => shuffled[i % shuffled.length]);
  el.dataset.flavor = flavor;
  el.innerHTML = tiles
    .map(
      (src, i) =>
        `<img src="${src}" alt="" loading="lazy" style="animation-delay:${(i % 8) * 90}ms" onerror="this.style.display='none'" />`
    )
    .join('');
}
let homeCharacterSet = 'waifu';
renderBackdrop('home-backdrop', homeCharacterSet);

function applyTheme(characterSet) {
  document.body.classList.toggle('theme-men', characterSet === 'men');
}

document.querySelectorAll('#character-set-toggle .segmented-option').forEach((btn) => {
  btn.addEventListener('click', () => {
    homeCharacterSet = btn.dataset.characterSet;
    document.querySelectorAll('#character-set-toggle .segmented-option').forEach((b) => {
      b.classList.toggle('active', b === btn);
    });
    applyTheme(homeCharacterSet);
    renderBackdrop('home-backdrop', homeCharacterSet);
    document.getElementById('home-tagline').textContent =
      homeCharacterSet === 'men'
        ? 'Subasta a tus chicos favoritos. Presupuesto: $100. Máximo 5 por jugador. 2-4 jugadores.'
        : 'Subasta a tus waifus favoritas. Presupuesto: $100. Máximo 5 por jugador. 2-4 jugadores.';
  });
});

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
  already_bid: 'Ya has pujado por esta waifu — no puedes saltarla ahora.',
  already_voted: 'Ya has votado en esta ronda — tu voto es definitivo.',
  self_vote_not_allowed: 'No puedes votar por tu propia waifu en esta partida.',
};
function errorMessage(code) {
  return ERROR_MESSAGES[code] || 'Algo salió mal.';
}

function maxAffordableBid(player, rosterSize) {
  const slotsAfterThis = (rosterSize - player.roster.length) - 1;
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
  socket.emit('createRoom', { name, characterSet: homeCharacterSet }, (res) => {
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
  applyTheme(state.settings.characterSet); // the room's actual setting always wins over a pre-join local guess
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
      const slots = Array.from({ length: state.settings.rosterSize }, (_, i) => {
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
  renderBackdrop('lobby-backdrop', state.settings.characterSet); // needs the screen to already be visible/laid out
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

const ROSTER_SIZE_MIN = 3;
const ROSTER_SIZE_MAX = 10;
const BUDGET_MIN = 20;
const BUDGET_MAX = 500;
const BUDGET_STEP = 10;

function renderSettingsPanel(state, isHost) {
  const settings = state.settings || {
    mode: 'choice',
    noSelfVote: true,
    rosterSize: 5,
    includeTroll: false,
    startingBudget: 100,
    characterSet: 'waifu',
  };

  document.querySelectorAll('#character-set-segmented .segmented-option').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.characterSet === settings.characterSet);
    btn.disabled = !isHost;
  });

  document.querySelectorAll('#mode-segmented .segmented-option').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === settings.mode);
    btn.disabled = !isHost;
  });

  document.getElementById('roster-size-value').textContent = settings.rosterSize;
  document.getElementById('roster-size-minus').disabled = !isHost || settings.rosterSize <= ROSTER_SIZE_MIN;
  document.getElementById('roster-size-plus').disabled = !isHost || settings.rosterSize >= ROSTER_SIZE_MAX;

  document.getElementById('budget-value').textContent = `$${settings.startingBudget}`;
  document.getElementById('budget-minus').disabled = !isHost || settings.startingBudget <= BUDGET_MIN;
  document.getElementById('budget-plus').disabled = !isHost || settings.startingBudget >= BUDGET_MAX;
  document.querySelectorAll('[data-budget-delta]').forEach((btn) => { btn.disabled = !isHost; });

  const selfVoteCheckbox = document.getElementById('setting-no-self-vote');
  selfVoteCheckbox.checked = settings.noSelfVote;
  selfVoteCheckbox.disabled = !isHost;

  const trollCheckbox = document.getElementById('setting-include-troll');
  trollCheckbox.checked = settings.includeTroll;
  trollCheckbox.disabled = !isHost;
  document.getElementById('troll-setting-row').classList.toggle('hidden', settings.characterSet !== 'waifu');

  document.getElementById('settings-readonly-hint').classList.toggle('hidden', isHost);
}

document.querySelectorAll('#character-set-segmented .segmented-option').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (btn.disabled) return;
    socket.emit('updateSettings', { characterSet: btn.dataset.characterSet }, (res) => {
      if (!res.ok) toast(errorMessage(res.error), true);
    });
  });
});

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

document.getElementById('setting-include-troll').addEventListener('change', (e) => {
  socket.emit('updateSettings', { includeTroll: e.target.checked }, (res) => {
    if (!res.ok) {
      toast(errorMessage(res.error), true);
      e.target.checked = !e.target.checked;
    }
  });
});

function nudgeRosterSize(delta) {
  if (!latestState || !latestState.settings) return;
  const next = latestState.settings.rosterSize + delta;
  if (next < ROSTER_SIZE_MIN || next > ROSTER_SIZE_MAX) return;
  socket.emit('updateSettings', { rosterSize: next }, (res) => {
    if (!res.ok) toast(errorMessage(res.error), true);
  });
}
document.getElementById('roster-size-minus').addEventListener('click', () => nudgeRosterSize(-1));
document.getElementById('roster-size-plus').addEventListener('click', () => nudgeRosterSize(1));

function nudgeBudget(delta) {
  if (!latestState || !latestState.settings) return;
  const next = Math.min(BUDGET_MAX, Math.max(BUDGET_MIN, latestState.settings.startingBudget + delta));
  if (next === latestState.settings.startingBudget) return;
  socket.emit('updateSettings', { startingBudget: next }, (res) => {
    if (!res.ok) toast(errorMessage(res.error), true);
  });
}
document.getElementById('budget-minus').addEventListener('click', () => nudgeBudget(-BUDGET_STEP));
document.getElementById('budget-plus').addEventListener('click', () => nudgeBudget(BUDGET_STEP));
document.querySelectorAll('[data-budget-delta]').forEach((btn) => {
  btn.addEventListener('click', () => nudgeBudget(parseInt(btn.dataset.budgetDelta, 10)));
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

document.getElementById('btn-leave-room').addEventListener('click', () => {
  socket.emit('leaveRoom', {}, (res) => {
    if (!res.ok) return toast(errorMessage(res.error), true);
    localStorage.removeItem('wd_playerId');
    localStorage.removeItem('wd_roomCode');
    myPlayerId = null;
    myRoomCode = null;
    latestState = null;
    applyTheme(homeCharacterSet); // back to the home screen's own toggle, not whatever the room used
    showScreen('home');
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

    const portraitImg = document.getElementById('char-portrait');
    const mysteryBox = document.getElementById('char-mystery');
    const trollBadge = document.getElementById('char-troll-badge');
    if (a.character.hidden) {
      portraitImg.classList.add('hidden');
      mysteryBox.classList.remove('hidden');
      trollBadge.classList.add('hidden');
      document.getElementById('char-name').textContent = '??? (personaje misterioso)';
    } else {
      portraitImg.classList.remove('hidden');
      mysteryBox.classList.add('hidden');
      portraitImg.src = a.character.image || '';
      portraitImg.alt = a.character.name;
      document.getElementById('char-name').textContent = a.character.name;
      trollBadge.classList.toggle('hidden', !a.character.isTroll);
    }
    document.getElementById('char-anime').textContent = a.character.anime;
    document.getElementById('bid-amount').textContent = `$${a.highestBid}`;
    document.getElementById('bid-leader').textContent = a.highestBidderId
      ? `${playerName(state, a.highestBidderId)} va ganando`
      : 'Sin pujas todavía — mínimo $1';

    const rosterSize = state.settings.rosterSize;
    const controls = document.getElementById('bid-controls');
    const help = document.getElementById('bid-help');
    if (me && me.roster.length < rosterSize && me.connected) {
      controls.classList.remove('hidden');
      const max = maxAffordableBid(me, rosterSize);
      help.textContent = `Tu presupuesto: $${me.budget} · Máximo que puedes pujar ahora: $${max}`;
      document.getElementById('bid-input').max = String(max);
    } else {
      controls.classList.add('hidden');
      help.textContent = me && me.roster.length >= rosterSize
        ? `Ya completaste tu equipo de ${rosterSize}. ¡Disfruta viendo la subasta!`
        : '';
    }

    const log = document.getElementById('bid-log');
    log.innerHTML = a.bidLog
      .slice()
      .reverse()
      .map((b) => `<div>${escapeHtml(playerName(state, b.playerId))} pujó $${b.amount}</div>`)
      .join('');

    renderSkipButton(state, a);
  } else if (a.stage === 'result') {
    resPanel.classList.remove('hidden');
    armTimer('auction-timer-bar', null);
    const r = a.lastResult;
    document.getElementById('result-portrait').src = r.character.image || '';
    document.getElementById('result-portrait').alt = r.character.name;
    document.getElementById('result-anime').textContent = r.character.anime;
    document.getElementById('result-name').textContent = r.character.name;
    document.getElementById('result-troll-badge').classList.toggle('hidden', !r.character.isTroll);
    document.getElementById('result-title').textContent = r.winnerId
      ? `¡Se la lleva ${playerName(state, r.winnerId)} por $${r.price}!`
      : `Nadie pujó. Vuelve a la reserva.`;
  }
}

function renderSkipButton(state, a) {
  const btn = document.getElementById('btn-skip');
  const status = document.getElementById('skip-status');
  const skipped = a.skipped || [];

  if (!me || !me.connected || me.roster.length >= state.settings.rosterSize) {
    btn.classList.add('hidden');
    status.textContent = '';
    return;
  }

  const hasBid = a.bidLog.some((b) => b.playerId === myPlayerId);
  if (hasBid) {
    btn.classList.add('hidden');
  } else {
    btn.classList.remove('hidden');
    const hasSkipped = skipped.includes(myPlayerId);
    btn.classList.toggle('skipped', hasSkipped);
    btn.disabled = hasSkipped;
    document.getElementById('btn-skip-label').textContent = hasSkipped ? 'Ya has saltado' : 'Saltar';
  }

  const skippedNames = skipped.filter((pid) => pid !== myPlayerId).map((pid) => playerName(state, pid));
  status.textContent = skippedNames.length
    ? `${skippedNames.length === 1 ? 'Ha' : 'Han'} saltado: ${skippedNames.join(', ')}`
    : '';
}

document.getElementById('btn-skip').addEventListener('click', () => {
  socket.emit('skipBid', {}, (res) => {
    if (!res.ok) toast(errorMessage(res.error), true);
  });
});

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
        <div class="pi-name">${escapeHtml(c.name)} ${c.isTroll ? '<span class="troll-badge">TROLL</span>' : ''}</div>
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
  if (!me || !latestState) return;
  submitBid(maxAffordableBid(me, latestState.settings.rosterSize));
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
      <div class="c-name">${escapeHtml(m.character.name)} ${m.character.isTroll ? '<span class="troll-badge">TROLL</span>' : ''}</div>
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
            <span class="rb-left"><img class="rb-thumb" src="${c.image || ''}" alt="" loading="lazy" onerror="this.style.visibility='hidden'" /> ${escapeHtml(c.name)} (${escapeHtml(c.anime)}) ${c.isTroll ? '<span class="troll-badge">TROLL</span>' : ''}</span>
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
