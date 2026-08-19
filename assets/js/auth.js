/* ============================================
   Goki Auth (Server-Login + lokaler Gast-Modus)
   ============================================ */
(function () {
  let currentUser = null;
  let savesCache = {};
  let favoritesCache = [];
  let recentCache = [];

  async function api(path, options) {
    const res = await fetch(path, Object.assign({ credentials: 'same-origin' }, options));
    let data = null;
    try { data = await res.json(); } catch (e) {}
    if (!res.ok) throw new Error((data && data.error) || 'Serverfehler');
    return data;
  }

  async function loadRemoteState() {
    const state = await api('/api/state');
    savesCache = state.saves || {};
    favoritesCache = state.favorites || [];
    recentCache = state.recent || [];
  }

  const ready = (async function bootstrap() {
    try {
      const me = await api('/api/me');
      currentUser = me.username;
      await loadRemoteState();
    } catch (e) {
      currentUser = null;
    }
  })();

  function getUser() {
    return currentUser;
  }

  async function login(username, password) {
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      currentUser = data.username;
      await loadRemoteState();
      return true;
    } catch (e) {
      return false;
    }
  }

  async function register(username, password) {
    try {
      const data = await api('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      currentUser = data.username;
      savesCache = {};
      favoritesCache = [];
      recentCache = [];
      return true;
    } catch (e) {
      return { error: e.message };
    }
  }

  async function logout() {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch (e) {}
    currentUser = null;
    savesCache = {};
    favoritesCache = [];
    recentCache = [];
  }

  /* ---------- Gast-Fallback (localStorage) ---------- */
  function guestSaveKey(gameId) { return `lg_save_gast_${gameId}`; }
  function guestFavKey() { return 'lg_favorites_gast'; }
  function guestRecentKey() { return 'lg_recent_gast'; }

  function saveGameState(gameId, state) {
    if (currentUser) {
      savesCache[gameId] = state;
      api(`/api/state/saves/${encodeURIComponent(gameId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state }),
      }).catch(() => {});
      return;
    }
    try {
      localStorage.setItem(guestSaveKey(gameId), JSON.stringify(state));
    } catch (e) {}
  }

  function loadGameState(gameId) {
    if (currentUser) {
      return savesCache[gameId] || null;
    }
    try {
      const raw = localStorage.getItem(guestSaveKey(gameId));
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function getFavorites() {
    if (currentUser) return favoritesCache.slice();
    try {
      const raw = localStorage.getItem(guestFavKey());
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function isFavorite(id) {
    return getFavorites().includes(id);
  }

  function toggleFavorite(id) {
    if (currentUser) {
      const idx = favoritesCache.indexOf(id);
      const nowFav = idx === -1;
      if (nowFav) favoritesCache.push(id); else favoritesCache.splice(idx, 1);
      api(`/api/favorites/${encodeURIComponent(id)}`, { method: nowFav ? 'POST' : 'DELETE' }).catch(() => {});
      return nowFav;
    }
    const favs = getFavorites();
    const idx = favs.indexOf(id);
    if (idx === -1) favs.push(id); else favs.splice(idx, 1);
    try { localStorage.setItem(guestFavKey(), JSON.stringify(favs)); } catch (e) {}
    return favs.includes(id);
  }

  function getRecent(limit) {
    limit = limit || 8;
    if (currentUser) return recentCache.slice(0, limit);
    try {
      const raw = localStorage.getItem(guestRecentKey());
      const list = raw ? JSON.parse(raw) : [];
      return list.slice(0, limit);
    } catch (e) { return []; }
  }

  function recordPlayed(id) {
    if (currentUser) {
      recentCache = [id, ...recentCache.filter(x => x !== id)].slice(0, 12);
      api(`/api/recent/${encodeURIComponent(id)}`, { method: 'POST' }).catch(() => {});
      return;
    }
    try {
      let list = getRecent(50).filter(x => x !== id);
      list.unshift(id);
      list = list.slice(0, 12);
      localStorage.setItem(guestRecentKey(), JSON.stringify(list));
    } catch (e) {}
  }

  window.LG = {
    ready, getUser, login, register, logout, saveGameState, loadGameState,
    getFavorites, isFavorite, toggleFavorite, getRecent, recordPlayed,
  };

  /* ---------- UI: Login-Modal (Anmelden / Konto erstellen) ---------- */
  let modalMode = 'login';

  function buildModal() {
    if (document.getElementById('login-modal')) return;
    const wrap = document.createElement('div');
    wrap.id = 'login-modal';
    wrap.className = 'login-modal hidden';
    wrap.innerHTML = `
      <div class="login-modal__backdrop"></div>
      <form class="login-modal__box" id="login-form" autocomplete="off">
        <h3 id="login-modal-title">Anmelden</h3>
        <input type="text" id="login-username" placeholder="Benutzername" autocomplete="username" required>
        <input type="password" id="login-password" placeholder="Passwort" autocomplete="current-password" required>
        <label class="login-modal__toggle">
          <input type="checkbox" id="login-show-password"> Passwort anzeigen
        </label>
        <p class="login-modal__error hidden" id="login-error"></p>
        <button type="submit" class="login-modal__submit" id="login-submit">Anmelden</button>
        <button type="button" class="login-modal__switch" id="login-switch-mode">Noch kein Konto? Registrieren</button>
        <button type="button" class="login-modal__cancel" id="login-cancel">Abbrechen</button>
      </form>
    `;
    document.body.appendChild(wrap);

    wrap.querySelector('.login-modal__backdrop').addEventListener('click', closeModal);
    document.getElementById('login-cancel').addEventListener('click', closeModal);
    document.getElementById('login-show-password').addEventListener('change', function (e) {
      document.getElementById('login-password').type = e.target.checked ? 'text' : 'password';
    });
    document.getElementById('login-switch-mode').addEventListener('click', function () {
      modalMode = modalMode === 'login' ? 'register' : 'login';
      applyModalMode();
    });
    document.getElementById('login-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      const u = document.getElementById('login-username').value.trim();
      const p = document.getElementById('login-password').value;
      const errorEl = document.getElementById('login-error');
      const submitBtn = document.getElementById('login-submit');
      submitBtn.disabled = true;
      errorEl.classList.add('hidden');

      if (modalMode === 'login') {
        const ok = await login(u, p);
        submitBtn.disabled = false;
        if (ok) { closeModal(); renderAuthUI(); }
        else { errorEl.textContent = 'Falscher Benutzername oder Passwort.'; errorEl.classList.remove('hidden'); }
      } else {
        const result = await register(u, p);
        submitBtn.disabled = false;
        if (result === true) { closeModal(); renderAuthUI(); }
        else { errorEl.textContent = (result && result.error) || 'Registrierung fehlgeschlagen.'; errorEl.classList.remove('hidden'); }
      }
    });
  }

  function applyModalMode() {
    document.getElementById('login-modal-title').textContent = modalMode === 'login' ? 'Anmelden' : 'Konto erstellen';
    document.getElementById('login-submit').textContent = modalMode === 'login' ? 'Anmelden' : 'Registrieren';
    document.getElementById('login-switch-mode').textContent = modalMode === 'login'
      ? 'Noch kein Konto? Registrieren'
      : 'Schon registriert? Anmelden';
    document.getElementById('login-error').classList.add('hidden');
  }

  function openModal() {
    buildModal();
    modalMode = 'login';
    applyModalMode();
    document.getElementById('login-form').reset();
    document.getElementById('login-modal').classList.remove('hidden');
    document.getElementById('login-username').focus();
  }

  function closeModal() {
    const m = document.getElementById('login-modal');
    if (m) m.classList.add('hidden');
  }

  /* ---------- UI: Profil-Dropdown ---------- */
  function ensureWidget() {
    const btn = document.querySelector('.btn-login');
    if (!btn) return null;
    if (btn.parentElement.classList.contains('auth-widget')) return btn.parentElement;

    const wrap = document.createElement('div');
    wrap.className = 'auth-widget';
    btn.parentElement.insertBefore(wrap, btn);
    wrap.appendChild(btn);

    const dropdown = document.createElement('div');
    dropdown.className = 'auth-dropdown hidden';
    dropdown.innerHTML = `
      <div class="auth-dropdown__user" id="auth-dropdown-user"></div>
      <a class="auth-dropdown__item" href="profil.html">📊 Meine Highscores</a>
      <button type="button" class="auth-dropdown__logout" id="auth-logout-btn">Abmelden</button>
    `;
    wrap.appendChild(dropdown);

    document.getElementById('auth-logout-btn').addEventListener('click', async function (e) {
      e.stopPropagation();
      await logout();
      closeDropdown();
      renderAuthUI();
    });
    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) closeDropdown();
    });

    return wrap;
  }

  function toggleDropdown(e) {
    e.stopPropagation();
    const dd = document.querySelector('.auth-dropdown');
    if (dd) dd.classList.toggle('hidden');
  }

  function closeDropdown() {
    const dd = document.querySelector('.auth-dropdown');
    if (dd) dd.classList.add('hidden');
  }

  function renderAuthUI() {
    const wrap = ensureWidget();
    if (!wrap) return;
    const btn = wrap.querySelector('.btn-login');
    const user = getUser();
    if (user) {
      btn.textContent = `👤 ${user} ▾`;
      btn.onclick = toggleDropdown;
      document.getElementById('auth-dropdown-user').textContent = `Angemeldet als ${user}`;
    } else {
      btn.textContent = 'Login';
      btn.onclick = openModal;
      closeDropdown();
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    ready.then(renderAuthUI);
  });
})();
