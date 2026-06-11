const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter = null;
if (process.env.MAIL_USER && process.env.MAIL_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.MAIL_PORT || 587),
    secure: false,
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
  });
}

async function sendMail(to, subject, html) {
  if (!transporter) {
    console.log(`[mail-skipped] to=${to} subject="${subject}"`);
    return;
  }
  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.MAIL_USER,
      to, subject, html,
    });
    console.log(`📧 Email sent to ${to}`);
  } catch (e) {
    console.error('Email error:', e.message);
  }
}

module.exports = { sendMail };
