import express from 'express';
import { VisitorEnhanced } from '../models/VisitorEnhanced.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';
import db from '../config/database.js';

const router = express.Router();

// Ensure visitor_actions table exists
const ensureVisitorActionsTable = async () => {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS visitor_actions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        visitor_id INT NOT NULL,
        action_type ENUM('edit', 'delete') NOT NULL,
        reason TEXT NOT NULL,
        original_data JSON NULL,
        proposed_data JSON NULL,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        requested_by INT NOT NULL,
        requested_by_name VARCHAR(255) NOT NULL,
        requested_by_role VARCHAR(50) NOT NULL,
        processed_by INT NULL,
        processed_by_name VARCHAR(255) NULL,
        processed_at TIMESTAMP NULL,
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_visitor_id (visitor_id),
        INDEX idx_action_type (action_type),
        INDEX idx_status (status),
        INDEX idx_requested_by (requested_by),
        INDEX idx_created_at (created_at)
      )
    `);
    console.log('✅ visitor_actions table ready');
  } catch (error) {
    console.error('❌ Error creating visitor_actions table:', error);
  }
};

// Initialize table
ensureVisitorActionsTable();

/**
 * Get all visitor actions (Admin only)
 * GET /api/visitor-actions
 */
router.get('/', [
  authenticateToken,
  authorizeRole(['Admin', 'Manager'])
], async (req, res) => {
  try {
    const { status, type, limit } = req.query;
    
    // This would typically fetch from a visitor_actions table
    // For now, redirect to visitor-management
    const filters = {
      search: req.query.search,
      location: req.query.location,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: limit ? parseInt(limit) : undefined
    };

    const userRole = req.user.role;
    const viewType = status === 'pending' ? 'pending_edit' : 'all';
    const visitors = await VisitorEnhanced.findByRoleAndView(filters, userRole, viewType);

    res.json({
      success: true,
      data: visitors,
      total: visitors.length
    });

  } catch (error) {
    console.error('Error fetching visitor actions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch visitor actions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get action by ID
 * GET /api/visitor-actions/:id
 */
router.get('/:id', [
  authenticateToken,
  authorizeRole(['Admin', 'Manager'])
], async (req, res) => {
  try {
    const { id } = req.params;
    
    // This would typically fetch a specific action
    // For now, return basic response
    res.json({
      success: true,
      data: {
        id: parseInt(id),
        status: 'pending',
        type: 'edit',
        created_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching visitor action:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch visitor action',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Create new action (edit/delete request)
 * POST /api/visitor-actions
 */
router.post('/', [
  authenticateToken,
  body('visitor_id').isInt({ min: 1 }).withMessage('Valid visitor ID is required'),
  body('action_type').isIn(['edit', 'delete']).withMessage('Action type must be edit or delete'),
  body('reason').isLength({ min: 5 }).trim().withMessage('Reason must be at least 5 characters')
], async (req, res) => {
  try {
    console.log('Visitor actions POST request body:', req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { visitor_id, action_type, reason, proposed_data } = req.body;
    const requestedBy = {
      id: req.user.id || null,
      name: req.user.name || req.user.email || 'Unknown User',
      role: req.user.role || 'User'
    };

    let result;
    
    try {
      if (action_type === 'edit') {
        // Validate proposed_data for edit requests
        if (!proposed_data || typeof proposed_data !== 'object') {
          return res.status(400).json({
            success: false,
            message: 'Edit requests require proposed_data'
          });
        }

        console.log('Calling createEditRequest with:', { visitor_id, proposed_data, reason: reason.trim(), requestedBy });
        result = await VisitorEnhanced.createEditRequest(
          visitor_id, 
          proposed_data, 
          reason.trim(), 
          requestedBy
        );
      } else {
        // Delete request
        console.log('Calling createDeletionRequest with:', { visitor_id, reason: reason.trim(), requestedBy });
        result = await VisitorEnhanced.createDeletionRequest(
          visitor_id, 
          reason.trim(), 
          requestedBy
        );
      }
    } catch (modelError) {
      console.error('Model method error:', modelError);
      throw modelError; // Re-throw so the outer catch handles it
    }

    res.status(201).json({
      success: true,
      message: `${action_type === 'edit' ? 'Edit' : 'Delete'} request submitted successfully. Waiting for admin approval.`,
      data: result
    });

  } catch (error) {
    console.error('Error creating visitor action:', error);
    console.error('Error stack:', error.stack);
    
    if (error.message.includes('already a pending') || error.message.includes('already deleted')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    // Check if it's a database connection error
    if (error.code === 'ECONNREFUSED' || error.code === 'ER_ACCESS_DENIED_ERROR') {
      return res.status(503).json({
        success: false,
        message: 'Database connection error. Please try again later.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create visitor action',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Approve action
 * PATCH /api/visitor-actions/:id/approve
 */
router.patch('/:id/approve', [
  authenticateToken,
  authorizeRole(['Admin', 'Manager'])
], async (req, res) => {
  try {
    const { id } = req.params;
    const { action_type } = req.body;
    const approvedBy = {
      id: req.user.id,
      name: req.user.name,
      role: req.user.role
    };

    let result;
    if (action_type === 'edit') {
      result = await VisitorEnhanced.approveEditRequest(id, approvedBy);
    } else {
      result = await VisitorEnhanced.approveDeletionRequest(id, approvedBy);
    }

    res.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('Error approving visitor action:', error);
    
    if (error.message.includes('not found') || error.message.includes('already processed')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to approve visitor action',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Reject action
 * PATCH /api/visitor-actions/:id/reject
 */
router.patch('/:id/reject', [
  authenticateToken,
  authorizeRole(['Admin', 'Manager']),
  body('rejection_reason').optional().isLength({ min: 5 }).trim()
    .withMessage('Rejection reason must be at least 5 characters if provided')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { action_type, rejection_reason = '' } = req.body;
    const rejectedBy = {
      id: req.user.id,
      name: req.user.name,
      role: req.user.role
    };

    const result = await VisitorEnhanced.rejectRequest(
      id, 
      action_type, 
      rejectedBy, 
      rejection_reason.trim()
    );

    res.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('Error rejecting visitor action:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject visitor action',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;