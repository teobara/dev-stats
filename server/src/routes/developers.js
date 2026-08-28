const express = require('express');
const db = require('../db');

const router = express.Router();

function getDeveloperOr404(req, res) {
  const developer = db.prepare('SELECT * FROM developers WHERE id = ?').get(req.params.id);
  if (!developer) {
    res.status(404).json({ error: 'Programatorul nu a fost gasit.' });
    return null;
  }
  return developer;
}

router.get('/', (req, res) => {
  const developers = db.prepare('SELECT * FROM developers ORDER BY active DESC, name ASC').all();
  res.json(developers);
});

router.post('/', (req, res) => {
  const { name, role, email } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Numele este obligatoriu.' });
  }
  const info = db
    .prepare('INSERT INTO developers (name, role, email) VALUES (?, ?, ?)')
    .run(name.trim(), role || null, email || null);
  const developer = db.prepare('SELECT * FROM developers WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(developer);
});

router.get('/:id', (req, res) => {
  const developer = getDeveloperOr404(req, res);
  if (!developer) return;

  const projects = db
    .prepare(
      `SELECT p.id, p.name, p.client, p.status
       FROM project_developers pd
       JOIN projects p ON p.id = pd.project_id
       WHERE pd.developer_id = ?
       ORDER BY p.name ASC`
    )
    .all(developer.id);

  res.json({ ...developer, projects });
});

router.put('/:id', (req, res) => {
  const developer = getDeveloperOr404(req, res);
  if (!developer) return;

  const { name, role, email, active } = req.body;
  db.prepare(
    `UPDATE developers SET name = ?, role = ?, email = ?, active = ? WHERE id = ?`
  ).run(
    name !== undefined ? name.trim() : developer.name,
    role !== undefined ? role : developer.role,
    email !== undefined ? email : developer.email,
    active !== undefined ? (active ? 1 : 0) : developer.active,
    developer.id
  );

  res.json(db.prepare('SELECT * FROM developers WHERE id = ?').get(developer.id));
});

router.delete('/:id', (req, res) => {
  const developer = getDeveloperOr404(req, res);
  if (!developer) return;
  db.prepare('DELETE FROM developers WHERE id = ?').run(developer.id);
  res.status(204).end();
});

router.get('/:id/cost', (req, res) => {
  const developer = getDeveloperOr404(req, res);
  if (!developer) return;
  const rows = db
    .prepare('SELECT * FROM developer_cost WHERE developer_id = ? ORDER BY year DESC, month DESC')
    .all(developer.id);
  res.json(rows);
});

router.put('/:id/cost', (req, res) => {
  const developer = getDeveloperOr404(req, res);
  if (!developer) return;

  const { year, month, amount, note } = req.body;
  const y = Number(year);
  const m = Number(month);
  const a = Number(amount);

  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12 || Number.isNaN(a)) {
    return res.status(400).json({ error: 'An/luna/suma invalide.' });
  }

  db.prepare(
    `INSERT INTO developer_cost (developer_id, year, month, amount, note)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(developer_id, year, month)
     DO UPDATE SET amount = excluded.amount, note = excluded.note`
  ).run(developer.id, y, m, a, note || null);

  const row = db
    .prepare('SELECT * FROM developer_cost WHERE developer_id = ? AND year = ? AND month = ?')
    .get(developer.id, y, m);
  res.json(row);
});

router.delete('/:id/cost/:year/:month', (req, res) => {
  const developer = getDeveloperOr404(req, res);
  if (!developer) return;
  db.prepare(
    'DELETE FROM developer_cost WHERE developer_id = ? AND year = ? AND month = ?'
  ).run(developer.id, Number(req.params.year), Number(req.params.month));
  res.status(204).end();
});

module.exports = router;
