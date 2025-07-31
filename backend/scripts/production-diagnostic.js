#!/usr/bin/env node

/**
 * Production Server Diagnostic Script
 * Checks common issues that cause 502 Bad Gateway errors
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 ULT FPEB Production Diagnostic Tool');
console.log('=====================================\n');

// Load environment variables
function loadEnvFile() {
  const envPath = join(__dirname, '../.env');
  
  console.log('1. Checking environment configuration...');
  
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found at:', envPath);
    console.log('💡 Copy .env.example to .env and configure it');
    return false;
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, value] = line.split('=');
      if (key && value) {
        envVars[key.trim()] = value.trim();
      }
    }
  });
  
  // Check required variables
  const requiredVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'JWT_SECRET'];
  const missingVars = requiredVars.filter(key => !envVars[key]);
  
  if (missingVars.length > 0) {
    console.log('❌ Missing required environment variables:', missingVars.join(', '));
    return false;
  }
  
  console.log('✅ Environment file found and configured');
  
  // Set environment variables
  Object.keys(envVars).forEach(key => {
    process.env[key] = envVars[key];
  });
  
  return true;
}

// Test database connection
async function testDatabase() {
  console.log('\n2. Testing database connection...');
  
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ult_fpeb_prod'
    });
    
    // Test basic query
    const [rows] = await connection.execute('SELECT NOW() as current_time, DATABASE() as database_name');
    console.log('✅ Database connection successful');
    console.log(`📊 Connected to: ${rows[0].database_name} at ${rows[0].current_time}`);
    
    // Check users table
    try {
      const [userRows] = await connection.execute('SELECT COUNT(*) as count FROM users');
      console.log(`👥 Users table: ${userRows[0].count} users found`);
    } catch (error) {
      console.log('❌ Users table not found or inaccessible');
      console.log('💡 Run: mysql -u root -p ult_fpeb_prod < backend/sql/fix_auth_issues.sql');
    }
    
    await connection.end();
    return true;
    
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
    console.log('💡 Check database credentials and ensure MySQL is running');
    return false;
  }
}

// Check server dependencies
function checkDependencies() {
  console.log('\n3. Checking server dependencies...');
  
  const packagePath = join(__dirname, '../package.json');
  if (!fs.existsSync(packagePath)) {
    console.log('❌ package.json not found');
    return false;
  }
  
  const nodeModulesPath = join(__dirname, '../node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    console.log('❌ node_modules not found');
    console.log('💡 Run: npm install');
    return false;
  }
  
  console.log('✅ Dependencies installed');
  return true;
}

// Check server ports
function checkPorts() {
  console.log('\n4. Checking port configuration...');
  
  const port = process.env.PORT || 3001;
  console.log(`📡 Server configured to run on port: ${port}`);
  
  // Note: We can't actually test if port is in use from this script
  // without starting a server, so we just show the config
  console.log('💡 Ensure this port is available and not blocked by firewall');
  
  return true;
}

// Generate startup script
function generateStartupScript() {
  console.log('\n5. Generating startup commands...');
  
  const commands = [
    '#!/bin/bash',
    'echo "Starting ULT FPEB Backend..."',
    '',
    '# Ensure we\'re in the correct directory',
    'cd /opt/ult-fpeb',
    '',
    '# Pull latest changes',
    'git pull origin main',
    '',
    '# Install/update dependencies',
    'npm install',
    'cd backend && npm install',
    'cd ..',
    '',
    '# Run database fixes',
    'mysql -u root -p ult_fpeb_prod < backend/sql/fix_auth_issues.sql',
    'mysql -u root -p ult_fpeb_prod < backend/sql/fix_location_column.sql',
    'mysql -u root -p ult_fpeb_prod < backend/sql/create_configuration_tables.sql',
    '',
    '# Start/restart with PM2',
    'pm2 restart ult-fpeb-backend || pm2 start ecosystem.config.cjs',
    '',
    '# Show status',
    'pm2 status',
    'pm2 logs ult-fpeb-backend --lines 20',
    '',
    'echo "Startup complete!"'
  ];
  
  const scriptPath = join(__dirname, '../start-production.sh');
  fs.writeFileSync(scriptPath, commands.join('\n'), { mode: 0o755 });
  
  console.log('✅ Startup script generated at:', scriptPath);
  console.log('💡 Run: chmod +x start-production.sh && ./start-production.sh');
  
  return true;
}

// Main diagnostic function
async function runDiagnostic() {
  let allGood = true;
  
  allGood &= loadEnvFile();
  allGood &= await testDatabase();
  allGood &= checkDependencies();
  allGood &= checkPorts();
  allGood &= generateStartupScript();
  
  console.log('\n📋 Diagnostic Summary');
  console.log('====================');
  
  if (allGood) {
    console.log('✅ All checks passed! Server should start successfully.');
    console.log('\n🚀 Next steps:');
    console.log('1. Run the generated startup script');
    console.log('2. Test endpoints: curl http://localhost:3001/api/health');
    console.log('3. Check PM2 logs: pm2 logs ult-fpeb-backend');
  } else {
    console.log('❌ Some issues found. Please fix them before starting the server.');
  }
}

// Run the diagnostic
runDiagnostic().catch(console.error);