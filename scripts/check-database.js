import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from backend directory
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

async function checkDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  });

  try {
    console.log('🔍 Checking current database structure...');
    console.log('📋 Environment variables:');
    console.log('  DB_HOST:', process.env.DB_HOST || 'localhost');
    console.log('  DB_USER:', process.env.DB_USER || 'root');
    console.log('  DB_NAME:', process.env.DB_NAME || 'ult_fpeb_dev');
    console.log('  DB_PASSWORD:', process.env.DB_PASSWORD ? '[SET]' : '[EMPTY]');
    
    const dbName = process.env.DB_NAME || 'ult_fpeb_dev';
    
    // Check if database exists
    const [databases] = await connection.execute('SHOW DATABASES');
    const dbExists = databases.some(db => Object.values(db)[0] === dbName);
    
    console.log('\n📊 Available databases:');
    databases.forEach(db => {
      const name = Object.values(db)[0];
      console.log('  - ' + name + (name === dbName ? ' ← TARGET' : ''));
    });
    
    if (!dbExists) {
      console.log('\n❌ Target database does not exist:', dbName);
      console.log('💡 Need to create database first');
      return { exists: false, tables: [], structure: {} };
    }
    
    console.log('\n✅ Database exists:', dbName);
    
    // Use the database
    await connection.execute(`USE \`${dbName}\``);
    
    // Get all tables
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('\n📋 Current tables (' + tables.length + '):');
    
    const tableNames = [];
    const tableStructure = {};
    
    if (tables.length === 0) {
      console.log('  ⚠️ No tables found in database');
    } else {
      for (let i = 0; i < tables.length; i++) {
        const tableName = Object.values(tables[i])[0];
        tableNames.push(tableName);
        console.log(`  ${i + 1}. ${tableName}`);
        
        // Get table structure
        const [columns] = await connection.execute(`DESCRIBE \`${tableName}\``);
        tableStructure[tableName] = columns.map(col => ({
          field: col.Field,
          type: col.Type,
          null: col.Null,
          key: col.Key,
          default: col.Default,
          extra: col.Extra
        }));
      }
      
      // Check row counts
      console.log('\n📊 Table row counts:');
      for (const tableName of tableNames) {
        try {
          const [count] = await connection.execute(`SELECT COUNT(*) as count FROM \`${tableName}\``);
          console.log('  ' + tableName + ': ' + count[0].count + ' rows');
        } catch (error) {
          console.log('  ' + tableName + ': ERROR - ' + error.message);
        }
      }
      
      // Show key table structures
      const keyTables = ['users', 'visitors', 'complaints', 'feedbacks', 'lost_items'];
      for (const tableName of keyTables) {
        if (tableNames.includes(tableName)) {
          console.log(`\n🔍 Structure of ${tableName}:`);
          tableStructure[tableName].forEach(col => {
            const nullable = col.null === 'YES' ? 'NULL' : 'NOT NULL';
            const keyInfo = col.key ? ` [${col.key}]` : '';
            const extra = col.extra ? ` ${col.extra}` : '';
            console.log(`  - ${col.field}: ${col.type} ${nullable}${keyInfo}${extra}`);
          });
        }
      }
    }
    
    return { 
      exists: true, 
      tables: tableNames, 
      structure: tableStructure,
      rowCounts: {}
    };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkDatabase()
    .then((result) => {
      console.log('\n✅ Database check completed');
      if (!result.exists) {
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ Database check failed:', error.message);
      process.exit(1);
    });
}

export default checkDatabase;