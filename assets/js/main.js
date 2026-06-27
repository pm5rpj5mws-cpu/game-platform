let allGames = [];
let activeCategory = 'Alle';

async function loadGames() {
  try {
    const res = await fetch('games/index.json');
    allGames = await res.json();
    renderFeatured();
    renderGames(allGames);
    renderCategories();
  } catch (err) {
    console.error('Fehler beim Laden der Spiele:', err);
  }
}

function renderFeatured() {
  const featured = allGames.filter(g => g.featured);
  document.getElementById('featured-grid').innerHTML = featured.map(g => cardHTML(g)).join('');
}

function renderGames(games) {
  const grid = document.getElementById('game-grid');
  if (games.length === 0) {
    grid.innerHTML = '<p style="color:var(--text-muted);grid-column:1/-1;">Keine Spiele gefunden.</p>';
    return;
  }
  grid.innerHTML = games.map(g => cardHTML(g)).join('');
}

function cardHTML(game) {
  return `
    <div class="game-card" onclick="openGame(${game.id})">
      <img class="game-card__thumb"
           src="${game.thumbnail}"
           alt="${game.title}"
           onerror="this.src='https://placehold.co/300x200/1e1e36/8b8ba7?text=🎮'">
      <div class="game-card__body">
        <div class="game-card__title">${game.title}</div>
        <div class="game-card__cat">${game.category}</div>
      </div>
    </div>
  `;
}

function renderCategories() {
  const cats = ['Alle', ...new Set(allGames.map(g => g.category))];
  document.getElementById('categories').innerHTML = cats.map(cat => `
    <button class="${cat === activeCategory ? 'active' : ''}" onclick="filterGames('${cat}')">
      ${cat}
    </button>
  `).join('');
}

function filterGames(category) {
  activeCategory = category;
  renderCategories();
  const filtered = category === 'Alle'
    ? allGames
    : allGames.filter(g => g.category === category);
  renderGames(filtered);
  document.getElementById('featured-section').style.display = category === 'Alle' ? '' : 'none';
}

function openGame(id) {
  window.location.href = `game.html?id=${id}`;
}

document.getElementById('search').addEventListener('input', e => {
  const q = e.target.value.toLowerCase().trim();
  document.getElementById('featured-section').style.display = q ? 'none' : '';
  activeCategory = 'Alle';
  renderCategories();
  const filtered = q
    ? allGames.filter(g => g.title.toLowerCase().includes(q) || g.category.toLowerCase().includes(q))
    : allGames;
  renderGames(filtered);
});

loadGames();
