import express from 'express';
import { body, validationResult } from 'express-validator';
import db from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Create feedback table if not exists
const createFeedbackTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS feedbacks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      visitor_id INT,
      complainant_name VARCHAR(255) NOT NULL,
      rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
      category ENUM('service', 'facility', 'process', 'overall', 'suggestion') DEFAULT 'service',
      feedback_text TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (visitor_id) REFERENCES visitors(id) ON DELETE SET NULL
    )
  `;
  
  try {
    await db.execute(query);
    console.log('✅ Feedbacks table ready');
  } catch (error) {
    console.error('❌ Error creating feedbacks table:', error);
  }
};

// Initialize table
createFeedbackTable();

// Create new feedback
router.post('/', [
  body('visitor_id').optional().isInt(),
  body('complainant_name').optional().isLength({ min: 2 }).trim(),
  body('visitor_name').optional().isLength({ min: 2 }).trim(),
  body('rating').isInt({ min: 1, max: 5 }),
  body('category').isInt({ min: 1 }),
  body('feedback_text').optional().trim()
], async (req, res) => {
  try {
    console.log('📝 Feedback submission attempt:', req.body);
    
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { visitor_id, complainant_name, visitor_name, rating, category, feedback_text } = req.body;
    const finalName = complainant_name || visitor_name;
    
    if (!finalName) {
      return res.status(400).json({
        success: false,
        message: 'Either complainant_name or visitor_name is required'
      });
    }
    
    console.log('✅ Validation passed, inserting feedback:', { visitor_id, finalName, rating, category, feedback_text });

    const query = `
      INSERT INTO feedbacks 
      (visitor_id, visitor_name, rating, category, feedback_text) 
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const [result] = await db.execute(query, [
      visitor_id || null,
      finalName,
      rating,
      category,
      feedback_text || null
    ]);

    console.log('✅ Feedback created successfully:', result.insertId);

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: {
        id: result.insertId,
        visitor_id,
        visitor_name: finalName,
        rating,
        category,
        feedback_text
      }
    });
  } catch (error) {
    console.error('❌ Create feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while submitting feedback',
      error: error.message
    });
  }
});

// Get all feedbacks (admin only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('📊 Feedback GET request received');
    console.log('User from token:', req.user);
    
    const { limit = '50', offset = '0', rating, category } = req.query;
    
    // Ensure proper integer conversion with validation
    const limitInt = Math.max(1, Math.min(parseInt(limit) || 50, 1000)); // Between 1-1000
    const offsetInt = Math.max(0, parseInt(offset) || 0); // At least 0
    
    console.log('📊 Converted params - limit:', limitInt, 'offset:', offsetInt);
    
    let query = 'SELECT * FROM feedbacks';
    let params = [];
    let conditions = [];

    if (rating && !isNaN(parseInt(rating))) {
      conditions.push('rating = ?');
      params.push(parseInt(rating));
    }

    if (category && typeof category === 'string') {
      conditions.push('category = ?');
      params.push(category);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    
    // Fix for MySQL parameter binding issue - use string interpolation for LIMIT/OFFSET
    const finalQuery = query.replace('LIMIT ? OFFSET ?', `LIMIT ${limitInt} OFFSET ${offsetInt}`);
    
    console.log('📊 Executing feedback query:', finalQuery);
    console.log('📊 Query params:', params);
    console.log('📊 Param types:', params.map(p => typeof p));
    
    const [rows] = await db.execute(finalQuery, params);
    console.log('📊 Feedback query result:', rows.length, 'rows');

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Get feedbacks error:', error);
    
    // Try a simpler query as fallback
    try {
      console.log('📊 Attempting fallback query without parameters');
      const [fallbackRows] = await db.execute('SELECT * FROM feedbacks ORDER BY created_at DESC LIMIT 20');
      console.log('📊 Fallback query successful:', fallbackRows.length, 'rows');
      
      res.json({
        success: true,
        data: fallbackRows,
        fallback: true
      });
    } catch (fallbackError) {
      console.error('📊 Fallback query also failed:', fallbackError);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching feedbacks',
        error: error.message
      });
    }
  }
});

// Public endpoint for testing (remove in production)
router.get('/public', async (req, res) => {
  try {
    console.log('📊 Public feedback endpoint accessed');
    
    // Simple query without parameters to avoid the SQL error
    const query = 'SELECT * FROM feedbacks ORDER BY created_at DESC LIMIT 20';
    console.log('📊 Executing public query:', query);
    
    const [rows] = await db.execute(query);
    console.log('📊 Public query result:', rows.length, 'rows');
    
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Public feedbacks error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching public feedbacks',
      error: error.message
    });
  }
});

// Get feedback statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // Get total count of feedbacks with ratings
    const [totalResult] = await db.execute(`
      SELECT COUNT(*) as total 
      FROM feedbacks 
      WHERE (rating IS NOT NULL OR overall_satisfaction_rating IS NOT NULL)
    `);
    const total = totalResult[0].total;

    // Get average rating (prioritize 'rating' field, fallback to 'overall_satisfaction_rating')
    const [avgResult] = await db.execute(`
      SELECT AVG(
        COALESCE(rating, overall_satisfaction_rating)
      ) as average 
      FROM feedbacks 
      WHERE (rating IS NOT NULL OR overall_satisfaction_rating IS NOT NULL)
    `);
    const averageRating = parseFloat(avgResult[0].average || 0).toFixed(1);

    // Get rating distribution (using COALESCE for both rating fields)
    const [ratingDist] = await db.execute(`
      SELECT 
        COALESCE(rating, overall_satisfaction_rating) as rating, 
        COUNT(*) as count 
      FROM feedbacks 
      WHERE (rating IS NOT NULL OR overall_satisfaction_rating IS NOT NULL)
      GROUP BY COALESCE(rating, overall_satisfaction_rating) 
      ORDER BY COALESCE(rating, overall_satisfaction_rating) DESC
    `);

    // Get category distribution
    const [categoryDist] = await db.execute(`
      SELECT category, COUNT(*) as count 
      FROM feedbacks 
      GROUP BY category 
      ORDER BY count DESC
    `);

    // Get recent feedbacks
    const [recent] = await db.execute(`
      SELECT visitor_name, rating, feedback_text, created_at 
      FROM feedbacks 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        total,
        averageRating,
        ratingDistribution: ratingDist,
        categoryDistribution: categoryDist,
        recentFeedbacks: recent
      }
    });
  } catch (error) {
    console.error('Get feedback stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching feedback statistics'
    });
  }
});

// Get feedback categories
router.get('/categories', async (req, res) => {
  try {
    console.log('📂 Feedback categories request received');
    
    // Since our current feedback system uses integer categories,
    // let's create standard categories that match our database
    const categories = [
      { id: 1, name: 'Pelayanan Umum', description: 'Feedback tentang kualitas pelayanan secara umum' },
      { id: 2, name: 'Fasilitas', description: 'Feedback tentang fasilitas dan infrastruktur' },
      { id: 3, name: 'Kemudahan Akses', description: 'Feedback tentang kemudahan akses dan prosedur' },
      { id: 4, name: 'Keramahan Staff', description: 'Feedback tentang keramahan dan profesionalisme staff' },
      { id: 5, name: 'Kecepatan Layanan', description: 'Feedback tentang kecepatan dan responsivitas layanan' },
      { id: 6, name: 'Kebersihan', description: 'Feedback tentang kebersihan lingkungan dan fasilitas' },
      { id: 7, name: 'Lainnya', description: 'Feedback kategori lainnya' }
    ];

    console.log('✅ Returning feedback categories:', categories.length);
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('❌ Error getting feedback categories:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching feedback categories',
      error: error.message
    });
  }
});

export default router;
