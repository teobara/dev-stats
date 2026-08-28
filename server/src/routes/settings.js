const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  res.json(settings);
});

router.put('/', (req, res) => {
  const { fixed_monthly_expenses } = req.body;
  const value = Number(fixed_monthly_expenses) || 0;
  db.prepare('UPDATE settings SET fixed_monthly_expenses = ? WHERE id = 1').run(value);
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  res.json(settings);
});

module.exports = router;
