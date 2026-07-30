const express = require('express');
const cors = require('cors');
const db = require('./db'); // Imports the PostgreSQL pool from db.js

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Sample Health Check Route
app.get('/api/health', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({ status: 'ok', db_time: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Example API Endpoint to Fetch Cameras
app.get('/api/cameras', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM cameras');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});