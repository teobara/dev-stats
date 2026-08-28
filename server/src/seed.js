// Script optional: adauga date de test ca sa poti vedea aplicatia functionand imediat.
// Ruleaza cu: npm run seed (din radacina proiectului)
require('dotenv').config();
const db = require('./db');

function upsertDeveloper(name, role, email) {
  const existing = db.prepare('SELECT * FROM developers WHERE name = ?').get(name);
  if (existing) return existing;
  const info = db
    .prepare('INSERT INTO developers (name, role, email) VALUES (?, ?, ?)')
    .run(name, role, email);
  return db.prepare('SELECT * FROM developers WHERE id = ?').get(info.lastInsertRowid);
}

function upsertProject(name, client, description) {
  const existing = db.prepare('SELECT * FROM projects WHERE name = ?').get(name);
  if (existing) return existing;
  const info = db
    .prepare('INSERT INTO projects (name, client, description) VALUES (?, ?, ?)')
    .run(name, client, description);
  return db.prepare('SELECT * FROM projects WHERE id = ?').get(info.lastInsertRowid);
}

function assign(projectId, developerId, sharePercent) {
  db.prepare(
    `INSERT INTO project_developers (project_id, developer_id, share_percent)
     VALUES (?, ?, ?)
     ON CONFLICT(project_id, developer_id) DO UPDATE SET share_percent = excluded.share_percent`
  ).run(projectId, developerId, sharePercent);
}

function setRevenue(projectId, year, month, amount) {
  db.prepare(
    `INSERT INTO project_revenue (project_id, year, month, amount)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(project_id, year, month) DO UPDATE SET amount = excluded.amount`
  ).run(projectId, year, month, amount);
}

function setCost(developerId, year, month, amount) {
  db.prepare(
    `INSERT INTO developer_cost (developer_id, year, month, amount)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(developer_id, year, month) DO UPDATE SET amount = excluded.amount`
  ).run(developerId, year, month, amount);
}

const ana = upsertDeveloper('Ana Popescu', 'Frontend (React)', 'ana@example.com');
const mihai = upsertDeveloper('Mihai Ionescu', 'Backend (Node.js)', 'mihai@example.com');
const radu = upsertDeveloper('Radu Stan', 'Full-stack', 'radu@example.com');

const magazin = upsertProject('Magazin online ACME', 'ACME SRL', 'Platforma de e-commerce');
const crm = upsertProject('CRM Beta', 'Beta Consulting', 'Aplicatie interna de CRM');
const site = upsertProject('Site prezentare Gamma', 'Gamma SA', 'Website de prezentare');

assign(magazin.id, ana.id, 50);
assign(magazin.id, mihai.id, 50);
assign(crm.id, radu.id, 100);
assign(site.id, ana.id, 100);

const now = new Date();
for (let i = 2; i >= 0; i--) {
  const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;

  setRevenue(magazin.id, year, month, 12000);
  setRevenue(crm.id, year, month, 6000);
  setRevenue(site.id, year, month, 2500);

  setCost(ana.id, year, month, 4500);
  setCost(mihai.id, year, month, 5000);
  setCost(radu.id, year, month, 4800);
}

console.log('Date de test adaugate cu succes.');
