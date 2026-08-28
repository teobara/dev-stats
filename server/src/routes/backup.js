const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/backup - export complet al datelor de business, ca fisier JSON descarcabil.
// Nu include users/sessions (date de autentificare) - doar programatori, proiecte,
// alocari, venituri si costuri. Util ca backup manual, indiferent de starea
// volumului persistent de pe Railway.
router.get('/', (req, res) => {
  const data = {
    exported_at: new Date().toISOString(),
    developers: db.prepare('SELECT * FROM developers ORDER BY id').all(),
    projects: db.prepare('SELECT * FROM projects ORDER BY id').all(),
    project_developers: db.prepare('SELECT * FROM project_developers ORDER BY id').all(),
    project_revenue: db.prepare('SELECT * FROM project_revenue ORDER BY id').all(),
    developer_cost: db.prepare('SELECT * FROM developer_cost ORDER BY id').all(),
  };

  const filename = `devstats-backup-${new Date().toISOString().slice(0, 10)}.json`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.json(data);
});

module.exports = router;
