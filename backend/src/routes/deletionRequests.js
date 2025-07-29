import express from 'express';
import { body, validationResult } from 'express-validator';
import { DeletionRequest } from '../models/DeletionRequest.js';
import { Visitor } from '../models/Visitor.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import db from '../config/database.js';

const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  console.log('🧪 TEST ROUTE CALLED');
  res.json({ success: true, message: 'Test route working' });
});

// Get all deletion requests (Admin/Manager only)
router.get('/', authenticateToken, authorizeRole(['Admin', 'Manager']), async (req, res) => {
  try {
    console.log('🚨🚨🚨 ROUTE HANDLER CALLED - Getting deletion requests...');
    console.log('📋 User info:', { id: req.user?.id, role: req.user?.role });
    
    const { status, startDate, endDate, limit } = req.query;
    console.log('🔍 Query filters:', { status, startDate, endDate, limit });
    
    const filters = {};
    if (status) filters.status = status;
    if (startDate && endDate) {
      filters.startDate = startDate;
      filters.endDate = endDate;
    }
    if (limit) filters.limit = limit;
    
    console.log('🔍 Calling DeletionRequest.findAll with filters:', filters);
    const requests = await DeletionRequest.findAll(filters);
    console.log('✅ Found deletion requests:', requests.length);
    
    res.json({
      success: true,
      data: requests,
      debug: 'Route is working with new code'
    });
  } catch (error) {
    console.error('❌ Error fetching deletion requests:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deletion requests',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get deletion request by ID
router.get('/:id', authenticateToken, authorizeRole(['Admin', 'Manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const request = await DeletionRequest.findById(id);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Deletion request not found'
      });
    }
    
    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    console.error('Error fetching deletion request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deletion request',
      error: error.message
    });
  }
});

// Create deletion request
router.post('/', 
  authenticateToken,
  [
    body('visitor_id').isInt().withMessage('Visitor ID must be a valid integer'),
    body('reason').trim().isLength({ min: 5 }).withMessage('Reason must be at least 5 characters long')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }
      
      const { visitor_id, reason } = req.body;
      
      // Check if visitor exists
      const visitor = await Visitor.findById(visitor_id);
      if (!visitor) {
        return res.status(404).json({
          success: false,
          message: 'Visitor not found'
        });
      }
      
      // Check if there's already a pending deletion request for this visitor
      const existingRequests = await DeletionRequest.findByVisitorId(visitor_id);
      const pendingRequest = existingRequests.find(req => req.status === 'pending');
      
      if (pendingRequest) {
        return res.status(400).json({
          success: false,
          message: 'There is already a pending deletion request for this visitor'
        });
      }
      
      const requestData = {
        visitor_id,
        requested_by: req.user.id,
        reason
      };
      
      const newRequest = await DeletionRequest.create(requestData);
      
      res.status(201).json({
        success: true,
        message: 'Deletion request created successfully',
        data: newRequest
      });
    } catch (error) {
      console.error('Error creating deletion request:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create deletion request',
        error: error.message
      });
    }
  }
);

// Approve deletion request
router.patch('/:id/approve', 
  authenticateToken, 
  authorizeRole(['Admin', 'Manager']), 
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const request = await DeletionRequest.findById(id);
      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'Deletion request not found'
        });
      }
      
      if (request.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Only pending requests can be approved'
        });
      }
      
      // Approve the request
      const approvedRequest = await DeletionRequest.approve(id, {
        approved_by: req.user.id
      });
      
      // Soft delete the visitor
      await Visitor.softDelete(request.visitor_id, req.user.id);
      
      res.json({
        success: true,
        message: 'Deletion request approved and visitor deleted successfully',
        data: approvedRequest
      });
    } catch (error) {
      console.error('Error approving deletion request:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to approve deletion request',
        error: error.message
      });
    }
  }
);

// Reject deletion request
router.patch('/:id/reject',
  authenticateToken,
  authorizeRole(['Admin', 'Manager']),
  [
    body('rejection_reason').trim().isLength({ min: 5 }).withMessage('Rejection reason must be at least 5 characters long')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }
      
      const { id } = req.params;
      const { rejection_reason } = req.body;
      
      const request = await DeletionRequest.findById(id);
      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'Deletion request not found'
        });
      }
      
      if (request.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Only pending requests can be rejected'
        });
      }
      
      const rejectedRequest = await DeletionRequest.reject(id, {
        rejection_reason
      });
      
      res.json({
        success: true,
        message: 'Deletion request rejected successfully',
        data: rejectedRequest
      });
    } catch (error) {
      console.error('Error rejecting deletion request:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reject deletion request',
        error: error.message
      });
    }
  }
);

// Batch check visitor deletion statuses
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
    
    const statusMap = {};
    
    // Get all deletion requests for these visitors in a single query
    const placeholders = visitorIds.map(() => '?').join(',');
    const query = `
      SELECT 
        dr.visitor_id, 
        dr.status, 
        dr.id, 
        dr.reason, 
        dr.created_at, 
        dr.requested_by,
        u.name as requested_by_name,
        u.role as requested_by_role
      FROM deletion_requests dr
      LEFT JOIN users u ON dr.requested_by = u.id
      WHERE dr.visitor_id IN (${placeholders}) AND dr.deleted_at IS NULL
      ORDER BY dr.created_at DESC
    `;
    
    const [rows] = await db.execute(query, visitorIds);
    
    // Group by visitor_id and find pending requests
    for (const visitorId of visitorIds) {
      const visitorRequests = rows.filter(req => req.visitor_id === parseInt(visitorId));
      const pendingRequest = visitorRequests.find(req => req.status === 'pending');
      
      statusMap[visitorId] = {
        hasPendingDeletion: !!pendingRequest,
        deletionRequest: pendingRequest || null,
        allRequests: visitorRequests
      };
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

// Get deletion requests statistics  
router.get('/stats', authenticateToken, authorizeRole(['Admin', 'Manager']), async (req, res) => {
  try {
    const stats = await DeletionRequest.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching deletion request stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deletion request statistics',
      error: error.message
    });
  }
});

// Check visitor deletion status
router.get('/visitor/:visitorId/status', authenticateToken, async (req, res) => {
  try {
    const { visitorId } = req.params;
    
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