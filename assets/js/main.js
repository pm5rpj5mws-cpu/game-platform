let allGames = [];

async function loadGames() {
  const res = await fetch('games/index.json');
  allGames = await res.json();
  renderGames(allGames);
  renderCategories(allGames);
}

function renderGames(games) {
  const grid = document.getElementById('game-grid');
  grid.innerHTML = games.map(game => `
    <div class="game-card" onclick="openGame('${game.url}', '${game.title}')">
      <img src="${game.thumbnail}" alt="${game.title}" onerror="this.src='assets/img/placeholder.png'">
      <span class="game-title">${game.title}</span>
      <span class="game-category">${game.category}</span>
    </div>
  `).join('');
}

function renderCategories(games) {
  const cats = [...new Set(games.map(g => g.category))];
  const container = document.getElementById('categories');
  container.innerHTML = `<button onclick="filterGames('Alle')">Alle</button>` +
    cats.map(cat => `<button onclick="filterGames('${cat}')">${cat}</button>`).join('');
}

function filterGames(category) {
  const filtered = category === 'Alle' ? allGames : allGames.filter(g => g.category === category);
  renderGames(filtered);
}

function openGame(url, title) {
  window.location.href = `game.html?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
}

document.getElementById('search').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  const filtered = allGames.filter(g => g.title.toLowerCase().includes(q));
  renderGames(filtered);
});

loadGames();