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

  // Numarul la care se imparte e ales manual (settings.fixed_expenses_divisor),
  // nu neaparat numarul de programatori activi din sistem - poate include si
  // oameni care nu sunt tinuti evidenta ca "programator" (vezi nota libera).
  // Suma se acorda in continuare doar programatorilor activi.
  const activeDeveloperCount = developers.filter((d) => d.active).length;
  const expensesDivisor = Math.max(1, settings.fixed_expenses_divisor || 1);
  const overheadShare = fixedExpenses / expensesDivisor;

  const incomeByDev = new Map(
    monthlyIncomeByDeveloper(year, month).map((row) => [row.developer_id, row.income])
  );

  // Cat din venitul lunii vine din proiecte marcate "recurente" (mentenanta,
  // incasari care se repeta) - independent de programator, e o proprietate
  // a proiectului.
  const recurringIncome = db
    .prepare(
      `SELECT COALESCE(SUM(pdr.amount), 0) AS total
       FROM project_developer_revenue pdr
       JOIN projects p ON p.id = pdr.project_id
       WHERE pdr.year = ? AND pdr.month = ? AND p.is_recurring = 1`
    )
    .get(year, month).total;

  // Doar proiectele pentru care exista efectiv o suma setata in luna
  // selectata (nu toate proiectele la care e alocat, indiferent de luna) -
  // ca sa apara sub numele programatorului doar in lunile in care chiar
  // "conteaza" acel proiect pentru el.
  const projectsByDeveloper = new Map();
  const projectAssignmentRows = db
    .prepare(
      `SELECT DISTINCT pdr.developer_id, p.id AS project_id, p.name AS project_name
       FROM project_developer_revenue pdr
       JOIN projects p ON p.id = pdr.project_id
       WHERE pdr.year = ? AND pdr.month = ?
       ORDER BY p.name ASC`
    )
    .all(year, month);
  for (const row of projectAssignmentRows) {
    if (!projectsByDeveloper.has(row.developer_id)) {
      projectsByDeveloper.set(row.developer_id, []);
    }
    projectsByDeveloper.get(row.developer_id).push({ id: row.project_id, name: row.project_name });
  }

  const rows = developers.map((dev) => {
    const income = incomeByDev.get(dev.id) || 0;
    const salaryCost = dev.monthly_cost || 0;
    const overhead = dev.active ? overheadShare : 0;
    const cost = salaryCost + overhead;
    const incomeTarget = dev.monthly_revenue_target || 0;
    const diff = income - incomeTarget;
    return {
      developer_id: dev.id,
      name: dev.name,
      role: dev.role,
      active: dev.active,
      projects: projectsByDeveloper.get(dev.id) || [],
      income,
      income_target: incomeTarget,
      income_vs_target: diff,
      // Plus si minus separate: surplus e mereu >= 0, deficit e mereu <= 0.
      // Un developer contribuie fie la unul, fie la celalalt, niciodata la ambele.
      income_surplus: Math.max(0, diff),
      income_deficit: Math.min(0, diff),
      // Cost separat pe cele doua surse: salariul propriu-zis, si cota din
      // cheltuielile fixe ale business-ului. cost = suma lor, pentru profit.
      salary_cost: salaryCost,
      overhead_share: overhead,
      cost,
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
      salary_cost: acc.salary_cost + row.salary_cost,
      // Suma cotelor individuale (fiecare programator activ primeste cate o
      // cota) - poate diferi de fixedExpenses daca "impartita la" nu e egal
      // cu numarul real de programatori activi. Pastrata doar informativ.
      overhead_share: acc.overhead_share + row.overhead_share,
    }),
    {
      income: 0,
      income_target: 0,
      income_vs_target: 0,
      income_surplus: 0,
      income_deficit: 0,
      salary_cost: 0,
      overhead_share: 0,
    }
  );

  // Costul total real al lunii: cheltuielile fixe o singura data (nu
  // inmultite pe fiecare programator) + toate salariile. Diferit, intentionat,
  // de suma cost-urilor individuale (care folosesc cota per-persoana - vezi
  // coloana "Cheltuieli fixe" din tabel si nota de mai sus).
  totals.cost = fixedExpenses + totals.salary_cost;
  totals.profit = totals.income - totals.cost;

  res.json({
    year,
    month,
    rows,
    totals,
    fixed_monthly_expenses: fixedExpenses,
    fixed_expenses_note: settings.fixed_expenses_note || '',
    fixed_expenses_divisor: expensesDivisor,
    active_developer_count: activeDeveloperCount,
    overhead_share: overheadShare,
    recurring_income: recurringIncome,
  });
});

router.get('/developer/:id', (req, res) => {
  const developer = db.prepare('SELECT * FROM developers WHERE id = ?').get(req.params.id);
  if (!developer) {
    return res.status(404).json({ error: 'Programatorul nu a fost gasit.' });
  }

  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  const expensesDivisor = Math.max(1, settings.fixed_expenses_divisor || 1);
  const overheadShare = developer.active
    ? (settings.fixed_monthly_expenses || 0) / expensesDivisor
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
