-- Smart Campus Complaint Management System - Database Schema
-- Run this file ONCE in MySQL before starting the server.
-- In MySQL Workbench / CLI:  source database/schema.sql;

CREATE DATABASE IF NOT EXISTS campus_ccms
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE campus_ccms;

-- ---------------------------------------------------------------
-- USERS
-- role: student | staff | admin
-- department is required for staff (the dept they handle) and
-- optional for students.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(120) NOT NULL,
  email        VARCHAR(160) NOT NULL UNIQUE,
  password     VARCHAR(255) NOT NULL,
  role         ENUM('student','staff','admin') NOT NULL DEFAULT 'student',
  department   VARCHAR(80)  DEFAULT NULL,
  phone        VARCHAR(20)  DEFAULT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- DEPARTMENTS (the ones complaints can be routed to)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS departments (
  id    INT AUTO_INCREMENT PRIMARY KEY,
  name  VARCHAR(80) NOT NULL UNIQUE
) ENGINE=InnoDB;

INSERT IGNORE INTO departments (name) VALUES
  ('Infrastructure'),
  ('Hostel'),
  ('Network/IT'),
  ('Cleanliness'),
  ('Academics'),
  ('Other');

-- ---------------------------------------------------------------
-- COMPLAINTS
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS complaints (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  title         VARCHAR(160) NOT NULL,
  description   TEXT NOT NULL,
  category      VARCHAR(80)  NOT NULL,        -- == departments.name
  location      VARCHAR(160) DEFAULT NULL,
  priority      ENUM('Low','Medium','High') NOT NULL DEFAULT 'Medium',
  status        ENUM('Pending','In Progress','Resolved') NOT NULL DEFAULT 'Pending',
  user_id       INT NOT NULL,                 -- who raised it
  assigned_to   INT DEFAULT NULL,             -- staff user id
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_complaints_user FOREIGN KEY (user_id)     REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_complaints_assg FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- HISTORY / AUDIT TRAIL
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS complaint_history (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  complaint_id  INT NOT NULL,
  action        VARCHAR(120) NOT NULL,
  note          VARCHAR(255) DEFAULT NULL,
  actor_id      INT DEFAULT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_hist_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  CONSTRAINT fk_hist_actor     FOREIGN KEY (actor_id)     REFERENCES users(id)      ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- NOTIFICATIONS (in-app bell)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  message     VARCHAR(255) NOT NULL,
  is_read     TINYINT(1) NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- DEFAULT ADMIN
-- email: admin@campus.edu     password: Admin@123
-- (bcrypt hash of 'Admin@123')
-- ---------------------------------------------------------------
INSERT IGNORE INTO users (name, email, password, role, department)
VALUES ('Campus Admin', 'admin@campus.edu',
        12345, 'admin', NULL);

USE campus_ccms;
  SHOW TABLES;
