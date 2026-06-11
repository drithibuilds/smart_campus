require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcryptjs');

const db = require('./config/db');
const authRoutes = require('./routes/auth');
const complaintRoutes = require('./routes/complaints');
const miscRoutes = require('./routes/misc');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 8 },
}));

// static
app.use(express.static(path.join(__dirname, 'public')));

// routes
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api', miscRoutes);

// home
app.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard.html');
  res.redirect('/login.html');
});

// seed default admin if missing
(async () => {
  try {
    const [rows] = await db.query("SELECT id FROM users WHERE email='admin@campus.edu'");
    if (!rows.length) {
      const hash = await bcrypt.hash('Admin@123', 10);
      await db.query(
        "INSERT INTO users (name,email,password,role) VALUES ('Campus Admin','admin@campus.edu',?,'admin')",
        [hash]);
      console.log("👤 Seeded default admin -> admin@campus.edu / Admin@123");
    }
  } catch (e) { console.error('Seed admin failed:', e.message); }
})();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Smart Campus CCMS running at http://localhost:${PORT}`);
});
