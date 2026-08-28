const express = require('express');
const db = require('../db');

const router = express.Router();

function getProjectOr404(req, res) {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) {
    res.status(404).json({ error: 'Proiectul nu a fost gasit.' });
    return null;
  }
  return project;
}

function attachDevelopers(project) {
  const developers = db
    .prepare(
      `SELECT d.id, d.name, d.role, pd.share_percent
       FROM project_developers pd
       JOIN developers d ON d.id = pd.developer_id
       WHERE pd.project_id = ?
       ORDER BY d.name ASC`
    )
    .all(project.id);
  return { ...project, developers };
}

router.get('/', (req, res) => {
  const projects = db.prepare('SELECT * FROM projects ORDER BY status ASC, name ASC').all();
  res.json(projects.map(attachDevelopers));
});

router.post('/', (req, res) => {
  const { name, client, description } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Numele proiectului este obligatoriu.' });
  }
  const info = db
    .prepare('INSERT INTO projects (name, client, description) VALUES (?, ?, ?)')
    .run(name.trim(), client || null, description || null);
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(attachDevelopers(project));
});

router.get('/:id', (req, res) => {
  const project = getProjectOr404(req, res);
  if (!project) return;

  const revenue = db
    .prepare('SELECT * FROM project_revenue WHERE project_id = ? ORDER BY year DESC, month DESC')
    .all(project.id);

  res.json({ ...attachDevelopers(project), revenue });
});

router.put('/:id', (req, res) => {
  const project = getProjectOr404(req, res);
  if (!project) return;

  const { name, client, description, status } = req.body;
  db.prepare(
    `UPDATE projects SET name = ?, client = ?, description = ?, status = ? WHERE id = ?`
  ).run(
    name !== undefined ? name.trim() : project.name,
    client !== undefined ? client : project.client,
    description !== undefined ? description : project.description,
    status !== undefined ? status : project.status,
    project.id
  );

  res.json(attachDevelopers(db.prepare('SELECT * FROM projects WHERE id = ?').get(project.id)));
});

router.delete('/:id', (req, res) => {
  const project = getProjectOr404(req, res);
  if (!project) return;
  db.prepare('DELETE FROM projects WHERE id = ?').run(project.id);
  res.status(204).end();
});

router.post('/:id/developers', (req, res) => {
  const project = getProjectOr404(req, res);
  if (!project) return;

  const { developer_id, share_percent } = req.body;
  const developer = db.prepare('SELECT * FROM developers WHERE id = ?').get(developer_id);
  if (!developer) {
    return res.status(400).json({ error: 'Programatorul nu exista.' });
  }

  try {
    db.prepare(
      'INSERT INTO project_developers (project_id, developer_id, share_percent) VALUES (?, ?, ?)'
    ).run(project.id, developer.id, share_percent !== undefined ? Number(share_percent) : 100);
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'Programatorul este deja alocat pe acest proiect.' });
    }
    throw err;
  }

  res.status(201).json(attachDevelopers(project));
});

router.put('/:id/developers/:developerId', (req, res) => {
  const project = getProjectOr404(req, res);
  if (!project) return;

  const { share_percent } = req.body;
  const result = db
    .prepare(
      'UPDATE project_developers SET share_percent = ? WHERE project_id = ? AND developer_id = ?'
    )
    .run(Number(share_percent), project.id, req.params.developerId);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Alocarea nu a fost gasita.' });
  }

  res.json(attachDevelopers(project));
});

router.delete('/:id/developers/:developerId', (req, res) => {
  const project = getProjectOr404(req, res);
  if (!project) return;
  db.prepare(
    'DELETE FROM project_developers WHERE project_id = ? AND developer_id = ?'
  ).run(project.id, req.params.developerId);
  res.status(204).end();
});

router.get('/:id/revenue', (req, res) => {
  const project = getProjectOr404(req, res);
  if (!project) return;
  const rows = db
    .prepare('SELECT * FROM project_revenue WHERE project_id = ? ORDER BY year DESC, month DESC')
    .all(project.id);
  res.json(rows);
});

router.put('/:id/revenue', (req, res) => {
  const project = getProjectOr404(req, res);
  if (!project) return;

  const { year, month, amount, note } = req.body;
  const y = Number(year);
  const m = Number(month);
  const a = Number(amount);

  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12 || Number.isNaN(a)) {
    return res.status(400).json({ error: 'An/luna/suma invalide.' });
  }

  db.prepare(
    `INSERT INTO project_revenue (project_id, year, month, amount, note)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(project_id, year, month)
     DO UPDATE SET amount = excluded.amount, note = excluded.note`
  ).run(project.id, y, m, a, note || null);

  const row = db
    .prepare('SELECT * FROM project_revenue WHERE project_id = ? AND year = ? AND month = ?')
    .get(project.id, y, m);
  res.json(row);
});

router.delete('/:id/revenue/:year/:month', (req, res) => {
  const project = getProjectOr404(req, res);
  if (!project) return;
  db.prepare(
    'DELETE FROM project_revenue WHERE project_id = ? AND year = ? AND month = ?'
  ).run(project.id, Number(req.params.year), Number(req.params.month));
  res.status(204).end();
});

module.exports = router;
