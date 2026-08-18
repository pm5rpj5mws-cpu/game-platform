/* ============================================
   Goki Auth (Test-Login via localStorage)
   ============================================ */
(function () {
  const TEST_USERS = { Admin: '1234' };
  const SESSION_KEY = 'lg_session';

  function getUser() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw).username : null;
    } catch (e) {
      return null;
    }
  }

  function login(username, password) {
    const u = (username || '').trim();
    const p = (password || '').trim();
    const key = Object.keys(TEST_USERS).find(name => name.toLowerCase() === u.toLowerCase());
    if (key && TEST_USERS[key] === p) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ username: key }));
      return true;
    }
    return false;
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
  }

  function userKey() {
    return getUser() || 'gast';
  }

  function saveGameState(gameId, state) {
    try {
      localStorage.setItem(`lg_save_${userKey()}_${gameId}`, JSON.stringify(state));
    } catch (e) {}
  }

  function loadGameState(gameId) {
    try {
      const raw = localStorage.getItem(`lg_save_${userKey()}_${gameId}`);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function favKey(){ return `lg_favorites_${userKey()}`; }
  function getFavorites(){
    try{
      const raw = localStorage.getItem(favKey());
      return raw ? JSON.parse(raw) : [];
    }catch(e){ return []; }
  }
  function isFavorite(id){ return getFavorites().includes(id); }
  function toggleFavorite(id){
    const favs = getFavorites();
    const idx = favs.indexOf(id);
    if(idx === -1) favs.push(id); else favs.splice(idx, 1);
    try{ localStorage.setItem(favKey(), JSON.stringify(favs)); }catch(e){}
    return favs.includes(id);
  }

  function recentKey(){ return `lg_recent_${userKey()}`; }
  function getRecent(limit){
    limit = limit || 8;
    try{
      const raw = localStorage.getItem(recentKey());
      const list = raw ? JSON.parse(raw) : [];
      return list.slice(0, limit);
    }catch(e){ return []; }
  }
  function recordPlayed(id){
    try{
      let list = getRecent(50).filter(x => x !== id);
      list.unshift(id);
      list = list.slice(0, 12);
      localStorage.setItem(recentKey(), JSON.stringify(list));
    }catch(e){}
  }

  window.LG = {
    getUser, login, logout, userKey, saveGameState, loadGameState,
    getFavorites, isFavorite, toggleFavorite, getRecent, recordPlayed,
  };

  /* ---------- UI: Login-Button + Modal ---------- */
  function buildModal() {
    if (document.getElementById('login-modal')) return;
    const wrap = document.createElement('div');
    wrap.id = 'login-modal';
    wrap.className = 'login-modal hidden';
    wrap.innerHTML = `
      <div class="login-modal__backdrop"></div>
      <form class="login-modal__box" id="login-form" autocomplete="off">
        <h3>Anmelden</h3>
        <input type="text" id="login-username" placeholder="Benutzername" autocomplete="username" required>
        <input type="password" id="login-password" placeholder="Passwort" autocomplete="current-password" required>
        <label class="login-modal__toggle">
          <input type="checkbox" id="login-show-password"> Passwort anzeigen
        </label>
        <p class="login-modal__error hidden" id="login-error">Falscher Benutzername oder Passwort.</p>
        <button type="submit" class="login-modal__submit">Anmelden</button>
        <button type="button" class="login-modal__cancel" id="login-cancel">Abbrechen</button>
      </form>
    `;
    document.body.appendChild(wrap);

    wrap.querySelector('.login-modal__backdrop').addEventListener('click', closeModal);
    document.getElementById('login-cancel').addEventListener('click', closeModal);
    document.getElementById('login-show-password').addEventListener('change', function (e) {
      document.getElementById('login-password').type = e.target.checked ? 'text' : 'password';
    });
    document.getElementById('login-form').addEventListener('submit', function (e) {
      e.preventDefault();
      const u = document.getElementById('login-username').value.trim();
      const p = document.getElementById('login-password').value;
      if (login(u, p)) {
        closeModal();
        renderAuthUI();
      } else {
        document.getElementById('login-error').classList.remove('hidden');
      }
    });
  }

  function openModal() {
    buildModal();
    document.getElementById('login-form').reset();
    document.getElementById('login-error').classList.add('hidden');
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

    document.getElementById('auth-logout-btn').addEventListener('click', function (e) {
      e.stopPropagation();
      logout();
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

  document.addEventListener('DOMContentLoaded', renderAuthUI);
})();
