const mariadb = require('mariadb');
require('dotenv').config();

// Create connection pool with environment parameters
const pool = mariadb.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'temporal_ehr',
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
  allowPublicKeyRetrieval: true,
  bigIntAsNumber: true,
  // Convert MariaDB DATETIME/TIMESTAMP objects to standard ISO strings
  dateStrings: true
});

/**
 * Execute a SQL query with parameter binding using pool connection
 * @param {string} sql - SQL query string
 * @param {Array} params - Array of parameters
 * @returns {Promise<any>} Query results
 */
async function query(sql, params = []) {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(sql, params);
    return result;
  } catch (err) {
    console.error('Database Query Error:', err.message);
    throw err;
  } finally {
    if (conn) conn.release();
  }
}

/**
 * Test connectivity to MariaDB
 * @returns {Promise<boolean>}
 */
async function testConnection() {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query('SELECT 1 AS connected');
    return true;
  } catch (err) {
    return false;
  } finally {
    if (conn) conn.release();
  }
}

module.exports = {
  pool,
  query,
  testConnection
};
