# Smart Campus Complaint Management & Resolution System (CCMS)

A complete web app to register, track, and resolve campus complaints —
built with **Node.js + Express**, **MySQL**, and plain **HTML/CSS/JS**.

## ✨ Features

- 🔐 Email + password **login & registration** (Student / Staff / Admin)
- 📝 **Online complaint registration** with category, priority & location
- 🔍 **Complaint tracking** with status — Pending / In Progress / Resolved
- 🏢 **Department dashboard** — complaints grouped by department
- 👥 **Staff & Assign** — assign complaints to the right person
- 🔔 In-app **notification bell** + 📧 **email notifications** (Nodemailer)
- 🕘 **History / activity log** for every complaint
- 📊 Live **Overview dashboard** with KPI cards
- 🎨 Modern dark UI, responsive, no frameworks

---

## 🧰 Tech Stack & Modules

| Layer    | Tech                                                |
|----------|-----------------------------------------------------|
| Backend  | Node.js, Express                                    |
| Database | MySQL (via `mysql2` pool)                           |
| Auth     | `bcryptjs` + `express-session`                      |
| Email    | `nodemailer` (Gmail SMTP / any SMTP)                |
| Frontend | HTML, CSS, Vanilla JavaScript (no build step)       |

NPM modules used: `express`, `mysql2`, `bcryptjs`, `express-session`,
`body-parser`, `cookie-parser`, `dotenv`, `nodemailer`, `jsonwebtoken`,
plus `nodemon` (dev).

---

## 🚀 Setup (VS Code, step-by-step)

### 1. Install prerequisites
- [Node.js LTS](https://nodejs.org) (v18 or newer) — `node -v` to verify
- [MySQL Server](https://dev.mysql.com/downloads/mysql/) (8.x) +
  MySQL Workbench (optional)
- VS Code

### 2. Open project in VS Code
Extract the zip → `File → Open Folder` → choose **smart-campus-ccms**.

### 3. Install dependencies
Open the integrated terminal (`Ctrl + ~`) and run:
```bash
npm install
```

### 4. Create the database
Open MySQL Workbench or the MySQL CLI and run the SQL file:
```sql
SOURCE database/schema.sql;
```
(or copy-paste its contents). This creates the `campus_ccms` DB,
all tables, and seed departments.

### 5. Configure environment
Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env       # macOS/Linux
copy .env.example .env     # Windows
```
- `DB_PASSWORD` → your MySQL root password
- `MAIL_USER` / `MAIL_PASS` → Gmail account + **App Password**
  (Google → Manage account → Security → 2-Step Verification → App passwords).
  Leave blank to skip email sending (the app still works).

### 6. Run the server
```bash
npm start
# or, with auto-reload during development
npm run dev
```
You should see:
```
✅ MySQL connected
👤 Seeded default admin -> admin@campus.edu / Admin@123
🚀 Smart Campus CCMS running at http://localhost:3000
```

### 7. Open in browser
Visit **http://localhost:3000**.

- Login with the seeded admin: **admin@campus.edu / Admin@123**
- Or click **Create an account** to register as a Student or Staff.

---

## 👤 Roles

| Role    | Can do                                                                       |
|---------|------------------------------------------------------------------------------|
| Student | Raise complaints, track own complaints                                       |
| Staff   | See complaints in their department, update status, assign, get email alerts  |
| Admin   | Everything: view all complaints, assign any staff, manage everything         |

Staff must pick a **Department** when registering — that's the department whose complaints they'll see.

---

## 📁 Project Structure
```
smart-campus-ccms/
├── server.js                 # Express entry point
├── package.json
├── .env.example
├── config/
│   ├── db.js                 # MySQL pool
│   └── mailer.js             # Nodemailer
├── middleware/
│   └── auth.js               # session guards
├── routes/
│   ├── auth.js               # /api/auth/*
│   ├── complaints.js         # /api/complaints/*
│   └── misc.js               # /api/staff, /api/departments, /api/notifications
├── database/
│   └── schema.sql            # MySQL schema + seed
└── public/                   # Static frontend
    ├── login.html
    ├── register.html
    ├── dashboard.html
    ├── css/styles.css
    └── js/dashboard.js
```

---

## 🛟 Troubleshooting

- **`ECONNREFUSED` on MySQL** → MySQL service isn't running.
  Start it (Windows: Services → MySQL80; macOS: `brew services start mysql`).
- **`Access denied for user 'root'`** → wrong `DB_PASSWORD` in `.env`.
- **Email not sending** → use a Gmail **App Password**, not your normal password.
  Leave the mail vars blank to disable email; the app still works.
- **Port already in use** → change `PORT` in `.env`.

Enjoy your Smart Campus CCMS! 🎓
