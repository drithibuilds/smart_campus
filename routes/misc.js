const express = require('express');
const db = require('../config/db');
const { requireLogin, requireRole } = require('../middleware/auth');

const router = express.Router();

// list departments
router.get('/departments', requireLogin, async (_req, res) => {
  const [rows] = await db.query('SELECT * FROM departments ORDER BY name');
  res.json({ departments: rows });
});

// list staff (optionally filtered by department)
router.get('/staff', requireRole('staff','admin'), async (req, res) => {
  const { department } = req.query;
  const params = [];
  let sql = "SELECT id,name,email,department,phone FROM users WHERE role='staff'";
  if (department) { sql += ' AND department=?'; params.push(department); }
  sql += ' ORDER BY name';
  const [rows] = await db.query(sql, params);
  res.json({ staff: rows });
});

// notifications for current user
router.get('/notifications', requireLogin, async (req, res) => {
  const [rows] = await db.query(
    'SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50',
    [req.session.user.id]);
  res.json({ notifications: rows });
});

router.post('/notifications/read', requireLogin, async (req, res) => {
  await db.query('UPDATE notifications SET is_read=1 WHERE user_id=?', [req.session.user.id]);
  res.json({ ok: true });
});

module.exports = router;
