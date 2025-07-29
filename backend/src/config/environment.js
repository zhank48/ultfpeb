import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Smart environment loader for ULT FPEB
 * Automatically loads the correct environment configuration
 */
export function loadEnvironment() {
  const backendDir = path.resolve(__dirname, '..');
  
  // Determine environment
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  // Environment file priority:
  // 1. .env.local (highest priority, ignored by git)
  // 2. .env.development or .env.production
  // 3. .env (fallback)
  
  const envFiles = [
    `.env.local`,
    `.env.${nodeEnv}`,
    '.env'
  ];
  
  console.log(`🔧 Loading environment for: ${nodeEnv}`);
  
  // Load environment files in order of priority
  for (const envFile of envFiles) {
    const envPath = path.join(backendDir, envFile);
    
    if (fs.existsSync(envPath)) {
      console.log(`📁 Loading: ${envFile}`);
      dotenv.config({ path: envPath });
    }
  }
  
  // Validate required environment variables
  const requiredVars = [
    'PORT',
    'DB_HOST',
    'DB_NAME',
    'DB_USER',
    'JWT_SECRET'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars);
    console.error('💡 Make sure you have proper .env files configured');
    process.exit(1);
  }
  
  // Set defaults for optional variables
  process.env.DEBUG = process.env.DEBUG || (nodeEnv === 'development' ? 'true' : 'false');
  process.env.LOG_LEVEL = process.env.LOG_LEVEL || (nodeEnv === 'development' ? 'debug' : 'info');
  process.env.UPLOAD_PATH = process.env.UPLOAD_PATH || 'uploads/';
  process.env.MAX_FILE_SIZE = process.env.MAX_FILE_SIZE || '10mb';
  
  // Log configuration summary
  console.log(`✅ Environment loaded successfully`);
  console.log(`📊 Configuration summary:`);
  console.log(`   - Environment: ${nodeEnv}`);
  console.log(`   - Port: ${process.env.PORT}`);
  console.log(`   - Database: ${process.env.DB_NAME}@${process.env.DB_HOST}`);
  console.log(`   - Frontend URL: ${process.env.FRONTEND_URL}`);
  console.log(`   - Debug mode: ${process.env.DEBUG}`);
  console.log(`   - Upload path: ${process.env.UPLOAD_PATH}`);
  
  return {
    nodeEnv,
    port: process.env.PORT,
    database: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      name: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || ''
    },
    jwt: {
      secret: process.env.JWT_SECRET
    },
    cors: {
      frontendUrl: process.env.FRONTEND_URL,
      allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || []
    },
    upload: {
      path: process.env.UPLOAD_PATH,
      maxSize: process.env.MAX_FILE_SIZE,
      maxFiles: parseInt(process.env.UPLOAD_MAX_FILES) || 5
    },
    debug: process.env.DEBUG === 'true',
    logLevel: process.env.LOG_LEVEL
  };
}
