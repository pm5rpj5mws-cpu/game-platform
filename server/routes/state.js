const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../auth');
const asyncHandler = require('../asyncHandler');

const router = express.Router();

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const [savesRes, favoritesRes, recentRes] = await Promise.all([
    pool.query('SELECT game_key, state, best FROM game_saves WHERE user_id = $1', [userId]),
    pool.query('SELECT game_id FROM favorites WHERE user_id = $1', [userId]),
    pool.query(
      `SELECT DISTINCT ON (game_id) game_id, played_at FROM recent_played
       WHERE user_id = $1 ORDER BY game_id, played_at DESC`,
      [userId]
    ),
  ]);

  const saves = {};
  for (const row of savesRes.rows) {
    saves[row.game_key] = row.state;
  }

  const recent = recentRes.rows
    .sort((a, b) => new Date(b.played_at) - new Date(a.played_at))
    .slice(0, 12)
    .map(r => r.game_id);

  res.json({
    saves,
    favorites: favoritesRes.rows.map(r => r.game_id),
    recent,
  });
}));

router.put('/saves/:gameKey', requireAuth, asyncHandler(async (req, res) => {
  const gameKey = String(req.params.gameKey);
  const state = req.body && typeof req.body.state !== 'undefined' ? req.body.state : null;
  const best = state && Number.isFinite(state.best) ? state.best : null;

  await pool.query(
    `INSERT INTO game_saves (user_id, game_key, state, best, updated_at)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (user_id, game_key)
     DO UPDATE SET state = $3, best = $4, updated_at = now()`,
    [req.user.id, gameKey, state, best]
  );
  res.json({ ok: true });
}));

module.exports = router;
