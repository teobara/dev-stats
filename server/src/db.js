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

  -- monthly_cost e adaugata separat mai jos (ALTER TABLE), ca sa mearga si pe
  -- o baza de date creata cu un schema mai vechi, fara aceasta coloana.

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

  -- Vechi (nu se mai scrie): un singur venit total per proiect/luna, impartit
  -- dupa share_percent. Pastrat doar pentru migrarea datelor vechi, mai jos.
  CREATE TABLE IF NOT EXISTS project_revenue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    note TEXT,
    UNIQUE(project_id, year, month)
  );

  -- Model curent: suma introdusa manual, separat pentru fiecare programator
  -- alocat pe proiect, in fiecare luna. Un proiect cu mai multi programatori
  -- are mai multe randuri (unul per programator) pentru aceeasi luna.
  CREATE TABLE IF NOT EXISTS project_developer_revenue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    developer_id INTEGER NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    note TEXT,
    UNIQUE(project_id, developer_id, year, month)
  );

  -- Vechi (nu se mai scrie): cost diferit per luna. Inlocuit cu developers.monthly_cost,
  -- un singur cost fix per programator. Pastrat doar pentru migrarea datelor vechi.
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
  CREATE INDEX IF NOT EXISTS idx_pdr_project_period ON project_developer_revenue(project_id, year, month);
  CREATE INDEX IF NOT EXISTS idx_pdr_developer_period ON project_developer_revenue(developer_id, year, month);
`);

// Migrare unica (aditiva, sigura): modelul vechi avea o singura suma de venit
// per proiect/luna, impartita intre programatori dupa share_percent. Convertim
// orice date vechi in noul model (suma separata per programator), fara sa
// stergem nimic din tabelele vechi. E sigur sa ruleze la fiecare pornire -
// INSERT OR IGNORE + cheia unica (proiect, programator, an, luna) fac ca o
// inregistrare deja migrata (sau introdusa manual) sa nu fie niciodata suprascrisa.
const oldRevenueRows = db.prepare('SELECT * FROM project_revenue').all();
if (oldRevenueRows.length > 0) {
  const insertMigrated = db.prepare(
    `INSERT OR IGNORE INTO project_developer_revenue (project_id, developer_id, year, month, amount, note)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const getAssignments = db.prepare(
    'SELECT developer_id, share_percent FROM project_developers WHERE project_id = ?'
  );

  let migratedCount = 0;
  for (const row of oldRevenueRows) {
    for (const a of getAssignments.all(row.project_id)) {
      const amount = row.amount * (a.share_percent / 100);
      if (amount > 0) {
        const info = insertMigrated.run(
          row.project_id,
          a.developer_id,
          row.year,
          row.month,
          amount,
          row.note
        );
        // info.changes e 0 daca randul exista deja (INSERT OR IGNORE) - numaram
        // doar insertiile chiar noi, ca sa nu raportam aceleasi date la fiecare pornire.
        if (info.changes > 0) migratedCount += 1;
      }
    }
  }
  if (migratedCount > 0) {
    console.log(`Migrare: ${migratedCount} venituri vechi convertite la noul model (suma per programator).`);
  }
}

// Migrare unica: adauga coloana developers.monthly_cost, daca nu exista deja
// (baza de date creata cu un schema mai vechi). Costul nu se mai seteaza pe
// luna - e o singura valoare fixa per programator, editabila oricand.
// Se ruleaza o singura data: la pornirile urmatoare, coloana deja exista si
// blocul intreg e sarit, deci nu suprascrie niciodata o valoare setata manual.
const developerColumns = db.prepare('PRAGMA table_info(developers)').all();
const hasMonthlyCost = developerColumns.some((c) => c.name === 'monthly_cost');
if (!hasMonthlyCost) {
  db.exec('ALTER TABLE developers ADD COLUMN monthly_cost REAL NOT NULL DEFAULT 0');

  // Ca valoare initiala, preluam cel mai recent cost lunar introdus manual
  // (din vechiul model, per programator), daca exista.
  const developerIds = db.prepare('SELECT id FROM developers').all();
  const getLatestCost = db.prepare(
    'SELECT amount FROM developer_cost WHERE developer_id = ? ORDER BY year DESC, month DESC LIMIT 1'
  );
  const setInitialCost = db.prepare('UPDATE developers SET monthly_cost = ? WHERE id = ?');

  let seeded = 0;
  for (const { id } of developerIds) {
    const latest = getLatestCost.get(id);
    if (latest) {
      setInitialCost.run(latest.amount, id);
      seeded += 1;
    }
  }
  console.log(
    `Migrare: adaugata coloana developers.monthly_cost` +
      (seeded > 0 ? ` (preluata din istoric pentru ${seeded} programatori).` : '.')
  );
}

module.exports = db;
