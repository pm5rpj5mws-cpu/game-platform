const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const INIT_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id serial PRIMARY KEY,
  username text NOT NULL,
  username_lower text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  token text PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS game_saves (
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_key text NOT NULL,
  state jsonb,
  best integer,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, game_key)
);

CREATE TABLE IF NOT EXISTS favorites (
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, game_id)
);

CREATE TABLE IF NOT EXISTS recent_played (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id integer NOT NULL,
  played_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recent_played_user ON recent_played (user_id, played_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);
`;

async function init() {
  await pool.query(INIT_SQL);
}

module.exports = { pool, init };
