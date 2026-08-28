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
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  const fixedExpenses = settings.fixed_monthly_expenses || 0;

  // Cheltuielile fixe se impart in mod egal doar intre programatorii activi -
  // unul inactiv nu mai primeste o cota din ele.
  const activeDeveloperCount = developers.filter((d) => d.active).length;
  const overheadShare = activeDeveloperCount > 0 ? fixedExpenses / activeDeveloperCount : 0;

  const incomeByDev = new Map(
    monthlyIncomeByDeveloper(year, month).map((row) => [row.developer_id, row.income])
  );

  const rows = developers.map((dev) => {
    const income = incomeByDev.get(dev.id) || 0;
    const overhead = dev.active ? overheadShare : 0;
    const cost = (dev.monthly_cost || 0) + overhead;
    const incomeTarget = dev.monthly_revenue_target || 0;
    const diff = income - incomeTarget;
    return {
      developer_id: dev.id,
      name: dev.name,
      role: dev.role,
      active: dev.active,
      income,
      income_target: incomeTarget,
      income_vs_target: diff,
      // Plus si minus separate: surplus e mereu >= 0, deficit e mereu <= 0.
      // Un developer contribuie fie la unul, fie la celalalt, niciodata la ambele.
      income_surplus: Math.max(0, diff),
      income_deficit: Math.min(0, diff),
      cost,
      overhead_share: overhead,
      profit: income - cost,
    };
  });

  const totals = rows.reduce(
    (acc, row) => ({
      income: acc.income + row.income,
      income_target: acc.income_target + row.income_target,
      income_vs_target: acc.income_vs_target + row.income_vs_target,
      income_surplus: acc.income_surplus + row.income_surplus,
      income_deficit: acc.income_deficit + row.income_deficit,
      cost: acc.cost + row.cost,
      profit: acc.profit + row.profit,
    }),
    { income: 0, income_target: 0, income_vs_target: 0, income_surplus: 0, income_deficit: 0, cost: 0, profit: 0 }
  );

  res.json({
    year,
    month,
    rows,
    totals,
    fixed_monthly_expenses: fixedExpenses,
    active_developer_count: activeDeveloperCount,
    overhead_share: overheadShare,
  });
});

router.get('/developer/:id', (req, res) => {
  const developer = db.prepare('SELECT * FROM developers WHERE id = ?').get(req.params.id);
  if (!developer) {
    return res.status(404).json({ error: 'Programatorul nu a fost gasit.' });
  }

  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  const activeDeveloperCount = db
    .prepare('SELECT COUNT(*) AS n FROM developers WHERE active = 1').get().n;
  const overheadShare =
    developer.active && activeDeveloperCount > 0
      ? (settings.fixed_monthly_expenses || 0) / activeDeveloperCount
      : 0;

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
    // Costul (inclusiv cota din cheltuielile fixe) e acelasi in fiecare luna -
    // e valoarea curenta, nu un istoric separat per luna.
    const cost = (developer.monthly_cost || 0) + overheadShare;

    points.push({ year, month, income, cost, profit: income - cost });
  }

  res.json({ developer, points });
});

module.exports = router;
