const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { pool } = require('./db');
const asyncHandler = require('./asyncHandler');

const SESSION_COOKIE = 'goki_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 Tage

function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase();
}

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await pool.query(
    'INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)',
    [token, userId, expiresAt]
  );
  return { token, expiresAt };
}

async function destroySession(token) {
  if (!token) return;
  await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
}

async function getUserByToken(token) {
  if (!token) return null;
  const { rows } = await pool.query(
    `SELECT u.id, u.username FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = $1 AND s.expires_at > now()`,
    [token]
  );
  return rows[0] || null;
}

function setSessionCookie(res, token, expiresAt) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    expires: expiresAt,
    path: '/',
  });
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

const attachUser = asyncHandler(async (req, res, next) => {
  const token = req.cookies ? req.cookies[SESSION_COOKIE] : null;
  req.sessionToken = token;
  req.user = await getUserByToken(token);
  next();
});

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Nicht angemeldet.' });
  next();
}

module.exports = {
  SESSION_COOKIE,
  normalizeUsername,
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  setSessionCookie,
  clearSessionCookie,
  attachUser,
  requireAuth,
};
