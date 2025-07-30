#!/usr/bin/env node

/**
 * Fix PM2 Configuration for ES Modules
 * This script fixes PM2 ecosystem.config.js to work with ES modules
 */

import { writeFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';

const workingDir = process.cwd();

const pm2Config = {
  apps: [{
    name: 'ult-fpeb-backend',
    script: './backend/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      HOST: '0.0.0.0'
    },
    error_file: './backend/logs/err.log',
    out_file: './backend/logs/out.log',
    log_file: './backend/logs/combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm Z'
  }]
};

console.log('🔧 Fixing PM2 Configuration...');

// Remove old config if exists
const oldConfigPath = join(workingDir, 'ecosystem.config.js');
if (existsSync(oldConfigPath)) {
  unlinkSync(oldConfigPath);
  console.log('✅ Removed old ecosystem.config.js');
}

// Create new CommonJS config
const newConfigPath = join(workingDir, 'ecosystem.config.cjs');
const configContent = `module.exports = ${JSON.stringify(pm2Config, null, 2)};`;

writeFileSync(newConfigPath, configContent);
console.log('✅ Created ecosystem.config.cjs');

console.log(`
🚀 PM2 Configuration Fixed!

To use this configuration:
1. pm2 start ecosystem.config.cjs
2. pm2 save
3. pm2 startup

Configuration created at: ${newConfigPath}
`);
