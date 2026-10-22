import { Router } from 'express';
import pool from '../db.js';
import requireLogin from '../middleware/requireLogin.js';

const router = Router();
router.use(requireLogin);

router.get('/summary', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0) AS total_income,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) AS total_expense
     FROM transactions WHERE user_id = ?`,
    [req.userId]
  );
  const income = Number(rows[0].total_income);
  const expense = Number(rows[0].total_expense);
  res.json({ total_income: income, total_expense: expense, balance: income - expense });
});
router.get('/by-category', async (req, res) => {
  const type = req.query.type === 'income' ? 'income' : 'expense';
  const [rows] = await pool.query(
    `SELECT category, SUM(amount) AS total
     FROM transactions WHERE user_id = ? AND type = ?
     GROUP BY category ORDER BY total DESC`,
    [req.userId, type]
  );
  res.json(rows.map((r) => ({ category: r.category, total: Number(r.total) })));
});

router.get('/monthly', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT
       DATE_FORMAT(transaction_date, '%Y-%m') AS month,
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0) AS income,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) AS expense
     FROM transactions
     WHERE user_id = ? AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
     GROUP BY month ORDER BY month`,
    [req.userId]
  );
  res.json(rows.map((r) => ({ month: r.month, income: Number(r.income), expense: Number(r.expense) })));
});

export default router;