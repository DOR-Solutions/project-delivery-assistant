const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

/**
 * Single shared SQLite connection for the whole app.
 * The database file lives at backend/data/app.db (created on first run).
 * Set DB_PATH to override (e.g. ':memory:' for tests).
 */
const DB_PATH =
  process.env.DB_PATH || path.join(__dirname, '..', 'data', 'app.db');

if (DB_PATH !== ':memory:') {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * Apply the schema. Idempotent — safe to call on every startup because every
 * statement uses IF NOT EXISTS.
 */
function initSchema() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
}

initSchema();

module.exports = db;
