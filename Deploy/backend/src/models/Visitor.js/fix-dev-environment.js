#!/usr/bin/env node

/**
 * ULT FPEB - Development Environment Checker & Fixer
 * Ensures proper environment configuration for development
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔧 ULT FPEB Development Environment Checker\n');

// Check frontend environment
const frontendEnvPath = join(__dirname, 'frontend', '.env');
const frontendProdEnvPath = join(__dirname, 'frontend', '.env.production');

console.log('📁 Checking frontend environment...');

if (existsSync(frontendEnvPath)) {
    const envContent = readFileSync(frontendEnvPath, 'utf8');
    console.log('✅ Frontend .env file exists');
    
    if (envContent.includes('localhost:3001')) {
        console.log('✅ Frontend configured for localhost:3001');
    } else {
        console.log('⚠️  Frontend not configured for localhost:3001');
        
        // Fix the environment
        const correctEnv = `# Environment variables for ULT FPEB Frontend - Development  
VITE_API_URL=http://localhost:3001/api
VITE_APP_TITLE=ULT FPEB - Visitor Management
VITE_ENABLE_DEBUG=true
`;
        writeFileSync(frontendEnvPath, correctEnv);
        console.log('✅ Fixed frontend .env file');
    }
} else {
    console.log('❌ Frontend .env file missing - creating...');
    const correctEnv = `# Environment variables for ULT FPEB Frontend - Development  
VITE_API_URL=http://localhost:3001/api
VITE_APP_TITLE=ULT FPEB - Visitor Management
VITE_ENABLE_DEBUG=true
`;
    writeFileSync(frontendEnvPath, correctEnv);
    console.log('✅ Created frontend .env file');
}

// Check production environment
if (existsSync(frontendProdEnvPath)) {
    const prodEnvContent = readFileSync(frontendProdEnvPath, 'utf8');
    if (prodEnvContent.includes('your-server-ip')) {
        console.log('ℹ️  Production .env contains placeholder (normal for development)');
    }
}

// Check backend environment
const backendEnvPath = join(__dirname, 'backend', '.env');
const backendExamplePath = join(__dirname, 'backend', '.env.example');

console.log('\n📁 Checking backend environment...');

if (existsSync(backendEnvPath)) {
    console.log('✅ Backend .env file exists');
} else if (existsSync(backendExamplePath)) {
    console.log('⚠️  Backend .env missing - copying from example...');
    const exampleContent = readFileSync(backendExamplePath, 'utf8');
    writeFileSync(backendEnvPath, exampleContent);
    console.log('✅ Created backend .env from example');
    console.log('⚠️  Please update database credentials in backend/.env');
} else {
    console.log('❌ Backend .env.example not found');
}

console.log('\n🚀 Development Environment Summary:');
console.log('━'.repeat(50));
console.log('Frontend: http://localhost:5173 (Development)');
console.log('Backend:  http://localhost:3001 (API)');
console.log('Health:   http://localhost:3001/api/health');
console.log('\n📝 To start development:');
console.log('1. cd backend && npm run dev');
console.log('2. cd frontend && npm run dev');
console.log('3. Open http://localhost:5173 in browser');

console.log('\n✅ Environment check complete!');
