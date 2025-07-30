import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, 'backend', '.env') });

async function checkDatabaseStructure() {
  let connection;
  
  try {
    console.log('🔍 Checking database structure...\n');
    
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ult_fpeb_dev'
    });
    
    console.log('✅ Connected to database:', process.env.DB_NAME || 'ult_fpeb_dev');
    
    // Check if visitors table exists
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'visitors'"
    );
    
    if (tables.length === 0) {
      console.log('❌ Table "visitors" does not exist');
      return;
    }
    
    console.log('✅ Table "visitors" exists');
    
    // Get table structure
    const [columns] = await connection.execute(
      "DESCRIBE visitors"
    );
    
    console.log('\n📋 Table structure:');
    console.log('Field                | Type                 | Null | Key | Default     | Extra');
    console.log('---------------------|---------------------|------|-----|-------------|-------');
    
    columns.forEach(col => {
      const field = col.Field.padEnd(20);
      const type = col.Type.padEnd(20);
      const nullable = col.Null.padEnd(5);
      const key = col.Key.padEnd(4);
      const defaultVal = (col.Default || 'NULL').toString().padEnd(12);
      const extra = col.Extra || '';
      
      console.log(`${field}| ${type}| ${nullable}| ${key}| ${defaultVal}| ${extra}`);
    });
    
    // Check for location field specifically
    const locationField = columns.find(col => col.Field === 'location');
    if (locationField) {
      console.log('\n🎯 Location field details:');
      console.log('- Type:', locationField.Type);
      console.log('- Null:', locationField.Null);
      console.log('- Default:', locationField.Default || 'NULL');
      console.log('- Extra:', locationField.Extra || 'None');
    } else {
      console.log('\n❌ Location field not found in table');
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkDatabaseStructure();