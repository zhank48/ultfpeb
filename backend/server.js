import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment configuration first
import { loadEnvironment } from './src/config/environment.js';
const config = loadEnvironment();

// Import routes
import authRoutes from './src/routes/auth.js';
import userRoutes from './src/routes/users.js';
import visitorRoutes from './src/routes/visitors.js';
import feedbackRoutes from './src/routes/feedback.js';
import dashboardRoutes from './src/routes/dashboard.js';

import reportsRoutes from './src/routes/reports.js';
import configurationsRoutes from './src/routes/configurations.js';
import complaintsRoutes from './src/routes/complaints.js';
import complaintManagementRoutes from './src/routes/complaint-management.js';
import lostItemsRoutes from './src/routes/lost-items.js';
import visitorManagementRoutes from './src/routes/visitorManagement.js';
import visitorActionsRoutes from './src/routes/visitorActions.js';
import deletionRequestsRoutes from './src/routes/deletionRequests.js';
import healthRoutes from './src/routes/health.js';

// Import database connection
import { testConnection } from './src/config/database.js';

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = config.port;

// Trust proxy only for specific proxies (Nginx localhost)
app.set('trust proxy', 'loopback');

// Security middleware with relaxed CSP for development
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      objectSrc: ["'none'"],
      imgSrc: ["'self'", "data:", "http:", "https:", "blob:", "*"], // Very permissive for debugging
      connectSrc: ["'self'", "http:", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      mediaSrc: ["'self'", "data:", "*"],
      frameSrc: ["'self'"],
    },
  },
  crossOriginResourcePolicy: false // Disable for debugging
}));

// CORS configuration - MUST be applied before rate limiting
const allowedOrigins = config.cors.allowedOrigins.length > 0 
  ? config.cors.allowedOrigins 
  : [
      'http://localhost:5173',
      'http://localhost:5174', 
      'http://localhost:5175',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:5175',
      config.cors.frontendUrl
    ].filter(Boolean);

app.use(cors({
  origin: true, // Allow all origins for development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200,
  exposedHeaders: ['Content-Disposition']
}));

// Handle preflight requests
app.options('*', cors());

// Rate limiting - more lenient for development and auth endpoints
const limiter = rateLimit({
  windowMs: parseInt(config.rateLimitWindowMs) || 15 * 60 * 1000, // 15 minutes
  max: config.nodeEnv === 'production' ? 500 : 1000, // Increased production limit
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip validation warnings for loopback proxy
  validate: false,
  skip: (req) => {
    // Skip rate limiting for health checks, auth endpoints, and CORS preflight requests
    return req.path === '/api/health' || 
           req.path === '/api/auth/login' || 
           req.path === '/api/auth/register' ||
           req.path === '/api/auth/refresh' ||
           req.path === '/api/auth/verify' ||
           req.method === 'OPTIONS' ||
           req.path.includes('/api/visitor-management/');
  }
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (uploaded images) with proper CORS and Content-Type headers
const uploadsPath = path.join(__dirname, 'uploads');
console.log(`📁 Serving static files from: ${uploadsPath}`);
app.use('/uploads', express.static(uploadsPath, {
  setHeaders: (res, filePath, stat) => {
    // Set permissive CORS headers for static files to allow all origins
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    // Set proper content type based on file extension
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        res.setHeader('Content-Type', 'image/jpeg');
        break;
      case '.png':
        res.setHeader('Content-Type', 'image/png');
        break;
      case '.gif':
        res.setHeader('Content-Type', 'image/gif');
        break;
      case '.svg':
        res.setHeader('Content-Type', 'image/svg+xml');
        break;
      case '.webp':
        res.setHeader('Content-Type', 'image/webp');
        break;
      case '.bmp':
        res.setHeader('Content-Type', 'image/bmp');
        break;
      default:
        // Don't set content-type for unknown files, let express.static handle it
        break;
    }
    
    // Debug logging
    console.log(`📁 Static file: ${path.basename(filePath)} | Content-Type: ${res.getHeader('Content-Type')} | Size: ${stat.size} bytes`);
  }
}));

// Also serve from backend/uploads for complaint photos and other uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath, stat) => {
    // Same CORS headers for consistency
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    res.setHeader('Cache-Control', 'public, max-age=3600');
  }
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use('/api/reports', reportsRoutes);
app.use('/api/configurations', configurationsRoutes);
app.use('/api/complaints', complaintsRoutes);
app.use('/api/complaint-management', complaintManagementRoutes);
app.use('/api/lost-items', lostItemsRoutes);
app.use('/api/visitor-management', visitorManagementRoutes);
app.use('/api/visitor-actions', visitorActionsRoutes);
app.use('/api/deletion-requests', deletionRequestsRoutes);

// Health check routes (no rate limiting)
app.use('/api', healthRoutes);

// Basic health check (legacy endpoint)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'ULT FPEB Backend is running',
    timestamp: new Date().toISOString()
  });
});

// Placeholder image endpoint
app.get('/uploads/placeholder.jpg', (req, res) => {
  const svg = `
    <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#475569"/>
      <text x="50%" y="50%" font-size="24" fill="white" text-anchor="middle" dy=".3em">ULT</text>
    </svg>
  `;
  
  // Set comprehensive CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  
  res.send(svg);
});

// General placeholder image endpoint
app.get('/api/placeholder/:width/:height', (req, res) => {
  const { width, height } = req.params;
  const text = req.query.text || 'ULT FPEB';
  
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#475569"/>
      <text x="50%" y="50%" font-size="48" fill="white" text-anchor="middle" dy=".3em">${text}</text>
    </svg>
  `;
  
  // Set comprehensive CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  
  res.send(svg);
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();
    
    const HOST = process.env.HOST || '0.0.0.0';
    
    app.listen(PORT, HOST, () => {
      console.log(`🚀 ULT FPEB Backend running on ${HOST}:${PORT}`);
      console.log(`📊 Health check: http://${HOST}:${PORT}/api/health`);
      console.log(`🌍 Environment: ${config.nodeEnv}`);
      console.log(`🔗 CORS allowed origins: ${allowedOrigins.join(', ')}`);
      console.log(`💾 Database: ${config.database.name}@${config.database.host}`);
      console.log(`📁 Upload path: ${config.upload.path}`);
      console.log(`🐛 Debug mode: ${config.debug ? 'enabled' : 'disabled'}`);
      
      // Show network access info
      if (HOST === '0.0.0.0') {
        console.log(`🌐 Server accessible from network on port ${PORT}`);
      }
      
      // Development-specific info
      if (config.nodeEnv === 'development') {
        console.log(`\n📝 Development URLs:`);
        console.log(`   Frontend: http://localhost:5173`);
        console.log(`   API: http://localhost:${PORT}/api`);
        console.log(`   Health: http://localhost:${PORT}/api/health`);
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
