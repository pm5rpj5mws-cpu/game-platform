const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const { init } = require('./db');
const { attachUser } = require('./auth');

const authRoutes = require('./routes/auth');
const stateRoutes = require('./routes/state');
const favoritesRoutes = require('./routes/favorites');
const recentRoutes = require('./routes/recent');
const leaderboardRoutes = require('./routes/leaderboard');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT_DIR = path.join(__dirname, '..');

app.set('trust proxy', 1);

app.use(express.json());
app.use(cookieParser());
app.use(attachUser);

app.get('/api/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Nicht angemeldet.' });
  res.json({ username: req.user.username });
});

app.use('/api/auth', authRoutes);
app.use('/api/state', stateRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/recent', recentRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Interner Serverfehler.' });
});

const BLOCKED_PREFIXES = ['/server', '/.git', '/.env', '/Dockerfile', '/docker-compose.yml', '/.dockerignore', '/.gitignore'];
app.use((req, res, next) => {
  if (BLOCKED_PREFIXES.some(p => req.path === p || req.path.startsWith(p + '/'))) {
    return res.status(404).end();
  }
  next();
});

app.use(express.static(ROOT_DIR));

init()
  .then(() => {
    app.listen(PORT, () => console.log(`Goki-Server läuft auf Port ${PORT}`));
  })
  .catch(err => {
    console.error('DB-Init fehlgeschlagen:', err);
    process.exit(1);
  });
