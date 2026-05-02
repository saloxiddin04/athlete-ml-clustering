const { pool, initDB } = require('./db');

async function migrate() {
  console.log('🔄 Starting Database Migration...');
  try {
    // We drop the table and recreate it with the correct DECIMAL types
    await pool.query('DROP TABLE IF EXISTS participants CASCADE');
    await initDB();
    console.log('✅ Migration Successful! The table is now ready for decimal values.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration Failed:', err.message);
    process.exit(1);
  }
}

migrate();
