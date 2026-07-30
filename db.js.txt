const { Pool } = require('pg');

// Initialize PostgreSQL Connection Pool using DATABASE_URL environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test Database Connection & Create Tables on Startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error connecting to PostgreSQL:', err.stack);
  } else {
    console.log('✅ Connected to PostgreSQL database successfully!');
    release();
  }
});

// Helper wrapper for queries to keep standard interface
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};