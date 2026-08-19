const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../auth');
const asyncHandler = require('../asyncHandler');

const router = express.Router();

router.post('/:gameId', requireAuth, asyncHandler(async (req, res) => {
  const gameId = parseInt(req.params.gameId, 10);
  if (!Number.isFinite(gameId)) return res.status(400).json({ error: 'Ungueltige gameId.' });

  await pool.query(
    `INSERT INTO favorites (user_id, game_id) VALUES ($1, $2)
     ON CONFLICT (user_id, game_id) DO NOTHING`,
    [req.user.id, gameId]
  );
  res.json({ ok: true });
}));

router.delete('/:gameId', requireAuth, asyncHandler(async (req, res) => {
  const gameId = parseInt(req.params.gameId, 10);
  if (!Number.isFinite(gameId)) return res.status(400).json({ error: 'Ungueltige gameId.' });

  await pool.query('DELETE FROM favorites WHERE user_id = $1 AND game_id = $2', [req.user.id, gameId]);
  res.json({ ok: true });
}));

module.exports = router;
