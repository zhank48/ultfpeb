import express from 'express';
import { Visitor } from '../models/Visitor.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import db from '../config/database.js';

const router = express.Router();

// Get dashboard statistics
router.get('/stats', authenticateToken, authorizeRole(['Admin', 'Receptionist']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const filters = {};
    if (startDate && endDate) {
      filters.startDate = startDate;
      filters.endDate = endDate;
    }

    const statistics = await Visitor.getStatistics(filters);
    
    res.json({
      success: true,
      data: { statistics }
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching statistics'
    });
  }
});

// Get recent visitors
router.get('/recent-visitors', authenticateToken, authorizeRole(['Admin', 'Receptionist']), async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    const recentVisitors = await Visitor.findAll({ 
      limit: parseInt(limit),
      startDate: startOfDay.toISOString(),
      endDate: endOfDay.toISOString()
    });
    
    res.json({
      success: true,
      data: { recentVisitors }
    });
  } catch (error) {
    console.error('Get recent visitors error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching recent visitors'
    });
  }
});

// Get visitors for export
router.get('/export', authenticateToken, authorizeRole(['Admin', 'Receptionist']), async (req, res) => {
  try {
    const { startDate, endDate, location, format = 'json' } = req.query;
    
    const filters = {};
    if (startDate && endDate) {
      filters.startDate = startDate;
      filters.endDate = endDate;
    }
    if (location) filters.location = location;

    const visitors = await Visitor.findAll(filters);
    
    // Format data for export
    const exportData = visitors.map(visitor => ({
      id: visitor.id,
      full_name: visitor.full_name,
      phone_number: visitor.phone_number,
      institution: visitor.institution,
      purpose: visitor.purpose,
      person_to_meet: visitor.person_to_meet,
      location: visitor.location,
      check_in_time: visitor.check_in_time,
      check_out_time: visitor.check_out_time,
      input_by: visitor.input_by_name
    }));
    
    res.json({
      success: true,
      data: { 
        visitors: exportData,
        total: exportData.length,
        filters: { startDate, endDate, location }
      }
    });
  } catch (error) {
    console.error('Export visitors error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while exporting visitors'
    });
  }
});

// Get feedback statistics for dashboard
router.get('/feedback-stats', authenticateToken, authorizeRole(['Admin', 'Receptionist']), async (req, res) => {
  try {
    // Get average rating (prioritize 'rating' field, fallback to 'overall_satisfaction_rating')
    const [avgResult] = await db.execute(`
      SELECT AVG(
        COALESCE(rating, overall_satisfaction_rating)
      ) as average 
      FROM feedbacks 
      WHERE (rating IS NOT NULL OR overall_satisfaction_rating IS NOT NULL)
    `);
    const averageRating = parseFloat(avgResult[0].average || 0);

    // Get total count of feedbacks with ratings
    const [totalResult] = await db.execute(`
      SELECT COUNT(*) as total 
      FROM feedbacks 
      WHERE (rating IS NOT NULL OR overall_satisfaction_rating IS NOT NULL)
    `);
    const total = totalResult[0].total;

    res.json({
      success: true,
      data: {
        average: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
        total: total
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

// Get complaint statistics for dashboard
router.get('/complaint-stats', authenticateToken, authorizeRole(['Admin', 'Receptionist']), async (req, res) => {
  try {
    // Get total complaints
    const [totalResult] = await db.execute('SELECT COUNT(*) as total FROM complaints');
    const total = totalResult[0].total;

    // Get pending complaints (open and in_progress)
    const [pendingResult] = await db.execute('SELECT COUNT(*) as pending FROM complaints WHERE status IN ("open", "in_progress")');
    const pending = pendingResult[0].pending;

    // Get resolved complaints
    const [resolvedResult] = await db.execute('SELECT COUNT(*) as resolved FROM complaints WHERE status = "resolved"');
    const resolved = resolvedResult[0].resolved;

    res.json({
      success: true,
      data: {
        total: total,
        pending: pending,
        resolved: resolved
      }
    });
  } catch (error) {
    console.error('Get complaint stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching complaint statistics'
    });
  }
});

// Get lost items statistics for dashboard
router.get('/lost-items-stats', authenticateToken, authorizeRole(['Admin', 'Receptionist']), async (req, res) => {
  try {
    // Get total lost items
    const [totalResult] = await db.execute('SELECT COUNT(*) as total FROM lost_items');
    const total = totalResult[0].total;

    // Get found items (status = 'found')
    const [foundResult] = await db.execute('SELECT COUNT(*) as found FROM lost_items WHERE status = "found"');
    const found = foundResult[0].found;

    // Get pending items (status = 'pending')
    const [pendingResult] = await db.execute('SELECT COUNT(*) as pending FROM lost_items WHERE status = "pending"');
    const pending = pendingResult[0].pending;

    // Get returned items (status = 'returned')
    const [returnedResult] = await db.execute('SELECT COUNT(*) as returned FROM lost_items WHERE status = "returned"');
    const returned = returnedResult[0].returned;

    // Get returned items this month
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const [thisMonthResult] = await db.execute(
      'SELECT COUNT(*) as thisMonth FROM lost_items WHERE status = "returned" AND MONTH(updated_at) = ? AND YEAR(updated_at) = ?',
      [currentMonth, currentYear]
    );
    const returnedThisMonth = thisMonthResult[0].thisMonth;

    res.json({
      success: true,
      data: {
        lostItems: {
          total: total,
          found: found,
          pending: pending
        },
        returnedItems: {
          total: returned,
          thisMonth: returnedThisMonth
        }
      }
    });
  } catch (error) {
    console.error('Get lost items stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching lost items statistics'
    });
  }
});

export default router;
