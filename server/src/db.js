const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const DEFAULT_DB_PATH = path.join(__dirname, '..', 'data', 'dev.sqlite');
const dbPath = process.env.DB_PATH || DEFAULT_DB_PATH;

// Avertisment explicit daca DB_PATH nu e setat: inseamna ca baza de date sta pe
// discul efemer al containerului si se va pierde la urmatorul deploy/restart.
// Vezi acest mesaj in log-urile de deploy de pe Railway ca sa confirmi ce cale se foloseste.
if (!process.env.DB_PATH) {
  console.warn(
    'ATENTIE: variabila DB_PATH nu e setata. Baza de date NU e persistenta ' +
      `si se va pierde la urmatorul deploy/restart. Foloseste calea implicita: ${dbPath}`
  );
} else {
  console.log(`DB_PATH setat - se foloseste: ${dbPath}`);
}

// Ne asiguram ca directorul in care va sta fisierul .sqlite exista
// (util mai ales pe Railway, unde DB_PATH poate indica spre un volume montat, ex: /data/dev.sqlite)
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const dbFileExistedBefore = fs.existsSync(dbPath);
console.log(
  dbFileExistedBefore
    ? `Fisier baza de date existent, gasit la: ${dbPath}`
    : `Niciun fisier existent la ${dbPath} - se creeaza o baza de date noua, goala.`
);

// Folosim modulul SQLite integrat in Node.js (node:sqlite, stabil incepand cu Node 22.5+)
// in loc de un pachet extern precum better-sqlite3, ca sa evitam compilarea nativa
// (node-gyp/Python/Visual Studio Build Tools) la instalare pe orice masina sau pe Railway.
const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS developers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT,
    email TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    client TEXT,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS project_developers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    developer_id INTEGER NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
    share_percent REAL NOT NULL DEFAULT 100,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(project_id, developer_id)
  );

  CREATE TABLE IF NOT EXISTS project_revenue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    note TEXT,
    UNIQUE(project_id, year, month)
  );

  CREATE TABLE IF NOT EXISTS developer_cost (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    developer_id INTEGER NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    note TEXT,
    UNIQUE(developer_id, year, month)
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_pd_project ON project_developers(project_id);
  CREATE INDEX IF NOT EXISTS idx_pd_developer ON project_developers(developer_id);
  CREATE INDEX IF NOT EXISTS idx_pr_project_period ON project_revenue(project_id, year, month);
  CREATE INDEX IF NOT EXISTS idx_dc_developer_period ON developer_cost(developer_id, year, month);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
`);

module.exports = db;
