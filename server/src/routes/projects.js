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
      `SELECT d.id, d.name, d.role
       FROM project_developers pd
       JOIN developers d ON d.id = pd.developer_id
       WHERE pd.project_id = ?
       ORDER BY d.name ASC`
    )
    .all(project.id);
  // Total incasat pe acest proiect, de la inceput, pe toti programatorii si toate lunile.
  const totalRevenue = db
    .prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM project_developer_revenue WHERE project_id = ?')
    .get(project.id).total;
  return { ...project, developers, total_revenue: totalRevenue };
}

function isDeveloperAssigned(projectId, developerId) {
  return Boolean(
    db
      .prepare('SELECT 1 FROM project_developers WHERE project_id = ? AND developer_id = ?')
      .get(projectId, developerId)
  );
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
    .prepare(
      `SELECT pdr.*, d.name AS developer_name
       FROM project_developer_revenue pdr
       JOIN developers d ON d.id = pdr.developer_id
       WHERE pdr.project_id = ?
       ORDER BY pdr.year DESC, pdr.month DESC, d.name ASC`
    )
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

// POST /:id/developers - aloca un programator pe proiect (fara procent - fiecare
// isi are propriile sume, introduse manual la /revenue)
router.post('/:id/developers', (req, res) => {
  const project = getProjectOr404(req, res);
  if (!project) return;

  const { developer_id } = req.body;
  const developer = db.prepare('SELECT * FROM developers WHERE id = ?').get(developer_id);
  if (!developer) {
    return res.status(400).json({ error: 'Programatorul nu exista.' });
  }

  try {
    db.prepare('INSERT INTO project_developers (project_id, developer_id) VALUES (?, ?)').run(
      project.id,
      developer.id
    );
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'Programatorul este deja alocat pe acest proiect.' });
    }
    throw err;
  }

  res.status(201).json(attachDevelopers(project));
});

router.delete('/:id/developers/:developerId', (req, res) => {
  const project = getProjectOr404(req, res);
  if (!project) return;
  db.prepare(
    'DELETE FROM project_developers WHERE project_id = ? AND developer_id = ?'
  ).run(project.id, req.params.developerId);
  res.status(204).end();
});

// GET /:id/revenue - istoric venituri, cate un rand per (programator, luna)
router.get('/:id/revenue', (req, res) => {
  const project = getProjectOr404(req, res);
  if (!project) return;
  const rows = db
    .prepare(
      `SELECT pdr.*, d.name AS developer_name
       FROM project_developer_revenue pdr
       JOIN developers d ON d.id = pdr.developer_id
       WHERE pdr.project_id = ?
       ORDER BY pdr.year DESC, pdr.month DESC, d.name ASC`
    )
    .all(project.id);
  res.json(rows);
});

// PUT /:id/revenue - adauga/actualizeaza suma pentru un programator, intr-o luna (upsert)
router.put('/:id/revenue', (req, res) => {
  const project = getProjectOr404(req, res);
  if (!project) return;

  const { developer_id, year, month, amount, note } = req.body;
  const devId = Number(developer_id);
  const y = Number(year);
  const m = Number(month);
  const a = Number(amount);

  if (!Number.isInteger(devId)) {
    return res.status(400).json({ error: 'Alege un programator.' });
  }
  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12 || Number.isNaN(a)) {
    return res.status(400).json({ error: 'An/luna/suma invalide.' });
  }
  if (!isDeveloperAssigned(project.id, devId)) {
    return res.status(400).json({ error: 'Programatorul nu este alocat pe acest proiect.' });
  }

  db.prepare(
    `INSERT INTO project_developer_revenue (project_id, developer_id, year, month, amount, note)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(project_id, developer_id, year, month)
     DO UPDATE SET amount = excluded.amount, note = excluded.note`
  ).run(project.id, devId, y, m, a, note || null);

  const row = db
    .prepare(
      `SELECT pdr.*, d.name AS developer_name
       FROM project_developer_revenue pdr
       JOIN developers d ON d.id = pdr.developer_id
       WHERE pdr.project_id = ? AND pdr.developer_id = ? AND pdr.year = ? AND pdr.month = ?`
    )
    .get(project.id, devId, y, m);
  res.json(row);
});

// DELETE /:id/revenue/:developerId/:year/:month
router.delete('/:id/revenue/:developerId/:year/:month', (req, res) => {
  const project = getProjectOr404(req, res);
  if (!project) return;
  db.prepare(
    'DELETE FROM project_developer_revenue WHERE project_id = ? AND developer_id = ? AND year = ? AND month = ?'
  ).run(project.id, Number(req.params.developerId), Number(req.params.year), Number(req.params.month));
  res.status(204).end();
});

module.exports = router;
