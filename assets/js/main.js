let allGames = [];
let activeCategory = 'Alle';

async function loadGames() {
  try {
    if (window.LG) await window.LG.ready;
    const res = await fetch('games/index.json');
    allGames = await res.json();
    renderRecent();
    renderFeatured();
    renderGames(allGames);
    renderCategories();
  } catch (err) {
    console.error('Fehler beim Laden der Spiele:', err);
  }
}

function renderRecent() {
  const section = document.getElementById('recent-section');
  const ids = window.LG ? window.LG.getRecent(8) : [];
  const games = ids.map(id => allGames.find(g => g.id === id)).filter(Boolean);
  if (!games.length) {
    section.style.display = 'none';
    return;
  }
  document.getElementById('recent-grid').innerHTML = games.map(g => cardHTML(g)).join('');
  section.style.display = '';
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

const STAR_ICON = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3.5l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6-4.5-4.1 6-.7z"/></svg>';

function cardHTML(game) {
  const fav = !!(window.LG && window.LG.isFavorite(game.id));
  return `
    <div class="game-card" onclick="openGame(${game.id})">
      <button class="game-card__fav ${fav ? 'is-fav' : ''}" title="Favorit" onclick="event.stopPropagation(); toggleFavoriteCard(${game.id}, this);">${STAR_ICON}</button>
      <img class="game-card__thumb"
           src="${game.thumbnail}"
           alt="${game.title}"
           onerror="this.src='https://placehold.co/300x200/1e1e36/8b8ba7?text=🎮'">
      <div class="game-card__body">
        <div class="game-card__title">${game.title}</div>
        <div class="game-card__cats">${game.categories.map(c => `<span class="game-card__chip">${c}</span>`).join('')}</div>
      </div>
    </div>
  `;
}

function toggleFavoriteCard(id, btnEl) {
  if (!window.LG) return;
  const nowFav = window.LG.toggleFavorite(id);
  btnEl.classList.toggle('is-fav', nowFav);
  if (activeCategory === 'Favoriten') filterGames('Favoriten');
}

function renderCategories() {
  const cats = ['Alle', 'Favoriten', ...new Set(allGames.flatMap(g => g.categories))];
  document.getElementById('categories').innerHTML = cats.map(cat => `
    <button class="${cat === activeCategory ? 'active' : ''}" onclick="filterGames('${cat}')">
      ${cat === 'Favoriten' ? STAR_ICON + ' Favoriten' : cat}
    </button>
  `).join('');
}

function filterGames(category) {
  activeCategory = category;
  renderCategories();
  let filtered;
  if (category === 'Alle') filtered = allGames;
  else if (category === 'Favoriten') filtered = allGames.filter(g => window.LG && window.LG.isFavorite(g.id));
  else filtered = allGames.filter(g => g.categories.includes(category));
  renderGames(filtered);
  document.getElementById('featured-section').style.display = category === 'Alle' ? '' : 'none';
  if (category !== 'Alle') document.getElementById('recent-section').style.display = 'none';
  else renderRecent();
}

function openGame(id) {
  window.location.href = `game.html?id=${id}`;
}

function playRandomGame() {
  if (!allGames.length) return;
  const pick = allGames[Math.floor(Math.random() * allGames.length)];
  openGame(pick.id);
}

document.getElementById('search').addEventListener('input', e => {
  const q = e.target.value.toLowerCase().trim();
  document.getElementById('featured-section').style.display = q ? 'none' : '';
  document.getElementById('recent-section').style.display = q ? 'none' : '';
  activeCategory = 'Alle';
  renderCategories();
  const filtered = q
    ? allGames.filter(g => g.title.toLowerCase().includes(q) || g.categories.some(c => c.toLowerCase().includes(q)))
    : allGames;
  renderGames(filtered);
  if (!q) renderRecent();
});

document.getElementById('randomBtn').addEventListener('click', playRandomGame);

loadGames();
