const express = require('express');
const { pool } = require('../db');
const asyncHandler = require('../asyncHandler');

const router = express.Router();

router.get('/:gameKey', asyncHandler(async (req, res) => {
  const gameKey = String(req.params.gameKey);
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);

  const { rows } = await pool.query(
    `SELECT u.username, gs.best FROM game_saves gs
     JOIN users u ON u.id = gs.user_id
     WHERE gs.game_key = $1 AND gs.best IS NOT NULL
     ORDER BY gs.best DESC
     LIMIT $2`,
    [gameKey, limit]
  );
  res.json(rows);
}));

module.exports = router;
