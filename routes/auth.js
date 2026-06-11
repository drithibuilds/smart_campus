const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { sendMail } = require('../config/mailer');

const router = express.Router();

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, department, phone } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, password are required' });

    const [exists] = await db.query('SELECT id FROM users WHERE email=?', [email]);
    if (exists.length) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const userRole = ['student', 'staff', 'admin'].includes(role) ? role : 'student';
    const [r] = await db.query(
      'INSERT INTO users (name,email,password,role,department,phone) VALUES (?,?,?,?,?,?)',
      [name, email, hash, userRole, department || null, phone || null]
    );

    sendMail(email, 'Welcome to Smart Campus CCMS',
      `<h2>Hi ${name},</h2><p>Your account has been created successfully.</p>
       <p>Role: <b>${userRole}</b></p><p>You can now log in and start using the system.</p>`);

    res.json({ ok: true, id: r.insertId });
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Server error' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const [rows] = await db.query('SELECT * FROM users WHERE email=?', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    req.session.user = {
      id: user.id, name: user.name, email: user.email,
      role: user.role, department: user.department,
    };
    res.json({ ok: true, user: req.session.user });
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Server error' });
  }
});

// LOGOUT
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// ME
router.get('/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });
  res.json({ user: req.session.user });
});

module.exports = router;
