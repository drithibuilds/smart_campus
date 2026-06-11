const express = require('express');
const db = require('../config/db');
const { sendMail } = require('../config/mailer');
const { requireLogin, requireRole } = require('../middleware/auth');

const router = express.Router();

// helper: add history + notification
async function log(complaintId, action, note, actorId) {
  await db.query(
    'INSERT INTO complaint_history (complaint_id, action, note, actor_id) VALUES (?,?,?,?)',
    [complaintId, action, note || null, actorId || null]
  );
}
async function notify(userId, message) {
  if (!userId) return;
  await db.query('INSERT INTO notifications (user_id, message) VALUES (?,?)', [userId, message]);
}

// ===== Student: create complaint =====
router.post('/', requireLogin, async (req, res) => {
  try {
    const { title, description, category, location, priority } = req.body;
    if (!title || !description || !category) return res.status(400).json({ error: 'Missing fields' });

    const [r] = await db.query(
      'INSERT INTO complaints (title,description,category,location,priority,user_id) VALUES (?,?,?,?,?,?)',
      [title, description, category, location || null, priority || 'Medium', req.session.user.id]
    );
    await log(r.insertId, 'Complaint Created', `Category: ${category}`, req.session.user.id);

    // Notify all staff of that department + all admins
    const [staff] = await db.query(
      "SELECT id, email, name FROM users WHERE (role='staff' AND department=?) OR role='admin'",
      [category]
    );
    for (const s of staff) {
      await notify(s.id, `New complaint: ${title}`);
      sendMail(s.email, `[CCMS] New ${category} complaint`,
        `<p>Hi ${s.name},</p><p>A new complaint has been raised.</p>
         <p><b>Title:</b> ${title}</p><p><b>Priority:</b> ${priority || 'Medium'}</p>
         <p><b>Description:</b><br/>${description}</p>`);
    }

    res.json({ ok: true, id: r.insertId });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// ===== List complaints (scoped to role) =====
router.get('/', requireLogin, async (req, res) => {
  try {
    const u = req.session.user;
    let sql = `SELECT c.*, u.name AS user_name, u.email AS user_email,
                      a.name AS assignee_name
               FROM complaints c
               JOIN users u ON u.id = c.user_id
               LEFT JOIN users a ON a.id = c.assigned_to`;
    const params = [];
    if (u.role === 'student')      { sql += ' WHERE c.user_id=?';     params.push(u.id); }
    else if (u.role === 'staff')   { sql += ' WHERE c.category=?',     params.push(u.department); }
    sql += ' ORDER BY c.created_at DESC';
    const [rows] = await db.query(sql, params);
    res.json({ complaints: rows });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// ===== Single complaint + history =====
router.get('/:id', requireLogin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.*, u.name AS user_name, u.email AS user_email, a.name AS assignee_name
       FROM complaints c JOIN users u ON u.id=c.user_id
       LEFT JOIN users a ON a.id=c.assigned_to WHERE c.id=?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    const [hist] = await db.query(
      `SELECT h.*, u.name AS actor_name FROM complaint_history h
       LEFT JOIN users u ON u.id=h.actor_id WHERE complaint_id=? ORDER BY h.created_at ASC`,
      [req.params.id]);
    res.json({ complaint: rows[0], history: hist });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// ===== Update status (staff/admin) =====
router.put('/:id/status', requireRole('staff','admin'), async (req, res) => {
  try {
    const { status, note } = req.body;
    if (!['Pending','In Progress','Resolved'].includes(status))
      return res.status(400).json({ error: 'Invalid status' });

    await db.query('UPDATE complaints SET status=? WHERE id=?', [status, req.params.id]);
    await log(req.params.id, `Status -> ${status}`, note, req.session.user.id);

    const [[c]] = await db.query(
      'SELECT c.title, c.user_id, u.email, u.name FROM complaints c JOIN users u ON u.id=c.user_id WHERE c.id=?',
      [req.params.id]);
    if (c) {
      await notify(c.user_id, `Your complaint "${c.title}" is now ${status}`);
      sendMail(c.email, `[CCMS] Complaint Update: ${status}`,
        `<p>Hi ${c.name},</p><p>Your complaint <b>${c.title}</b> is now <b>${status}</b>.</p>
         ${note ? `<p>Note: ${note}</p>` : ''}`);
    }
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// ===== Assign to staff (admin/staff) =====
router.put('/:id/assign', requireRole('staff','admin'), async (req, res) => {
  try {
    const { staff_id } = req.body;
    const [[s]] = await db.query("SELECT id,name,email,department FROM users WHERE id=? AND role='staff'", [staff_id]);
    if (!s) return res.status(400).json({ error: 'Invalid staff' });

    await db.query('UPDATE complaints SET assigned_to=?, status=IF(status="Pending","In Progress",status) WHERE id=?',
      [staff_id, req.params.id]);
    await log(req.params.id, `Assigned to ${s.name}`, null, req.session.user.id);
    await notify(staff_id, `You have been assigned a new complaint #${req.params.id}`);
    sendMail(s.email, '[CCMS] New Assignment',
      `<p>Hi ${s.name},</p><p>You have been assigned complaint #${req.params.id}.</p>`);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// ===== Stats =====
router.get('/stats/overview', requireLogin, async (req, res) => {
  try {
    const u = req.session.user;
    let where = '1=1', params = [];
    if (u.role === 'student') { where = 'user_id=?'; params = [u.id]; }
    else if (u.role === 'staff') { where = 'category=?'; params = [u.department]; }
    const [[r]] = await db.query(
      `SELECT
         COUNT(*) AS total,
         SUM(status='Pending')     AS pending,
         SUM(status='In Progress') AS in_progress,
         SUM(status='Resolved')    AS resolved
       FROM complaints WHERE ${where}`, params);
    res.json(r);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
