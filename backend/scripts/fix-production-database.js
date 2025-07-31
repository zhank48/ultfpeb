#!/usr/bin/env node

/**
 * Production Database Fix Script
 * Script untuk memperbaiki masalah database yang menyebabkan error 500/401/403
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

async function executeSQLFile(filePath) {
  try {
    log(`📂 Reading SQL file: ${filePath}`, 'blue');
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    
    // Split SQL content by semicolons and filter out empty statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    log(`📝 Found ${statements.length} SQL statements to execute`, 'cyan');
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          log(`⚡ Executing statement ${i + 1}/${statements.length}`, 'yellow');
          const [result] = await db.execute(statement);
          
          // If result has a message field, display it
          if (Array.isArray(result) && result.length > 0 && result[0].message) {
            log(`   ${result[0].message}`, 'green');
          }
        } catch (error) {
          if (error.code === 'ER_DUP_FIELDNAME') {
            log(`   ⚠️  Column already exists, skipping...`, 'yellow');
          } else if (error.code === 'ER_TABLE_EXISTS_ERROR') {
            log(`   ⚠️  Table already exists, skipping...`, 'yellow');
          } else {
            log(`   ❌ Error executing statement: ${error.message}`, 'red');
            // Don't throw, continue with next statement
          }
        }
      }
    }
    
    return true;
  } catch (error) {
    log(`❌ Error reading/executing SQL file ${filePath}: ${error.message}`, 'red');
    return false;
  }
}

async function checkDatabaseConnection() {
  try {
    log('🔌 Testing database connection...', 'blue');
    const [result] = await db.execute('SELECT 1 as test');
    log('✅ Database connection successful!', 'green');
    return true;
  } catch (error) {
    log(`❌ Database connection failed: ${error.message}`, 'red');
    return false;
  }
}

async function verifyFixes() {
  try {
    log('🔍 Verifying database fixes...', 'blue');
    
    // Check if checkout columns exist
    const [checkoutColumns] = await db.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'visitors' 
      AND COLUMN_NAME IN ('checkout_by_name', 'checkout_by_role', 'checkout_by_avatar', 'checkout_by_user_id')
    `);
    
    log(`   Found ${checkoutColumns.length}/4 checkout columns`, 'cyan');
    
    // Check if visitor_edit_history table exists
    const [editHistoryTable] = await db.execute(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'visitor_edit_history'
    `);
    
    const hasEditHistoryTable = editHistoryTable[0].count > 0;
    log(`   Visitor edit history table: ${hasEditHistoryTable ? '✅ EXISTS' : '❌ MISSING'}`, hasEditHistoryTable ? 'green' : 'red');
    
    return checkoutColumns.length >= 4 && hasEditHistoryTable;
  } catch (error) {
    log(`❌ Error verifying fixes: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  log('🚀 Starting Production Database Fix Script', 'bright');
  log('=' * 50, 'cyan');
  
  // Check database connection
  const connected = await checkDatabaseConnection();
  if (!connected) {
    log('❌ Cannot proceed without database connection', 'red');
    process.exit(1);
  }
  
  // Execute the main fix script
  const sqlDir = path.join(__dirname, '..', 'sql');
  const fixScript = path.join(sqlDir, 'production_database_fix.sql');
  
  if (!fs.existsSync(fixScript)) {
    log(`❌ SQL fix script not found: ${fixScript}`, 'red');
    process.exit(1);
  }
  
  log('🔧 Executing database fixes...', 'blue');
  const success = await executeSQLFile(fixScript);
  
  if (success) {
    log('✅ Database fix script executed successfully!', 'green');
    
    // Verify the fixes
    const verified = await verifyFixes();
    
    if (verified) {
      log('🎉 All database fixes verified successfully!', 'green');
      log('', 'reset');
      log('Next Steps:', 'bright');
      log('1. Restart your Node.js application (pm2 restart ult-fpeb)', 'cyan');
      log('2. Test visitor checkout functionality', 'cyan');
      log('3. Test login and password change functionality', 'cyan');
      log('4. Monitor error logs for any remaining issues', 'cyan');
    } else {
      log('⚠️  Some fixes may not have been applied correctly', 'yellow');
      log('   Please check the output above and run the script again if needed', 'yellow');
    }
  } else {
    log('❌ Database fix script failed', 'red');
    process.exit(1);
  }
  
  // Close database connection
  await db.end();
  log('👋 Database fix script completed', 'green');
}

// Handle script execution
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    log(`💥 Unhandled error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  });
}

export default main;