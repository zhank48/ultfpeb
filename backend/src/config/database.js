import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from backend directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Debug environment variables
console.log('🔍 Database Configuration Debug:');
console.log('DB_HOST:', process.env.DB_HOST || 'localhost');
console.log('DB_USER:', process.env.DB_USER || 'NOT_SET');
console.log('DB_NAME:', process.env.DB_NAME || 'ult_fpeb_db');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '[HIDDEN]' : 'NOT_SET');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ult_fpeb_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00',
  charset: 'utf8mb4'
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
export const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

export default pool;
