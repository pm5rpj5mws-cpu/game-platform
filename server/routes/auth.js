const express = require('express');
const { pool } = require('../db');
const {
  normalizeUsername,
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  setSessionCookie,
  clearSessionCookie,
} = require('../auth');
const asyncHandler = require('../asyncHandler');

const router = express.Router();

router.post('/register', asyncHandler(async (req, res) => {
  const username = String((req.body && req.body.username) || '').trim();
  const password = String((req.body && req.body.password) || '');

  if (username.length < 3 || username.length > 30) {
    return res.status(400).json({ error: 'Benutzername muss 3-30 Zeichen lang sein.' });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: 'Passwort muss mindestens 4 Zeichen lang sein.' });
  }

  const usernameLower = normalizeUsername(username);
  const existing = await pool.query('SELECT id FROM users WHERE username_lower = $1', [usernameLower]);
  if (existing.rows.length) {
    return res.status(409).json({ error: 'Benutzername bereits vergeben.' });
  }

  const passwordHash = await hashPassword(password);
  const { rows } = await pool.query(
    'INSERT INTO users (username, username_lower, password_hash) VALUES ($1, $2, $3) RETURNING id, username',
    [username, usernameLower, passwordHash]
  );
  const user = rows[0];

  const { token, expiresAt } = await createSession(user.id);
  setSessionCookie(res, token, expiresAt);
  res.json({ username: user.username });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const username = String((req.body && req.body.username) || '').trim();
  const password = String((req.body && req.body.password) || '');
  const usernameLower = normalizeUsername(username);

  const { rows } = await pool.query('SELECT id, username, password_hash FROM users WHERE username_lower = $1', [usernameLower]);
  const user = rows[0];
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return res.status(401).json({ error: 'Falscher Benutzername oder Passwort.' });
  }

  const { token, expiresAt } = await createSession(user.id);
  setSessionCookie(res, token, expiresAt);
  res.json({ username: user.username });
}));

router.post('/logout', asyncHandler(async (req, res) => {
  await destroySession(req.sessionToken);
  clearSessionCookie(res);
  res.json({ ok: true });
}));

module.exports = router;
