import db from '../src/config/database.js';

async function checkDeletionRequestsTable() {
  try {
    const [rows] = await db.execute('DESCRIBE deletion_requests');
    console.log('🔍 DELETION_REQUESTS TABLE STRUCTURE:');
    rows.forEach(row => {
      console.log(`   ${row.Field}: ${row.Type} (${row.Null}) ${row.Key ? '[' + row.Key + ']' : ''} ${row.Default !== null ? 'DEFAULT ' + row.Default : ''}`);
    });
    
    const [data] = await db.execute('SELECT COUNT(*) as count FROM deletion_requests');
    console.log(`📊 Total deletion requests: ${data[0].count}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkDeletionRequestsTable();