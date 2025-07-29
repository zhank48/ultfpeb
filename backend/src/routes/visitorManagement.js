import express from 'express';
import { VisitorEnhanced } from '../models/VisitorEnhanced.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';
import db from '../config/database.js';

const router = express.Router();

/**
 * Get visitors based on role and view type
 * GET /api/visitor-management
 * Query params: viewType, search, location, startDate, endDate, limit
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { viewType = 'active', search, location, startDate, endDate, limit } = req.query;
    const userRole = req.user.role;

    // Validate viewType based on role
    const allowedViewTypes = {
      'Receptionist': ['active', 'pending_requests'],
      'Admin': ['active', 'pending_deletion', 'pending_edit', 'deleted', 'all'],
      'Manager': ['active', 'pending_deletion', 'pending_edit', 'deleted', 'all']
    };

    if (!allowedViewTypes[userRole]?.includes(viewType)) {
      return res.status(403).json({
        success: false,
        message: `View type '${viewType}' not allowed for role '${userRole}'`
      });
    }

    const filters = {
      search,
      location,
      startDate,
      endDate,
      limit: limit ? parseInt(limit) : undefined
    };

    const visitors = await VisitorEnhanced.findByRoleAndView(filters, userRole, viewType);
    const stats = await VisitorEnhanced.getDashboardStats(userRole);

    res.json({
      success: true,
      data: {
        visitors,
        stats,
        viewType,
        userRole,
        total: visitors.length
      }
    });

  } catch (error) {
    console.error('Error fetching visitor management data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch visitor data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Create visitor edit request
 * POST /api/visitor-management/edit-request
 */
router.post('/edit-request', [
  authenticateToken,
  body('visitor_id').isInt({ min: 1 }).withMessage('Valid visitor ID is required'),
  body('reason').isLength({ min: 10 }).trim().withMessage('Reason must be at least 10 characters'),
  body('edit_data').isObject().withMessage('Edit data must be an object')
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

    const { visitor_id, reason, edit_data } = req.body;
    
    // Fetch user name if not in JWT
    let userName = req.user.name;
    if (!userName) {
      try {
        const [userRows] = await db.execute('SELECT name FROM users WHERE id = ?', [req.user.id]);
        userName = userRows[0]?.name || 'Unknown User';
      } catch (userError) {
        console.log('⚠️ Could not fetch user name:', userError.message);
        userName = 'Unknown User';
      }
    }
    
    const requestedBy = {
      id: req.user.id,
      name: userName,
      role: req.user.role
    };

    // Validate edit_data fields
    const allowedFields = [
      'full_name', 'phone_number', 'email', 'address', 'institution', 
      'purpose', 'person_to_meet', 'location', 'id_number', 'document_type'
    ];

    const editData = {};
    Object.keys(edit_data).forEach(key => {
      if (allowedFields.includes(key) && edit_data[key] !== undefined) {
        editData[key] = edit_data[key];
      }
    });

    if (Object.keys(editData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to edit'
      });
    }

    const result = await VisitorEnhanced.createEditRequest(
      visitor_id, 
      editData, 
      reason.trim(), 
      requestedBy
    );

    res.status(201).json({
      success: true,
      message: 'Edit request submitted successfully. Waiting for admin approval.',
      data: result
    });

  } catch (error) {
    console.error('Error creating edit request:', error);
    
    if (error.message.includes('already a pending')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create edit request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Create visitor deletion request  
 * POST /api/visitor-management/deletion-request
 */
router.post('/deletion-request', [
  authenticateToken,
  body('visitor_id').isInt({ min: 1 }).withMessage('Valid visitor ID is required'),
  body('reason').isLength({ min: 10 }).trim().withMessage('Reason must be at least 10 characters')
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

    const { visitor_id, reason } = req.body;
    
    // Fetch user name if not in JWT
    let userName = req.user.name;
    if (!userName) {
      try {
        const [userRows] = await db.execute('SELECT name FROM users WHERE id = ?', [req.user.id]);
        userName = userRows[0]?.name || 'Unknown User';
      } catch (userError) {
        console.log('⚠️ Could not fetch user name:', userError.message);
        userName = 'Unknown User';
      }
    }
    
    const requestedBy = {
      id: req.user.id,
      name: userName,
      role: req.user.role
    };

    const result = await VisitorEnhanced.createDeletionRequest(
      visitor_id, 
      reason.trim(), 
      requestedBy
    );

    res.status(201).json({
      success: true,
      message: 'Deletion request submitted successfully. Waiting for admin approval.',
      data: result
    });

  } catch (error) {
    console.error('Error creating deletion request:', error);
    
    if (error.message.includes('already a pending') || error.message.includes('already deleted')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create deletion request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Approve edit request (Admin only)
 * POST /api/visitor-management/approve-edit/:requestId
 */
router.post('/approve-edit/:requestId', [
  authenticateToken,
  authorizeRole(['Admin', 'Manager'])
], async (req, res) => {
  try {
    const { requestId } = req.params;
    
    // Fetch user name if not in JWT
    let userName = req.user.name;
    if (!userName) {
      try {
        const [userRows] = await db.execute('SELECT name FROM users WHERE id = ?', [req.user.id]);
        userName = userRows[0]?.name || 'Unknown User';
      } catch (userError) {
        console.log('⚠️ Could not fetch user name:', userError.message);
        userName = 'Unknown User';
      }
    }
    
    const approvedBy = {
      id: req.user.id,
      name: userName,
      role: req.user.role
    };

    const result = await VisitorEnhanced.approveEditRequest(requestId, approvedBy);

    res.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('Error approving edit request:', error);
    
    if (error.message.includes('not found') || error.message.includes('already processed')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to approve edit request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Approve deletion request (Admin only)
 * POST /api/visitor-management/approve-deletion/:requestId
 */
router.post('/approve-deletion/:requestId', [
  authenticateToken,
  authorizeRole(['Admin', 'Manager'])
], async (req, res) => {
  try {
    const { requestId } = req.params;
    
    // Fetch user name if not in JWT
    let userName = req.user.name;
    if (!userName) {
      try {
        const [userRows] = await db.execute('SELECT name FROM users WHERE id = ?', [req.user.id]);
        userName = userRows[0]?.name || 'Unknown User';
      } catch (userError) {
        console.log('⚠️ Could not fetch user name:', userError.message);
        userName = 'Unknown User';
      }
    }
    
    const approvedBy = {
      id: req.user.id,
      name: userName,
      role: req.user.role
    };

    const result = await VisitorEnhanced.approveDeletionRequest(requestId, approvedBy);

    res.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('Error approving deletion request:', error);
    
    if (error.message.includes('not found') || error.message.includes('already processed')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to approve deletion request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Reject request (Admin only)
 * POST /api/visitor-management/reject/:requestType/:requestId
 */
router.post('/reject/:requestType/:requestId', [
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

    const { requestType, requestId } = req.params;
    const { rejection_reason = '' } = req.body;
    
    // Fetch user name if not in JWT
    let userName = req.user.name;
    if (!userName) {
      try {
        const [userRows] = await db.execute('SELECT name FROM users WHERE id = ?', [req.user.id]);
        userName = userRows[0]?.name || 'Unknown User';
      } catch (userError) {
        console.log('⚠️ Could not fetch user name:', userError.message);
        userName = 'Unknown User';
      }
    }
    
    const rejectedBy = {
      id: req.user.id,
      name: userName,
      role: req.user.role
    };

    if (!['edit', 'deletion'].includes(requestType)) {
      return res.status(400).json({
        success: false,
        message: 'Request type must be either "edit" or "deletion"'
      });
    }

    const result = await VisitorEnhanced.rejectRequest(
      requestId, 
      requestType, 
      rejectedBy, 
      rejection_reason.trim()
    );

    res.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('Error rejecting request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get dashboard statistics
 * GET /api/visitor-management/stats
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userRole = req.user.role;
    const stats = await VisitorEnhanced.getDashboardStats(userRole);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get deletion requests (Admin only)  
 * GET /api/visitor-management/deletion-requests
 */
router.get('/deletion-requests', [
  authenticateToken,
  authorizeRole(['Admin', 'Manager'])
], async (req, res) => {
  try {
    // Import DeletionRequest model
    const { DeletionRequest } = await import('../models/DeletionRequest.js');
    
    // Get all deletion requests with visitor information
    const deletionRequests = await DeletionRequest.getAllWithVisitorInfo();

    res.json({
      success: true,
      data: deletionRequests,
      total: deletionRequests.length
    });

  } catch (error) {
    console.error('Error fetching deletion requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deletion requests',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Batch check visitor deletion status
 * POST /api/visitor-management/batch-status-check
 */
router.post('/batch-status-check', authenticateToken, async (req, res) => {
  try {
    const { visitorIds } = req.body;
    
    if (!Array.isArray(visitorIds) || visitorIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'visitorIds must be a non-empty array'
      });
    }
    
    // Limit to prevent abuse
    if (visitorIds.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 100 visitor IDs allowed per request'
      });
    }
    
    // Import DeletionRequest model
    const { DeletionRequest } = await import('../models/DeletionRequest.js');
    
    const statusMap = {};
    
    // Check deletion status for each visitor
    for (const visitorId of visitorIds) {
      try {
        const requests = await DeletionRequest.findByVisitorId(visitorId);
        const pendingRequest = requests.find(req => req.status === 'pending');
        
        statusMap[visitorId] = {
          hasPendingDeletion: !!pendingRequest,
          deletionRequest: pendingRequest || null,
          allRequests: requests
        };
      } catch (error) {
        console.error(`Error checking status for visitor ${visitorId}:`, error);
        statusMap[visitorId] = {
          hasPendingDeletion: false,
          deletionRequest: null,
          allRequests: []
        };
      }
    }
    
    res.json({
      success: true,
      data: statusMap
    });
  } catch (error) {
    console.error('Error batch checking visitor deletion status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to batch check visitor deletion status',
      error: error.message
    });
  }
});

/**
 * Check individual visitor deletion status
 * GET /api/visitor-management/deletion-requests/visitor/:visitorId/status
 */
router.get('/deletion-requests/visitor/:visitorId/status', authenticateToken, async (req, res) => {
  try {
    const { visitorId } = req.params;
    
    // Import DeletionRequest model
    const { DeletionRequest } = await import('../models/DeletionRequest.js');
    
    const requests = await DeletionRequest.findByVisitorId(visitorId);
    const pendingRequest = requests.find(req => req.status === 'pending');
    
    res.json({
      success: true,
      data: {
        hasPendingDeletion: !!pendingRequest,
        deletionRequest: pendingRequest || null,
        allRequests: requests
      }
    });
  } catch (error) {
    console.error('Error checking visitor deletion status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check visitor deletion status',
      error: error.message
    });
  }
});

export default router;