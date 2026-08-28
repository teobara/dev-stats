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
  const { name, role, email, monthly_cost } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Numele este obligatoriu.' });
  }
  const cost = monthly_cost !== undefined ? Number(monthly_cost) || 0 : 0;
  const info = db
    .prepare('INSERT INTO developers (name, role, email, monthly_cost) VALUES (?, ?, ?, ?)')
    .run(name.trim(), role || null, email || null, cost);
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

  const { name, role, email, active, monthly_cost } = req.body;
  db.prepare(
    `UPDATE developers SET name = ?, role = ?, email = ?, active = ?, monthly_cost = ? WHERE id = ?`
  ).run(
    name !== undefined ? name.trim() : developer.name,
    role !== undefined ? role : developer.role,
    email !== undefined ? email : developer.email,
    active !== undefined ? (active ? 1 : 0) : developer.active,
    monthly_cost !== undefined ? Number(monthly_cost) || 0 : developer.monthly_cost,
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

module.exports = router;
