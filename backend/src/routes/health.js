import express from 'express';
import db from '../config/database.js';

const router = express.Router();

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    // Test database connection
    await db.execute('SELECT 1');
    
    // Check if users table exists
    const [tables] = await db.execute(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'",
      [process.env.DB_NAME || 'ult_fpeb_prod']
    );
    
    // Check JWT_SECRET
    const hasJwtSecret = !!process.env.JWT_SECRET;
    
    // Check user count
    const [userCount] = await db.execute('SELECT COUNT(*) as count FROM users');
    
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'connected',
        usersTable: tables.length > 0 ? 'exists' : 'missing',
        jwtSecret: hasJwtSecret ? 'configured' : 'missing',
        userCount: userCount[0].count,
        environment: process.env.NODE_ENV || 'development'
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Simple ping endpoint
router.get('/ping', (req, res) => {
  res.json({
    success: true,
    message: 'pong',
    timestamp: new Date().toISOString()
  });
});

// Database connection test
router.get('/db-test', async (req, res) => {
  try {
    const [result] = await db.execute('SELECT NOW() as current_time, DATABASE() as database_name');
    res.json({
      success: true,
      message: 'Database connection successful',
      data: result[0]
    });
  } catch (error) {
    console.error('Database test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

export default router;