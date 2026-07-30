require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { Server } = require('socket.io');
const nodemailer = require('nodemailer');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

// 1. Initialize SQLite Database
const path = require('path');
const fs = require('fs');

// 1. Initialize SQLite Database (Auto-detects Render Persistent Disk)
const renderDiskPath = '/data';
let dbPath = './surveillance.db';

if (process.env.RENDER && fs.existsSync(renderDiskPath)) {
  dbPath = path.join(renderDiskPath, 'surveillance.db');
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("❌ Database connection error:", err.message);
  else console.log(`💾 Connected to SQLite Database at: ${dbPath}`);
});

// Create tables if they don't exist
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS cameras (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    locationType TEXT,
    rtspUrl TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS evidence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cameraName TEXT,
    locationType TEXT,
    alertType TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    email TEXT
  )`);

  // Insert default webcam camera if table is empty
  db.get(`SELECT COUNT(*) as count FROM cameras`, (err, row) => {
    if (row && row.count === 0) {
      db.run(`INSERT INTO cameras (name, locationType, rtspUrl) VALUES ('Integrated Camera', 'Main Entrance', '0')`);
    }
  });
});

// 2. Configure Nodemailer Transporter for Gmail SMTP
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // TLS
  requireTLS: true,
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD
  }
});

// Helper function to send email alert
function sendEmailAlert(recipientEmail, alertData) {
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD || !recipientEmail) {
    console.log("⚠️ Skipping email: Missing SMTP credentials or recipient email.");
    return;
  }

  const mailOptions = {
    from: `"AI CCTV Security" <${process.env.SMTP_EMAIL}>`,
    to: recipientEmail,
    subject: `🚨 CRITICAL SECURITY ALERT: ${alertData.alertType}`,
    html: `
      <h2>🚨 Security Incident Detected</h2>
      <p><strong>Camera:</strong> ${alertData.cameraName}</p>
      <p><strong>Location:</strong> ${alertData.locationType}</p>
      <p><strong>Threat Level / Alert:</strong> <span style="color: red;">${alertData.alertType}</span></p>
      <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      <hr />
      <p>Please check your surveillance dashboard immediately.</p>
    `
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("❌ SMTP Email Error:", error.message);
    } else {
      console.log("📧 Email Alert Sent Successfully:", info.response);
    }
  });
}

// --- API ENDPOINTS ---

// GET All Cameras
app.get('/api/cameras', (req, res) => {
  db.all(`SELECT * FROM cameras`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// ADD Camera
app.post('/api/cameras', (req, res) => {
  const { name, locationType, rtspUrl } = req.body;
  db.run(`INSERT INTO cameras (name, locationType, rtspUrl) VALUES (?, ?, ?)`,
    [name, locationType, rtspUrl], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name, locationType, rtspUrl });
    });
});

// DELETE Camera
app.delete('/api/cameras/:id', (req, res) => {
  db.run(`DELETE FROM cameras WHERE id = ?`, [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// GET Evidence Logs
app.get('/api/evidence', (req, res) => {
  db.all(`SELECT * FROM evidence ORDER BY timestamp DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// POST New Alert (Called by detector.py when threat is detected)
app.post('/api/alerts', (req, res) => {
  const { cameraName, locationType, alertType } = req.body;
  const timestamp = new Date().toISOString();

  // Save to SQLite Evidence Database
  db.run(`INSERT INTO evidence (cameraName, locationType, alertType, timestamp) VALUES (?, ?, ?, ?)`,
    [cameraName || "Webcam 01", locationType || "Main Feed", alertType, timestamp],
    function (err) {
      if (err) {
        console.error("❌ Error saving evidence log:", err.message);
        return res.status(500).json({ error: err.message });
      }

      const newLog = {
        id: this.lastID,
        cameraName: cameraName || "Webcam 01",
        locationType: locationType || "Main Feed",
        alertType,
        timestamp
      };

      console.log(`🚨 Threat Alert Saved: [${alertType}] on camera [${newLog.cameraName}]`);

      // 1. Broadcast to React UI via Socket.io
      io.emit('new-alert', newLog);

      // 2. Fetch configured alert email & dispatch SMTP alert
      db.get(`SELECT email FROM settings WHERE id = 1`, (err, row) => {
        if (row && row.email) {
          sendEmailAlert(row.email, newLog);
        }
      });

      res.status(201).json({ status: "Alert logged & broadcasted", log: newLog });
    });
});

// GET Settings
app.get('/api/settings', (req, res) => {
  db.get(`SELECT email FROM settings WHERE id = 1`, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row || { email: '' });
  });
});

// POST Settings (Save Recipient Email)
app.post('/api/settings', (req, res) => {
  const { email } = req.body;
  db.run(`INSERT INTO settings (id, email) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET email = excluded.email`,
    [email], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      console.log(`✉️ Recipient alert email updated to: ${email}`);
      res.json({ success: true, email });
    });
});

// Start Server on Port 5000
server.listen(5000, () => {
  console.log("🚀 CCTV Backend API Running on http://localhost:5000");
});