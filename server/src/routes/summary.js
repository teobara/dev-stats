const express = require('express');
const db = require('../db');

const router = express.Router();

function monthlyIncomeByDeveloper(year, month) {
  return db
    .prepare(
      `SELECT d.id AS developer_id,
              COALESCE(SUM(pdr.amount), 0) AS income
       FROM developers d
       LEFT JOIN project_developer_revenue pdr
         ON pdr.developer_id = d.id AND pdr.year = ? AND pdr.month = ?
       GROUP BY d.id`
    )
    .all(year, month);
}

router.get('/', (req, res) => {
  const now = new Date();
  const year = Number(req.query.year) || now.getFullYear();
  const month = Number(req.query.month) || now.getMonth() + 1;

  const developers = db.prepare('SELECT * FROM developers ORDER BY active DESC, name ASC').all();

  const incomeByDev = new Map(
    monthlyIncomeByDeveloper(year, month).map((row) => [row.developer_id, row.income])
  );

  const rows = developers.map((dev) => {
    const income = incomeByDev.get(dev.id) || 0;
    const cost = dev.monthly_cost || 0;
    const incomeTarget = dev.monthly_revenue_target || 0;
    return {
      developer_id: dev.id,
      name: dev.name,
      role: dev.role,
      active: dev.active,
      income,
      income_target: incomeTarget,
      income_vs_target: income - incomeTarget,
      cost,
      profit: income - cost,
    };
  });

  const totals = rows.reduce(
    (acc, row) => ({
      income: acc.income + row.income,
      income_target: acc.income_target + row.income_target,
      income_vs_target: acc.income_vs_target + row.income_vs_target,
      cost: acc.cost + row.cost,
      profit: acc.profit + row.profit,
    }),
    { income: 0, income_target: 0, income_vs_target: 0, cost: 0, profit: 0 }
  );

  res.json({ year, month, rows, totals });
});

router.get('/developer/:id', (req, res) => {
  const developer = db.prepare('SELECT * FROM developers WHERE id = ?').get(req.params.id);
  if (!developer) {
    return res.status(404).json({ error: 'Programatorul nu a fost gasit.' });
  }

  const monthsBack = Math.min(Math.max(Number(req.query.months) || 12, 1), 36);
  const now = new Date();
  const points = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;

    const incomeRow = db
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) AS income
         FROM project_developer_revenue
         WHERE developer_id = ? AND year = ? AND month = ?`
      )
      .get(developer.id, year, month);
    const income = incomeRow ? incomeRow.income : 0;
    const cost = developer.monthly_cost || 0;

    points.push({ year, month, income, cost, profit: income - cost });
  }

  res.json({ developer, points });
});

module.exports = router;
