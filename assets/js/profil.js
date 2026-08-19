const MEDAL_THRESHOLDS = {
  treffpunkt:  { bronze: 10,  silver: 25,   gold: 50 },
  breakout:    { bronze: 100, silver: 300,  gold: 600 },
  overrun:     { bronze: 300, silver: 1000, gold: 2500 },
  flatterbird: { bronze: 10,  silver: 25,   gold: 50 },
  snake:       { bronze: 10,  silver: 25,   gold: 50 },
};

function medalFor(saveKey, best) {
  if (best === null) return '';
  const t = MEDAL_THRESHOLDS[saveKey];
  if (!t) return '';
  if (best >= t.gold) return ' 🥇';
  if (best >= t.silver) return ' 🥈';
  if (best >= t.bronze) return ' 🥉';
  return '';
}

async function loadDashboard() {
  const grid = document.getElementById('profile-grid');
  try {
    const res = await fetch('games/index.json');
    const games = await res.json();
    grid.innerHTML = games.map(g => {
      const s = g.saveKey && window.LG ? window.LG.loadGameState(g.saveKey) : null;
      const best = s && typeof s.best === 'number' ? s.best : null;
      const medal = medalFor(g.saveKey, best);
      return `
        <div class="game-card game-card--static">
          <img class="game-card__thumb"
               src="${g.thumbnail}"
               alt="${g.title}"
               onerror="this.src='https://placehold.co/300x200/1e1e36/8b8ba7?text=🎮'">
          <div class="game-card__body">
            <div class="game-card__title">${g.title}${medal}</div>
            <div class="game-card__cat${best !== null ? ' has-score' : ''}">${best === null ? 'Noch nicht gespielt' : best + ' Punkte'}</div>
          </div>
        </div>
      `;
    }).join('');
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

document.addEventListener('DOMContentLoaded', async () => {
  if (window.LG) await window.LG.ready;
  const who = document.getElementById('profile-who');
  if (who && window.LG) {
    const user = window.LG.getUser();
    who.textContent = user ? `Angemeldet als ${user}` : 'Als Gast unterwegs – melde dich an, um deinen Fortschritt zu behalten.';
  }
  loadDashboard();
});
