const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  res.json(settings);
});

router.put('/', (req, res) => {
  const current = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  const { fixed_monthly_expenses, fixed_expenses_note, fixed_expenses_divisor } = req.body;

  db.prepare(
    `UPDATE settings
     SET fixed_monthly_expenses = ?, fixed_expenses_note = ?, fixed_expenses_divisor = ?
     WHERE id = 1`
  ).run(
    fixed_monthly_expenses !== undefined ? Number(fixed_monthly_expenses) || 0 : current.fixed_monthly_expenses,
    fixed_expenses_note !== undefined ? fixed_expenses_note : current.fixed_expenses_note,
    // Minim 1, ca sa nu impartim vreodata la 0.
    fixed_expenses_divisor !== undefined
      ? Math.max(1, Number(fixed_expenses_divisor) || 1)
      : current.fixed_expenses_divisor
  );

  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  res.json(settings);
});

module.exports = router;
