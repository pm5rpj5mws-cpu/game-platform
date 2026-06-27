let allGames = [];

async function loadGames() {
  try {
    const res = await fetch('games/index.json');
    allGames = await res.json();

    const params = new URLSearchParams(window.location.search);
    const id = parseInt(params.get('id'));
    const game = allGames.find(g => g.id === id);

    if (!game) {
      window.location.href = 'index.html';
      return;
    }

    // Titel setzen
    document.title = `${game.title} – LarsGames`;
    document.getElementById('game-title').textContent = game.title;

    // iFrame laden
    document.getElementById('game-frame').src = game.url;

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
        <div class="sidebar-card__cat">${game.category}</div>
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
  window.location.href = `game.html?id=${id}`;
}

loadGames();
