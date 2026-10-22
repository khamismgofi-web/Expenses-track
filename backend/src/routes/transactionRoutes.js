import { Router } from 'express';
import pool from '../db.js';
import requireLogin from '../middleware/requireLogin.js';

const router = Router();
router.use(requireLogin);

function validate(body) {
  const { type, amount, category, transaction_date } = body;
  if (!['income', 'expense'].includes(type)) return 'Type must be income or expense';
  if (!(Number(amount) > 0)) return 'Amount must be greater than 0';
  if (!category || !category.trim()) return 'Category is required';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(transaction_date || '')) return 'Date must be YYYY-MM-DD';
  return null;
}
router.get('/', async (req, res) => {
  const { type, from, to } = req.query;
  let sql =
    'SELECT id, type, amount, category, description, transaction_date FROM transactions WHERE user_id = ?';
  const params = [req.userId];
    if (type) {
    sql += ' AND type = ?';
    params.push(type);
  }
  if (from) {
    sql += ' AND transaction_date >= ?';
        params.push(from);
  }
  if (to) {
    sql += ' AND transaction_date <= ?';
    params.push(to);
  }
  sql += ' ORDER BY transaction_date DESC, id DESC';
  const [rows] = await pool.query(sql, params);
  res.json(rows);
});
router.post('/', async (req, res) => {
  const error = validate(req.body);
  if (error) return res.status(400).json({ message: error });
  const { type, amount, category, description, transaction_date } = req.body;
  const [result] = await pool.query(
    'INSERT INTO transactions (user_id, type, amount, category, description, transaction_date) VALUES (?, ?, ?, ?, ?, ?)',
    [req.userId, type, amount, category.trim(), description || null, transaction_date]
  );
  res.status(201).json({ id: result.insertId });
});
router.put('/:id', async (req, res) => {
  const error = validate(req.body);
  if (error) return res.status(400).json({ message: error });
  const { type, amount, category, description, transaction_date } = req.body;
  const [result] = await pool.query(
    'UPDATE transactions SET type = ?, amount = ?, category = ?, description = ?, transaction_date = ? WHERE id = ? AND user_id = ?',
    [type, amount, category.trim(), description || null, transaction_date, req.params.id, req.userId]
  );
  if (result.affectedRows === 0) return res.status(404).json({ message: 'Record not found' });
  res.json({ message: 'Updated' });
});
router.delete('/:id', async (req, res) => {
  const [result] = await pool.query(
    'DELETE FROM transactions WHERE id = ? AND user_id = ?',
    [req.params.id, req.userId]
  );
  if (result.affectedRows === 0) return res.status(404).json({ message: 'Record not found' });
  res.json({ message: 'Deleted' });
});

export default router;