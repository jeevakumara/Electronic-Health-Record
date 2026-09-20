/**
 * Database connectivity & schema verification test script
 * Run with: npm run test:db
 */
const db = require('../src/config/db');

async function testDatabase() {
  console.log('--- Testing MariaDB Connection ---');
  console.log(`Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
  console.log(`Database: ${process.env.DB_NAME}`);
  console.log(`User: ${process.env.DB_USER}`);

  try {
    const isConnected = await db.testConnection();
    if (!isConnected) {
      console.error('\n❌ Could not connect to MariaDB.');
      console.log('Please verify:');
      console.log('1. MariaDB service is running on port ' + (process.env.DB_PORT || '3306'));
      console.log('2. Credentials in .env match your MariaDB server');
      console.log('3. You have run database/schema.sql in HeidiSQL or your SQL client\n');
      process.exit(1);
    }

    console.log('✅ Connection to MariaDB succeeded!');

    // Check tables
    const tables = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = ?
    `, [process.env.DB_NAME || 'temporal_ehr']);

    console.log('\nFound tables in database:');
    const tableNames = tables.map(t => t.table_name || t.TABLE_NAME);
    console.log(tableNames.length > 0 ? tableNames : '(No tables found yet. Please run database/schema.sql)');

    // Check system versioning on prescriptions table
    if (tableNames.includes('prescriptions')) {
      const versioningCheck = await db.query(`
        SELECT TABLE_NAME, TABLE_TYPE 
        FROM information_schema.tables 
        WHERE table_schema = ? AND table_name = 'prescriptions'
      `, [process.env.DB_NAME || 'temporal_ehr']);
      console.log('\nTable "prescriptions" status:', versioningCheck);
    }

  } catch (err) {
    console.error('\n❌ Error during database test:', err.message);
  } finally {
    try {
      await db.pool.end();
    } catch (_) {}
    process.exit(0);
  }
}

testDatabase();
