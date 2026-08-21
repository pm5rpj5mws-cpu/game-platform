const MEDAL_THRESHOLDS = {
  treffpunkt:  { bronze: 10,  silver: 25,   gold: 50 },
  breakout:    { bronze: 100, silver: 300,  gold: 600 },
  overrun:     { bronze: 300, silver: 1000, gold: 2500 },
  flatterbird: { bronze: 10,  silver: 25,   gold: 50 },
  snake:       { bronze: 10,  silver: 25,   gold: 50 },
};

const MEDAL_ICON = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M8.5 12.5L7 21l5-2.5 5 2.5-1.5-8.5"/></svg>';

function medalTierFor(saveKey, best) {
  if (best === null) return '';
  const t = MEDAL_THRESHOLDS[saveKey];
  if (!t) return '';
  if (best >= t.gold) return 'gold';
  if (best >= t.silver) return 'silver';
  if (best >= t.bronze) return 'bronze';
  return '';
}

async function loadDashboard() {
  const grid = document.getElementById('profile-grid');
  try {
    const res = await fetch('games/index.json');
    const games = await res.json();
    let scoredCount = 0;
    let medalCount = 0;
    grid.innerHTML = games.map(g => {
      const s = g.saveKey && window.LG ? window.LG.loadGameState(g.saveKey) : null;
      const best = s && typeof s.best === 'number' ? s.best : null;
      const medal = medalTierFor(g.saveKey, best);
      if (best !== null) scoredCount++;
      if (medal) medalCount++;
      return `
        <div class="game-card game-card--static">
          ${medal ? `<div class="game-card__medal game-card__medal--${medal}">${MEDAL_ICON}</div>` : ''}
          <img class="game-card__thumb"
               src="${g.thumbnail}"
               alt="${g.title}"
               onerror="this.src='https://placehold.co/300x200/1e1e36/8b8ba7?text=🎮'">
          <div class="game-card__body">
            <div class="game-card__title">${g.title}</div>
            <div class="game-card__cat${best !== null ? ' has-score' : ''}">${best === null ? 'Noch nicht gespielt' : best + ' Punkte'}</div>
          </div>
        </div>
      `;
    }).join('');
    const scoredEl = document.getElementById('stat-scored');
    const medalsEl = document.getElementById('stat-medals');
    if (scoredEl) scoredEl.textContent = `${scoredCount} / ${games.length}`;
    if (medalsEl) medalsEl.textContent = medalCount;
    loadLeaderboards(games);
  } catch (e) {
    grid.innerHTML = '<p style="color:var(--text-muted);grid-column:1/-1;">Highscores konnten nicht geladen werden.</p>';
  }
}

async function loadLeaderboards(games) {
  const section = document.getElementById('leaderboard-section');
  if (!section) return;
  const withScores = games.filter(g => g.saveKey);
  if (!withScores.length) { section.style.display = 'none'; return; }

  const lists = await Promise.all(withScores.map(async g => {
    try {
      const res = await fetch(`/api/leaderboard/${encodeURIComponent(g.saveKey)}?limit=5`);
      if (!res.ok) return { game: g, rows: [] };
      return { game: g, rows: await res.json() };
    } catch (e) {
      return { game: g, rows: [] };
    }
  }));

  const withRows = lists.filter(l => l.rows.length);
  updateBestRankStat(withRows);
  if (!withRows.length) { section.style.display = 'none'; return; }

  section.style.display = '';
  document.getElementById('leaderboard-grid').innerHTML = withRows.map(({ game, rows }) => `
    <div class="leaderboard-card">
      <div class="leaderboard-card__title">${game.title}</div>
      <ol class="leaderboard-card__list">
        ${rows.map(r => `<li><span>${r.username}</span><span>${r.best}</span></li>`).join('')}
      </ol>
    </div>
  `).join('');
}

function updateBestRankStat(withRows) {
  const rankEl = document.getElementById('stat-best-rank');
  const labelEl = document.getElementById('stat-best-rank-label');
  if (!rankEl) return;
  const user = window.LG && window.LG.getUser();
  if (!user) {
    rankEl.textContent = '–';
    if (labelEl) labelEl.textContent = 'Beste Top-5-Platzierung';
    return;
  }
  let best = null;
  for (const { game, rows } of withRows) {
    const idx = rows.findIndex(r => r.username === user);
    if (idx !== -1 && (best === null || idx < best.rank)) {
      best = { rank: idx, game: game.title };
    }
  }
  if (best) {
    rankEl.textContent = `#${best.rank + 1}`;
    if (labelEl) labelEl.textContent = `Beste Platzierung · ${best.game}`;
  } else {
    rankEl.textContent = '–';
    if (labelEl) labelEl.textContent = 'Noch keine Top-5-Platzierung';
  }
}

/* ---------- Konto löschen ---------- */
function buildDeleteModal() {
  if (document.getElementById('delete-modal')) return;
  const wrap = document.createElement('div');
  wrap.id = 'delete-modal';
  wrap.className = 'simple-modal hidden';
  wrap.innerHTML = `
    <div class="simple-modal__backdrop"></div>
    <form class="simple-modal__box" id="delete-form" autocomplete="off">
      <h3>Konto endgültig löschen?</h3>
      <p>Alle Spielstände, Highscores und Favoriten werden unwiderruflich gelöscht. Gib zur Bestätigung dein Passwort ein.</p>
      <input type="password" id="delete-password" placeholder="Passwort" autocomplete="current-password" required>
      <p class="simple-modal__error hidden" id="delete-error"></p>
      <div class="simple-modal__actions">
        <button type="button" class="simple-modal__cancel" id="delete-cancel">Abbrechen</button>
        <button type="submit" class="simple-modal__ok simple-modal__ok--danger" id="delete-confirm">Endgültig löschen</button>
      </div>
    </form>
  `;
  document.body.appendChild(wrap);

  wrap.querySelector('.simple-modal__backdrop').addEventListener('click', closeDeleteModal);
  document.getElementById('delete-cancel').addEventListener('click', closeDeleteModal);
  document.getElementById('delete-form').addEventListener('submit', async e => {
    e.preventDefault();
    const password = document.getElementById('delete-password').value;
    const errorEl = document.getElementById('delete-error');
    const confirmBtn = document.getElementById('delete-confirm');
    confirmBtn.disabled = true;
    errorEl.classList.add('hidden');

    const result = await window.LG.deleteAccount(password);
    if (result === true) {
      window.location.href = 'index.html';
      return;
    }
    confirmBtn.disabled = false;
    errorEl.textContent = (result && result.error) || 'Löschen fehlgeschlagen.';
    errorEl.classList.remove('hidden');
  });
}
function openDeleteModal() {
  buildDeleteModal();
  document.getElementById('delete-form').reset();
  document.getElementById('delete-error').classList.add('hidden');
  document.getElementById('delete-modal').classList.remove('hidden');
}
function closeDeleteModal() {
  const m = document.getElementById('delete-modal');
  if (m) m.classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', async () => {
  if (window.LG) await window.LG.ready;
  const who = document.getElementById('profile-who');
  const user = window.LG && window.LG.getUser();
  if (who) {
    who.textContent = user ? `Angemeldet als ${user}` : 'Als Gast unterwegs – melde dich an, um deinen Fortschritt zu behalten.';
  }
  const deleteBtn = document.getElementById('delete-account-btn');
  if (deleteBtn) {
    deleteBtn.style.display = user ? '' : 'none';
    deleteBtn.addEventListener('click', openDeleteModal);
  }
  loadDashboard();
});
