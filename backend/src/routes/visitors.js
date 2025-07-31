import express from 'express';
import fs from 'fs/promises';
import { body, validationResult } from 'express-validator';
import { Visitor } from '../models/Visitor.js';
import { VisitorEditHistory } from '../models/VisitorEditHistory.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { FileUtils } from '../utils/fileUtils.js';
import { DocxService } from '../services/DocxService.js';
import db from '../config/database.js';

const router = express.Router();

// Get all visitors without authentication (for development/testing)
router.get('/public', async (req, res) => {
  try {
    const { startDate, endDate, location, search } = req.query;
    
    const filters = {};
    if (startDate && endDate) {
      filters.startDate = startDate;
      filters.endDate = endDate;
    }
    if (location) filters.location = location;
    if (search) filters.search = search;

    const visitors = await Visitor.findAll(filters);   
    const mappedVisitors = visitors.map(visitor => ({
      id: visitor.id,
      name: visitor.full_name,
      phone: visitor.phone_number,
      email: visitor.email,
      institution: visitor.institution,
      purpose: visitor.purpose,
      unit: visitor.location,
      person_to_meet: visitor.person_to_meet,
      check_in_time: visitor.check_in_time,
      check_out_time: visitor.check_out_time,
      photo_url: visitor.photo_url,
      signature_url: visitor.signature_url,
      input_by_name: visitor.input_by_name,
      input_by_role: visitor.input_by_role,
      input_by_avatar: visitor.input_by_avatar,
      operator_avatar: visitor.operator_avatar,
      operator_photo_url: visitor.operator_photo_url,
      created_at: visitor.created_at,
      request_document: visitor.request_document,
      document_type: visitor.document_type,
      document_name: visitor.document_name,
      document_number: visitor.document_number,
      document_details: visitor.document_details
    }));
    
    res.json(mappedVisitors);
  } catch (error) {
    console.error('Get visitors error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching visitors'
    });
  }
});

// Get all visitors with filters
router.get('/', authenticateToken, authorizeRole(['Admin', 'Receptionist']), async (req, res) => {
  try {
    const { startDate, endDate, location, search, include_deleted, only_deleted } = req.query;
    
    const filters = {};
    if (startDate && endDate) {
      filters.startDate = startDate;
      filters.endDate = endDate;
    }
    if (location) filters.location = location;
    if (search) filters.search = search;

    let visitors;
    
    // Handle soft deleted records
    if (only_deleted === 'true') {
      // Get only soft deleted records
      visitors = await Visitor.findAllDeleted(filters);
    } else if (include_deleted === 'true') {
      // Get both active and deleted records
      visitors = await Visitor.findAllWithDeleted(filters);
    } else {
      // Get only active records (default)
      visitors = await Visitor.findAll(filters);
    }
    
    // Map database fields to frontend expected fields
    const mappedVisitors = visitors.map(visitor => ({
      id: visitor.id,
      name: visitor.full_name,
      full_name: visitor.full_name, // Keep both for compatibility
      phone: visitor.phone_number,
      phone_number: visitor.phone_number,
      email: visitor.email,
      institution: visitor.institution,
      purpose: visitor.purpose,
      unit: visitor.location,
      location: visitor.location,
      person_to_meet: visitor.person_to_meet,
      // Add identity fields
      id_type: visitor.id_type,
      id_number: visitor.id_number,
      address: visitor.address,
      check_in_time: visitor.check_in_time,
      check_out_time: visitor.check_out_time,
      photo_url: visitor.photo_url,
      signature_url: visitor.signature_url,
      input_by_name: visitor.input_by_name,
      input_by_role: visitor.input_by_role,
      input_by_user_id: visitor.input_by_user_id,
      input_by_avatar: visitor.input_by_avatar,
      operator_name: visitor.input_by_name,
      operator_role: visitor.input_by_role,
      operator_avatar: visitor.input_by_avatar,
      // Add checkout operator fields
      checkout_by_name: visitor.checkout_by_name,
      checkout_by_role: visitor.checkout_by_role,
      checkout_by_avatar: visitor.checkout_by_avatar,
      checkout_operator_name: visitor.checkout_by_name,
      checkout_operator_role: visitor.checkout_by_role,
      checkout_operator_avatar: visitor.checkout_by_avatar,
      // Add soft delete fields
      deleted_at: visitor.deleted_at,
      deleted_by_name: visitor.deleted_by_name,
      status: visitor.deleted_at ? 'deleted' : 'active',
      created_at: visitor.created_at,
      updated_at: visitor.updated_at
    }));
    
    res.json({
      success: true,
      data: mappedVisitors
    });
  } catch (error) {
    console.error('Get visitors error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching visitors'
    });
  }
});

// Get all visitors (public access for testing)
router.get('/public/all', async (req, res) => {
  try {
    const visitors = await Visitor.findAll();
    res.json(visitors);
  } catch (error) {
    console.error('Get visitors error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching visitors'
    });
  }
});

// Get visitor stats
router.get('/stats', authenticateToken, authorizeRole(['Admin', 'Manager', 'Receptionist']), async (req, res) => {
  try {
    // Get actual visitor counts
    const totalVisitors = await Visitor.getTotalCount();
    const activeVisitors = await Visitor.getActiveCount();
    const deletedVisitors = await Visitor.getDeletedCount();
    
    // Get deletion request counts from DeletionRequest model
    const { DeletionRequest } = await import('../models/DeletionRequest.js');
    const deletionStats = await DeletionRequest.getStats();
    
    const stats = {
      totalVisitors: totalVisitors,
      activeVisitors: activeVisitors, 
      deletedVisitors: deletedVisitors,
      pendingRequests: deletionStats.pending || 0,
      approvedRequests: deletionStats.approved || 0,
      rejectedRequests: deletionStats.rejected || 0
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Stats error:', error);
    // Return default stats on error to prevent frontend crashes
    res.json({
      success: true,
      data: {
        totalVisitors: 0,
        activeVisitors: 0,
        deletedVisitors: 0,
        pendingRequests: 0,
        approvedRequests: 0,
        rejectedRequests: 0
      }
    });
  }
});

// Get visitor by ID
router.get('/:id', authenticateToken, authorizeRole(['Admin', 'Receptionist']), async (req, res) => {
  try {
    const { id } = req.params;
    const visitor = await Visitor.findById(id);
    
    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: 'Visitor not found'
      });    }

    // Map database fields to frontend expected fields
    const mappedVisitor = {
      id: visitor.id,
      name: visitor.full_name,
      full_name: visitor.full_name,
      phone: visitor.phone_number,
      phone_number: visitor.phone_number,
      email: visitor.email,
      institution: visitor.institution,
      purpose: visitor.purpose,
      unit: visitor.location,
      location: visitor.location,
      person_to_meet: visitor.person_to_meet,
      // Identity fields
      id_type: visitor.id_type,
      id_number: visitor.id_number,
      address: visitor.address,
      check_in_time: visitor.check_in_time,
      check_out_time: visitor.check_out_time,
      photo_url: visitor.photo_url,
      signature_url: visitor.signature_url,
      input_by_name: visitor.input_by_name,
      input_by_user_id: visitor.input_by_user_id,
      operator_name: visitor.input_by_name,
      operator_email: visitor.input_by_email,
      operator_role: visitor.input_by_role,
      operator_avatar: visitor.input_by_avatar || visitor.input_by_photo,
      operator_photo_url: visitor.operator_photo_url,
      input_by_avatar: visitor.input_by_avatar,
      // Add checkout operator fields
      checkout_by_name: visitor.checkout_by_name,
      checkout_by_role: visitor.checkout_by_role,
      checkout_by_avatar: visitor.checkout_by_avatar,
      checkout_by_email: visitor.checkout_by_email,
      checkout_operator_name: visitor.checkout_by_name,
      checkout_operator_role: visitor.checkout_by_role,
      checkout_operator_avatar: visitor.checkout_by_avatar,
      created_at: visitor.created_at,
      updated_at: visitor.updated_at,
      request_document: visitor.request_document,
      document_type: visitor.document_type,
      document_name: visitor.document_name,
      document_number: visitor.document_number,
      document_details: visitor.document_details,
    };

    res.json({
      success: true,
      data: mappedVisitor
    });
  } catch (error) {
    console.error('Get visitor error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching visitor'
    });
  }
});

// Check-in endpoint with base64 photo and signature
router.post('/check-in', authenticateToken, [
  body('name').isLength({ min: 2 }).trim().withMessage('Name must be at least 2 characters'),
  body('phone').isLength({ min: 8, max: 20 }).trim().withMessage('Phone must be between 8-20 characters'),
  body('institution').isLength({ min: 2 }).trim().withMessage('Institution must be at least 2 characters'),
  body('purpose').isLength({ min: 2 }).trim().withMessage('Purpose must be at least 2 characters'),
  body('unit').isLength({ min: 2 }).trim().withMessage('Unit must be at least 2 characters'),
  body('photo').optional({ nullable: true, checkFalsy: true }),
  body('signature').optional({ nullable: true, checkFalsy: true })
], async (req, res) => {
  try {
    console.log('Check-in request received');
    console.log('Authenticated user:', req.user);
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Request body data:', {
      name: req.body.name,
      phone: req.body.phone,
      institution: req.body.institution,
      purpose: req.body.purpose,
      unit: req.body.unit,
      person_to_meet: req.body.person_to_meet,
      id_type: req.body.id_type,
      id_number: req.body.id_number,
      check_in_time: req.body.check_in_time
    });
    console.log('Document request fields:', {
      requestDocument: req.body.requestDocument,
      request_document: req.body.request_document,
      documentType: req.body.documentType,
      document_type: req.body.document_type,
      documentName: req.body.documentName,
      document_name: req.body.document_name,
      documentNumber: req.body.documentNumber,
      document_number: req.body.document_number
    });
    console.log('Photo length:', req.body.photo ? req.body.photo.length : 'No photo');
    console.log('Signature length:', req.body.signature ? req.body.signature.length : 'No signature');
    
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Invalid input data',
        errors: errors.array()
      });
    }    const {
      name, phone, email, institution, purpose, unit, 
      person_to_meet, id_number, id_type, address, photo, signature, check_in_time
    } = req.body;

    // Save photo and signature as files
    let photoUrl = '';
    let signatureUrl = '';

    try {
      // Save photo
      if (photo) {
        const photoResult = await FileUtils.saveBase64Image(
          photo, 
          `photo_${name.replace(/\s+/g, '_')}.png`, 
          'uploads/photos'
        );
        photoUrl = photoResult.relativePath;
      }

      // Save signature
      if (signature) {
        const signatureResult = await FileUtils.saveBase64Image(
          signature, 
          `signature_${name.replace(/\s+/g, '_')}.png`, 
          'uploads/signatures'
        );
        signatureUrl = signatureResult.relativePath;
      }
    } catch (fileError) {
      console.error('File save error:', fileError);
      return res.status(500).json({
        success: false,
        message: 'Failed to save photo or signature'
      });
    }    // Create visitor record
    const newVisitor = await Visitor.create({
      full_name: name,
      phone_number: phone,
      email: email || '',
      institution,
      purpose,
      person_to_meet: person_to_meet || '',
      photo_url: photoUrl,
      signature_url: signatureUrl,
      check_in_time: check_in_time || new Date().toISOString(),
      id_number: id_number || '',
      id_type: id_type || '',
      address: address || '',
      input_by_user_id: req.user?.id || 1, // Default to user ID 1 if no auth
      request_document: req.body.requestDocument || req.body.request_document || false,
      document_type: req.body.documentType || req.body.document_type || null,
      document_name: req.body.documentName || req.body.document_name || null,
      document_number: req.body.documentNumber || req.body.document_number || null
    });

    res.status(201).json({
      success: true,
      message: 'Check-in successful',
      data: { 
        visitor: newVisitor,
        photoUrl: FileUtils.getImageUrl(photoUrl),
        signatureUrl: FileUtils.getImageUrl(signatureUrl)
      }
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during check-in'
    });
  }
});

// Create new visitor check-in
router.post('/', [
  authenticateToken,
  authorizeRole(['Admin', 'Receptionist']),
  upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'signature', maxCount: 1 }
  ]),
  body('full_name').isLength({ min: 2 }).trim(),
  body('phone_number').isLength({ min: 8 }).trim(),
  body('purpose').isLength({ min: 3 }).trim(),
  body('person_to_meet').isLength({ min: 2 }).trim(),
  body('location').isLength({ min: 2 }).trim()
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input data',
        errors: errors.array()
      });
    }

    const {
      full_name, phone_number, institution, purpose, 
      person_to_meet, location
    } = req.body;

    // Handle file uploads
    const photo_url = req.files?.photo?.[0]?.filename || '';
    const signature_url = req.files?.signature?.[0]?.filename || '';

    // Create visitor record
    const newVisitor = await Visitor.create({
      full_name,
      phone_number,
      institution: institution || '',
      purpose,
      person_to_meet,
      location,
      photo_url: photo_url ? `/uploads/${photo_url}` : '',
      signature_url: signature_url ? `/uploads/${signature_url}` : '',
      check_in_time: new Date(),
      input_by_user_id: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Visitor checked in successfully',
      data: { visitor: newVisitor }
    });

  } catch (error) {
    console.error('Create visitor error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while checking in visitor'
    });
  }
});

// Update visitor
router.put('/:id', [
  authenticateToken,
  authorizeRole(['Admin', 'Receptionist']),
  body('full_name').isLength({ min: 2 }).trim(),
  body('phone_number').isLength({ min: 8 }).trim(),
  body('purpose').isLength({ min: 3 }).trim(),
  body('person_to_meet').isLength({ min: 2 }).trim(),
  body('location').isLength({ min: 2 }).trim()
], async (req, res) => {
  try {
    const { id } = req.params;
    const {
      full_name, phone_number, email, institution, purpose,
      person_to_meet, location, photo_url, signature_url,
      id_type, id_number, address
    } = req.body;

    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input data',
        errors: errors.array()
      });
    }

    // Check if visitor exists
    const existingVisitor = await Visitor.findById(id);
    if (!existingVisitor) {
      return res.status(404).json({
        success: false,
        message: 'Visitor not found'
      });
    }

    console.log(`🔄 Updating visitor ${id} by ${req.user.name}`);
    console.log('Identity fields:', {
      id_type: id_type || 'not provided',
      id_number: id_number || 'not provided',
      existing_id_type: existingVisitor.id_type || 'empty',
      existing_id_number: existingVisitor.id_number || 'empty'
    });

    // Prepare new data
    const newData = {
      full_name,
      phone_number,
      email: email || existingVisitor.email || '',
      institution: institution || '',
      purpose,
      person_to_meet,
      location,
      photo_url: photo_url || existingVisitor.photo_url,
      signature_url: signature_url || existingVisitor.signature_url,
      id_type: id_type || existingVisitor.id_type || '',
      id_number: id_number || existingVisitor.id_number || '',
      address: address || existingVisitor.address || ''
    };

    // Log changes to edit history before updating
    try {
      await VisitorEditHistory.logEdit(
        id,
        existingVisitor,
        newData,
        req.user.id,
        req.user.email || req.user.name
      );
    } catch (historyError) {
      console.error('⚠️ Failed to log edit history:', historyError);
      // Continue with update even if history logging fails
    }

    // Update visitor
    const updatedVisitor = await Visitor.update(id, newData);

    console.log(`✅ Visitor ${id} updated successfully by ${req.user.name}`);

    res.json({
      success: true,
      message: 'Visitor updated successfully',
      data: { visitor: updatedVisitor }
    });

  } catch (error) {
    console.error('Update visitor error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating visitor'
    });
  }
});


// Check out visitor
router.patch('/:id/checkout', authenticateToken, authorizeRole(['Admin', 'Receptionist']), async (req, res) => {
  const { appendFileSync } = await import('fs');
  const logMessage = `[${new Date().toISOString()}] CHECKOUT ATTEMPT v2 - Visitor ID: ${req.params.id}, User: ${req.user?.name || 'Unknown'}, Body: ${JSON.stringify(req.body, null, 2)}\n`;
  appendFileSync('checkout-debug.log', logMessage);
  
  console.log('🔧 CHECKOUT ENDPOINT HIT!');
  console.log('Visitor ID:', req.params.id);
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('User:', req.user?.name || 'Unknown');
  
  try {
    const { id } = req.params;
    const documentData = req.body;
    
    // Add more detailed error handling
    if (!id) {
      console.log('❌ No visitor ID provided');
      return res.status(400).json({
        success: false,
        message: 'Visitor ID is required'
      });
    }

    // Check if visitor exists
    console.log('Checking if visitor exists...');
    let existingVisitor;
    try {
      existingVisitor = await Visitor.findById(id);
    } catch (findError) {
      console.log('❌ Error finding visitor:', findError.message);
      return res.status(500).json({
        success: false,
        message: 'Database error while finding visitor'
      });
    }
    
    if (!existingVisitor) {
      console.log('❌ Visitor not found');
      return res.status(404).json({
        success: false,
        message: 'Visitor not found'
      });
    }
    console.log('✅ Visitor found:', existingVisitor.full_name);

    // Check if already checked out
    if (existingVisitor.check_out_time) {
      console.log('❌ Already checked out:', existingVisitor.check_out_time);
      return res.status(400).json({
        success: false,
        message: 'Visitor already checked out'
      });
    }
    console.log('✅ Not yet checked out');

    // Prepare checkout operator - fetch user name if not in JWT
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
    
    const checkoutOperator = {
      userId: req.user.id,
      name: userName,
      role: req.user.role,
      avatar: req.user.avatar || req.user.photo_url || null
    };
    console.log('Checkout operator:', checkoutOperator);
    
    // Perform the checkout
    console.log('Performing checkout...');
    try {
      await Visitor.checkOut(id, new Date().toISOString(), checkoutOperator);
      console.log('✅ Checkout completed');
    } catch (checkoutError) {
      console.log('❌ Checkout failed:', checkoutError.message);
      return res.status(500).json({
        success: false,
        message: 'Error during checkout process'
      });
    }

    // Update visitor data and document fields if provided
    if (documentData && Object.keys(documentData).length > 0) {
      console.log('Processing visitor and document data...');
      const updateData = {};
      
      // Handle visitor field updates
      if (documentData.full_name !== undefined) {
        updateData.full_name = documentData.full_name;
        console.log('Setting full_name to:', documentData.full_name);
      }
      if (documentData.phone_number !== undefined) {
        updateData.phone_number = documentData.phone_number;
        console.log('Setting phone_number to:', documentData.phone_number);
      }
      if (documentData.email !== undefined) {
        updateData.email = documentData.email;
        console.log('Setting email to:', documentData.email);
      }
      if (documentData.id_type !== undefined) {
        updateData.id_type = documentData.id_type;
        console.log('Setting id_type to:', documentData.id_type);
      }
      if (documentData.id_number !== undefined) {
        updateData.id_number = documentData.id_number;
        console.log('Setting id_number to:', documentData.id_number);
      }
      if (documentData.institution !== undefined) {
        updateData.institution = documentData.institution;
        console.log('Setting institution to:', documentData.institution);
      }
      if (documentData.address !== undefined) {
        updateData.address = documentData.address;
        console.log('Setting address to:', documentData.address);
      }
      if (documentData.purpose !== undefined) {
        updateData.purpose = documentData.purpose;
        console.log('Setting purpose to:', documentData.purpose);
      }
      if (documentData.person_to_meet !== undefined) {
        updateData.person_to_meet = documentData.person_to_meet;
        console.log('Setting person_to_meet to:', documentData.person_to_meet);
      }
      if (documentData.location !== undefined) {
        updateData.location = documentData.location;
        console.log('Setting location to:', documentData.location);
      }
      
      // Handle document fields
      if (documentData.request_document !== undefined) {
        updateData.request_document = documentData.request_document;
        console.log('Setting request_document to:', documentData.request_document);
      }
      if (documentData.document_type !== undefined) {
        updateData.document_type = documentData.document_type;
        console.log('Setting document_type to:', documentData.document_type);
      }
      if (documentData.document_name !== undefined) {
        updateData.document_name = documentData.document_name;
        console.log('Setting document_name to:', documentData.document_name);
      }
      if (documentData.document_number !== undefined) {
        updateData.document_number = documentData.document_number;
        console.log('Setting document_number to:', documentData.document_number);
      }
      if (documentData.document_details !== undefined) {
        updateData.document_details = documentData.document_details;
        console.log('Setting document_details to:', documentData.document_details);
      }

      if (Object.keys(updateData).length > 0) {
        console.log('Updating visitor with all data:', updateData);
        try {
          const updateResult = await Visitor.update(id, updateData);
          console.log('Update result:', updateResult);
          console.log('✅ Visitor data updated');
        } catch (updateError) {
          console.log('❌ Update failed:', updateError.message);
          return res.status(500).json({
            success: false,
            message: 'Error updating visitor data'
          });
        }
      } else {
        console.log('ℹ️ No data to update');
      }
    } else {
      console.log('ℹ️ No data provided');
    }

    // Get the final updated visitor data
    console.log('Getting final visitor data...');
    let finalVisitor;
    try {
      finalVisitor = await Visitor.findById(id);
    } catch (finalError) {
      console.log('❌ Error getting final visitor data:', finalError.message);
      return res.status(500).json({
        success: false,
        message: 'Error retrieving updated visitor data'
      });
    }
    console.log('Final visitor status:');
    console.log('- Check out time:', finalVisitor.check_out_time);
    console.log('- ID Type:', finalVisitor.id_type);
    console.log('- ID Number:', finalVisitor.id_number);
    console.log('- Request document:', finalVisitor.request_document);
    console.log('- Document type:', finalVisitor.document_type);
    console.log('- Document name:', finalVisitor.document_name);
    console.log('- Document number:', finalVisitor.document_number);
    console.log('- Document details:', finalVisitor.document_details);

    res.json({
      success: true,
      message: 'Visitor checked out successfully',
      data: { visitor: finalVisitor }
    });

  } catch (error) {
    const { appendFileSync } = await import('fs');
    const errorMessage = `[${new Date().toISOString()}] CHECKOUT ERROR - Visitor ID: ${req.params.id}, Error: ${error.message}, Stack: ${error.stack}\n`;
    appendFileSync('checkout-debug.log', errorMessage);
    
    console.error('❌ Checkout error:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error while checking out visitor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Check out visitor (PUT method for frontend compatibility)
router.put('/:id/check-out', authenticateToken, authorizeRole(['Admin', 'Receptionist']), async (req, res) => {
  try {
    const { id } = req.params;
    const documentData = req.body; // Get document data from request body

    console.log('Checkout request received for visitor (PUT):', id);
    console.log('Document data:', documentData);

    // Check if visitor exists
    const existingVisitor = await Visitor.findById(id);
    if (!existingVisitor) {
      return res.status(404).json({
        success: false,
        message: 'Visitor not found'
      });
    }

    // Check if already checked out
    if (existingVisitor.check_out_time) {
      return res.status(400).json({
        success: false,
        message: 'Visitor already checked out'
      });
    }

    // Check out visitor with operator information - fetch user name if not in JWT
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
    
    const checkoutOperator = {
      userId: req.user.id,
      name: userName,
      role: req.user.role,
      avatar: req.user.avatar || req.user.photo_url || null
    };
    
    // First perform the checkout
    const updatedVisitor = await Visitor.checkOut(id, new Date().toISOString(), checkoutOperator);

    // Then update document fields if provided
    if (documentData && Object.keys(documentData).length > 0) {
      const documentUpdateData = {};
      
      if (documentData.request_document !== undefined) {
        documentUpdateData.request_document = documentData.request_document;
      }
      if (documentData.document_type !== undefined) {
        documentUpdateData.document_type = documentData.document_type;
      }
      if (documentData.document_name !== undefined) {
        documentUpdateData.document_name = documentData.document_name;
      }
      if (documentData.document_number !== undefined) {
        documentUpdateData.document_number = documentData.document_number;
      }
      if (documentData.document_details !== undefined) {
        documentUpdateData.document_details = documentData.document_details;
      }

      // Update visitor with document data if any document fields were provided
      if (Object.keys(documentUpdateData).length > 0) {
        console.log('Updating visitor with document data (PUT):', documentUpdateData);
        await Visitor.update(id, documentUpdateData);
      }
    }

    // Get the final updated visitor data
    const finalVisitor = await Visitor.findById(id);

    res.json({
      success: true,
      message: 'Visitor checked out successfully',
      data: { visitor: finalVisitor }
    });

  } catch (error) {
    console.error('Check out visitor error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while checking out visitor'
    });
  }
});

// Get visitor edit history
router.get('/:id/edit-history', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    console.log(`📖 Fetching edit history for visitor ${id}`);

    // Check if visitor exists
    const visitor = await Visitor.findById(id);
    if (!visitor) {
      console.log(`❌ Visitor ${id} not found`);
      return res.status(404).json({
        success: false,
        message: 'Visitor not found'
      });
    }

    // Get edit history for visitor
    try {
      const history = await VisitorEditHistory.findByVisitorId(id, {
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      const totalCount = await VisitorEditHistory.getCount(id);
      console.log(`✅ Found ${history.length} edit history records for visitor ${id}`);

      // Format the history data for frontend
      const formattedHistory = history.map(record => ({
        id: record.id,
        timestamp: record.timestamp,
        user: record.user_name || record.user || 'Unknown User',
        user_id: record.user_id,
        user_role: record.user_role,
        user_email: record.user_email,
        user_avatar: record.user_avatar,
        changes: record.changes || {},
        original: record.original || {},
        visitor_id: record.visitor_id
      }));

      res.json({
        success: true,
        data: formattedHistory,
        pagination: {
          total: totalCount,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (parseInt(offset) + formattedHistory.length) < totalCount
        },
        message: `Found ${formattedHistory.length} edit history records`
      });

    } catch (historyError) {
      console.error('Error loading edit history:', historyError);
      // Return empty result if history loading fails
      res.json({
        success: true,
        data: [],
        pagination: { total: 0, limit: parseInt(limit), offset: parseInt(offset), hasMore: false },
        message: 'Edit history temporarily unavailable'
      });
    }

  } catch (error) {
    console.error('❌ Error fetching visitor edit history:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching edit history',
      error: error.message
    });
  }
});

// Test endpoint for debugging edit history issues
router.post('/:id/edit-history-test', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🧪 TEST ENDPOINT - Simple hardcoded insert');
    
    const connection = await db.getConnection();
    
    try {
      const result = await connection.execute(
        `INSERT INTO visitor_edit_history (visitor_id, user_id, user, changes, original, timestamp) VALUES (?, ?, ?, ?, ?, NOW())`,
        [40, 1, 'test@example.com', '{"test": "value"}', '{"original": "value"}']
      );
      
      connection.release();
      
      res.json({
        success: true,
        message: 'Test insert successful',
        data: { id: result.insertId }
      });
      
    } catch (error) {
      connection.release();
      throw error;
    }
    
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Test endpoint failed',
      error: error.message
    });
  }
});

// Save visitor edit history
router.post('/:id/edit-history', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { changes, original } = req.body;

    console.log(`💾 Saving edit history for visitor ${id}`);

    // Validate visitor exists
    const visitor = await Visitor.findById(id);
    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: 'Visitor not found'
      });
    }

    // Create edit history record
    const editHistoryData = {
      visitor_id: parseInt(id, 10),
      user_id: req.user?.id || null,
      user: req.user?.email || req.user?.name || 'System User',
      changes: changes || {},
      original: original || {}
    };

    const historyId = await VisitorEditHistory.create(editHistoryData);
    
    console.log(`✅ Edit history saved with ID ${historyId} for visitor ${id}`);

    res.json({
      success: true,
      message: 'Edit history saved successfully',
      data: { id: historyId }
    });

  } catch (error) {
    console.error('❌ Error saving visitor edit history:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while saving edit history',
      error: error.message
    });
  }
});

// Delete visitor (Admin can delete any, Receptionist can only delete their own)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body; // Add reason from request body
    const currentUser = req.user;

    // Check if visitor exists
    const existingVisitor = await Visitor.findById(id);
    if (!existingVisitor) {
      return res.status(404).json({
        success: false,
        message: 'Visitor not found'
      });
    }

    // Permission check:
    // - Admin/Manager can delete any visitor
    // - Receptionist/Operator/Staff can only delete visitors they created
    const isAdmin = ['Admin', 'Manager'].includes(currentUser.role);
    const isOwner = existingVisitor.input_by_user_id === currentUser.id;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete visitors that you created'
      });
    }

    // All users (including admin) must submit deletion request for approval workflow
    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Deletion reason is required and must be at least 10 characters'
      });
    }

    // Import DeletionRequest model
    const { DeletionRequest } = await import('../models/DeletionRequest.js');
    
    // Create deletion request for all users
    const deletionRequest = await DeletionRequest.create({
      visitor_id: id,
      requested_by: currentUser.id,
      reason: reason.trim()
    });

    const message = isAdmin 
      ? 'Deletion request submitted successfully. You can approve it in visitor management.'
      : 'Deletion request submitted successfully. An admin will review your request.';

    return res.json({
      success: true,
      message: message,
      data: { deletion_request_id: deletionRequest.id }
    });

  } catch (error) {
    console.error('Delete visitor error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting visitor'
    });
  }
});

// Soft delete visitor
router.patch('/:id/soft-delete', authenticateToken, authorizeRole(['Admin', 'Manager']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const visitor = await Visitor.findById(id);
    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: 'Visitor not found'
      });
    }

    // Implement soft delete logic here - add a deleted_at field or is_deleted flag
    // This depends on your database schema
    await Visitor.softDelete(id);

    res.json({
      success: true,
      message: 'Visitor soft deleted successfully'
    });
  } catch (error) {
    console.error('Soft delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to soft delete visitor'
    });
  }
});

// Restore soft deleted visitor
router.patch('/:id/restore', authenticateToken, authorizeRole(['Admin', 'Manager']), async (req, res) => {
  try {
    const { id } = req.params;
    
    await Visitor.restore(id);

    res.json({
      success: true,
      message: 'Visitor restored successfully'
    });
  } catch (error) {
    console.error('Restore error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore visitor'
    });
  }
});

// Permanent delete visitor
router.delete('/:id/permanent', authenticateToken, authorizeRole(['Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const visitor = await Visitor.findById(id);
    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: 'Visitor not found'
      });
    }

    // Clean up associated files if they exist
    if (visitor.photo_url) {
      try {
        await FileUtils.deleteFile(visitor.photo_url);
      } catch (fileError) {
        console.warn('Failed to delete photo file:', fileError);
      }
    }

    if (visitor.signature_url) {
      try {
        await FileUtils.deleteFile(visitor.signature_url);
      } catch (fileError) {
        console.warn('Failed to delete signature file:', fileError);
      }
    }

    await Visitor.permanentDelete(id);

    res.json({
      success: true,
      message: 'Visitor permanently deleted'
    });
  } catch (error) {
    console.error('Permanent delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to permanently delete visitor'
    });
  }
});

// Generate and download visitor report (DOCX)
router.get('/:id/report', authenticateToken, authorizeRole(['Admin', 'Receptionist']), async (req, res) => {
  try {
    const { id } = req.params;

    // Get visitor data
    const visitor = await Visitor.findById(id);
    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: 'Visitor not found'
      });
    }

    // Check if DocxService is available
    if (!DocxService || typeof DocxService.generateVisitorReport !== 'function') {
      console.error('DocxService not available or generateVisitorReport method missing');
      return res.status(503).json({
        success: false,
        message: 'Document generation service is currently unavailable'
      });
    }

    // Generate DOCX report
    const reportResult = await DocxService.generateVisitorReport(visitor);

    if (!reportResult || !reportResult.filePath) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate report file'
      });
    }

    // Check if file exists
    const fs = await import('fs');
    if (!fs.existsSync(reportResult.filePath)) {
      return res.status(500).json({
        success: false,
        message: 'Generated report file not found'
      });
    }

    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${reportResult.fileName}"`);

    // Send the file
    res.sendFile(reportResult.filePath);

  } catch (error) {
    console.error('Generate report error:', error);
    
    // More specific error handling
    if (error.code === 'ENOENT') {
      return res.status(500).json({
        success: false,
        message: 'Template file not found'
      });
    }
    
    if (error.message.includes('DocxService')) {
      return res.status(503).json({
        success: false,
        message: 'Document generation service error'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to generate visitor report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Alternative endpoint for download-docx (alias for report)
router.get('/:id/download-docx', authenticateToken, authorizeRole(['Admin', 'Receptionist']), async (req, res) => {
  try {
    const { id } = req.params;

    // Get visitor data
    const visitor = await Visitor.findById(id);
    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: 'Visitor not found'
      });
    }

    // Generate DOCX report
    const reportResult = await DocxService.generateVisitorReport(visitor);

    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${reportResult.fileName}"`);

    // Send the file
    res.sendFile(reportResult.filePath);

  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate visitor report'
    });
  }
});

// Generate and download document request (DOCX)
router.get('/:id/document-request', authenticateToken, authorizeRole(['Admin', 'Receptionist']), async (req, res) => {
  try {
    const { id } = req.params;

    // Get visitor data
    const visitor = await Visitor.findById(id);
    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: 'Visitor not found'
      });
    }

    // Check if visitor has requested a document
    if (!visitor.request_document) {
      return res.status(400).json({
        success: false,
        message: 'No document was requested for this visitor'
      });
    }

    // Check if DocxService is available
    if (!DocxService || typeof DocxService.generateDocumentRequest !== 'function') {
      console.error('DocxService not available or generateDocumentRequest method missing');
      return res.status(503).json({
        success: false,
        message: 'Document generation service is currently unavailable'
      });
    }

    // Generate DOCX document request
    const documentResult = await DocxService.generateDocumentRequest(visitor);

    if (!documentResult || !documentResult.filePath) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate document request file'
      });
    }

    // Check if file exists
    const fs = await import('fs');
    if (!fs.existsSync(documentResult.filePath)) {
      return res.status(500).json({
        success: false,
        message: 'Generated document request file not found'
      });
    }

    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${documentResult.fileName}"`);

    // Send the file
    res.sendFile(documentResult.filePath);

  } catch (error) {
    console.error('Generate document request error:', error);
    
    // More specific error handling
    if (error.code === 'ENOENT') {
      return res.status(500).json({
        success: false,
        message: 'Template file not found'
      });
    }
    
    if (error.message.includes('DocxService')) {
      return res.status(503).json({
        success: false,
        message: 'Document generation service error'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to generate document request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get visitor by ID (public access for testing)
router.get('/public/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const visitor = await Visitor.findById(id);
    
    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: 'Visitor not found'
      });
    }    // Map database fields to frontend expected fields
    const mappedVisitor = {
      id: visitor.id,
      name: visitor.full_name,
      phone: visitor.phone_number,
      email: visitor.email,
      institution: visitor.institution,
      purpose: visitor.purpose,
      unit: visitor.location,
      person_to_meet: visitor.person_to_meet,
      id_number: visitor.id_number,
      address: visitor.address,
      id_type: visitor.id_type,
      id_number: visitor.id_number,
      check_in_time: visitor.check_in_time,
      check_out_time: visitor.check_out_time,
      photo_url: visitor.photo_url,
      signature_url: visitor.signature_url,
      created_at: visitor.created_at,
      updated_at: visitor.updated_at,
      request_document: visitor.request_document,
      document_type: visitor.document_type,
      document_name: visitor.document_name,
      document_number: visitor.document_number,
      document_details: visitor.document_details,
      document_notes: visitor.document_notes,
      operator_name: visitor.input_by_name,
      operator_email: visitor.input_by_email,
      operator_role: visitor.input_by_role,
      operator_avatar: visitor.input_by_avatar || visitor.input_by_photo,
      operator_photo_url: visitor.operator_photo_url,
      input_by_avatar: visitor.input_by_avatar
    };

    res.json(mappedVisitor);
  } catch (error) {
    console.error('Get visitor error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching visitor'
    });
  }
});


export default router;
