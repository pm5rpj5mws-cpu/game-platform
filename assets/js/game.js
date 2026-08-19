let allGames = [];
let currentGame = null;

async function loadGames() {
  try {
    if (window.LG) await window.LG.ready;
    const res = await fetch('games/index.json');
    allGames = await res.json();

    const params = new URLSearchParams(window.location.search);
    const id = parseInt(params.get('id'));
    const game = allGames.find(g => g.id === id);

    if (!game) {
      window.location.href = 'index.html';
      return;
    }
    currentGame = game;
    if (window.LG) window.LG.recordPlayed(game.id);

    // Titel setzen
    document.title = `${game.title} – Goki`;
    document.getElementById('game-title').textContent = game.title;

    // iFrame laden
    const frame = document.getElementById('game-frame');
    showLoading();
    frame.addEventListener('load', hideLoading);
    frame.src = game.url;

    // Andere Spiele zufällig mischen
    const others = allGames
      .filter(g => g.id !== id)
      .sort(() => Math.random() - 0.5);

    renderSidebar('suggested-left',  others.slice(0, 7));
    renderSidebar('suggested-right', others.slice(7, 14));
    renderBottom('suggested-bottom', others.slice(14));

  } catch (err) {
    console.error('Fehler beim Laden:', err);
  }
}

function renderSidebar(containerId, games) {
  const el = document.getElementById(containerId);
  el.innerHTML = games.map(game => `
    <div class="sidebar-card" onclick="goToGame(${game.id})">
      <img src="${game.thumbnail}"
           alt="${game.title}"
           onerror="this.src='https://placehold.co/50x34/1e1e36/8b8ba7?text=🎮'">
      <div>
        <div class="sidebar-card__title">${game.title}</div>
        <div class="sidebar-card__cat">${game.categories[0]}</div>
      </div>
    </div>
  `).join('');
}

function renderBottom(containerId, games) {
  const el = document.getElementById(containerId);
  el.innerHTML = games.map(game => `
    <div class="bottom-card" onclick="goToGame(${game.id})">
      <img src="${game.thumbnail}"
           alt="${game.title}"
           onerror="this.src='https://placehold.co/120x75/1e1e36/8b8ba7?text=🎮'">
      <div class="bottom-card__title">${game.title}</div>
    </div>
  `).join('');
}

function goToGame(id) {
  confirmLeave(`game.html?id=${id}`, 'Spiel wechseln?', 'Wirklich das aktuelle Spiel verlassen und zu einem anderen wechseln?');
}

/* ---------- Ladeanimation ---------- */
function showLoading() {
  const el = document.getElementById('game-loading');
  if (el) el.classList.remove('hidden');
}
function hideLoading() {
  const el = document.getElementById('game-loading');
  if (el) el.classList.add('hidden');
}

/* ---------- Hilfe-Overlay ---------- */
function buildHelpModal() {
  if (document.getElementById('help-modal')) return;
  const wrap = document.createElement('div');
  wrap.id = 'help-modal';
  wrap.className = 'simple-modal hidden';
  wrap.innerHTML = `
    <div class="simple-modal__backdrop"></div>
    <div class="simple-modal__box">
      <h3>Steuerung</h3>
      <p id="help-modal-text"></p>
      <div class="simple-modal__actions">
        <button type="button" class="simple-modal__ok" id="help-modal-close">Verstanden</button>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);
  wrap.querySelector('.simple-modal__backdrop').addEventListener('click', closeHelpModal);
  document.getElementById('help-modal-close').addEventListener('click', closeHelpModal);
}
function openHelpModal() {
  buildHelpModal();
  const text = (currentGame && currentGame.controls) || 'Keine Steuerungs-Info für dieses Spiel verfügbar.';
  document.getElementById('help-modal-text').textContent = text;
  document.getElementById('help-modal').classList.remove('hidden');
}
function closeHelpModal() {
  const m = document.getElementById('help-modal');
  if (m) m.classList.add('hidden');
}

/* ---------- Verlassen-Bestätigung ---------- */
let pendingLeaveUrl = null;
function buildLeaveModal() {
  if (document.getElementById('leave-modal')) return;
  const wrap = document.createElement('div');
  wrap.id = 'leave-modal';
  wrap.className = 'simple-modal hidden';
  wrap.innerHTML = `
    <div class="simple-modal__backdrop"></div>
    <div class="simple-modal__box">
      <h3 id="leave-modal-title">Spiel verlassen?</h3>
      <p id="leave-modal-text"></p>
      <div class="simple-modal__actions">
        <button type="button" class="simple-modal__cancel" id="leave-cancel">Abbrechen</button>
        <button type="button" class="simple-modal__ok" id="leave-confirm">Verlassen</button>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);
  wrap.querySelector('.simple-modal__backdrop').addEventListener('click', closeLeaveModal);
  document.getElementById('leave-cancel').addEventListener('click', closeLeaveModal);
}
function confirmLeave(url, title, message) {
  pendingLeaveUrl = url;
  buildLeaveModal();
  document.getElementById('leave-modal-title').textContent = title;
  document.getElementById('leave-modal-text').textContent = message;
  document.getElementById('leave-confirm').onclick = () => {
    window.location.href = pendingLeaveUrl;
  };
  document.getElementById('leave-modal').classList.remove('hidden');
}
function closeLeaveModal() {
  const m = document.getElementById('leave-modal');
  if (m) m.classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
  const helpBtn = document.getElementById('help-btn');
  if (helpBtn) helpBtn.addEventListener('click', openHelpModal);

  const logo = document.querySelector('.nav__logo');
  if (logo) {
    logo.addEventListener('click', e => {
      e.preventDefault();
      confirmLeave('index.html', 'Zurück zur Übersicht?', 'Wirklich das Spiel verlassen und zur Übersicht zurückkehren?');
    });
  }
});

loadGames();
