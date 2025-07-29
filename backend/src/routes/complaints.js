import express from 'express';
import db from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { uploadComplaintPhoto, uploadComplaintPhotos, handleUploadError } from '../middleware/upload.js';
import path from 'path';

const router = express.Router();

// Get all complaints (admin only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        c.*,
        cc.name as category_name,
        cc.color as category_color,
        u.name as assigned_to_name,
        v.full_name as visitor_full_name,
        v.phone_number as complainant_phone_number,
        v.institution as visitor_institution
      FROM complaints c
      LEFT JOIN complaint_categories cc ON c.category_id = cc.id
      LEFT JOIN users u ON c.assigned_to = u.id
      LEFT JOIN visitors v ON c.complainant_id = v.id
      ORDER BY c.created_at DESC
    `;
    
    const [rows] = await db.execute(query);
    
    // Map database column names to frontend expected names and handle form_data
    const mappedRows = rows.map(row => {
      // form_data is already parsed as object by MySQL JSON type
      // No need to JSON.parse() since MySQL returns it as object
      const formData = row.form_data || {};
      
      return {
        ...row,
        name: row.complainant_name,
        email: row.complainant_email,
        phone: row.complainant_phone,
        form_data: formData,
        photo_urls: row.photo_urls, // Map database field to frontend expected field
        // Keep original columns for backward compatibility
        complainant_name: row.complainant_name,
        complainant_email: row.complainant_email,
        complainant_phone: row.complainant_phone
      };
    });
    
    res.json({
      success: true,
      data: mappedRows
    });
  } catch (error) {
    console.error('Error fetching complaints:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch complaints'
    });
  }
});

// Get single complaint by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        c.*,
        cc.name as category_name,
        cc.color as category_color,
        u.name as assigned_to_name,
        v.full_name as visitor_full_name,
        v.phone_number as complainant_phone_number,
        v.institution as visitor_institution
      FROM complaints c
      LEFT JOIN complaint_categories cc ON c.category_id = cc.id
      LEFT JOIN users u ON c.assigned_to = u.id
      LEFT JOIN visitors v ON c.complainant_id = v.id
      WHERE c.id = ?
    `;
    
    const [rows] = await db.execute(query, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    // Get responses for this complaint
    const responseQuery = `
      SELECT 
        cr.*,
        u.name as user_name,
        u.role as user_role
      FROM complaint_responses cr
      LEFT JOIN users u ON cr.user_id = u.id
      WHERE cr.complaint_id = ?
      ORDER BY cr.created_at ASC
    `;

    const [responses] = await db.execute(responseQuery, [id]);

    const complaint = rows[0];
    
    // form_data is already parsed as object by MySQL JSON type
    // No need to JSON.parse() since MySQL returns it as object
    if (!complaint.form_data) {
      complaint.form_data = {};
    }
    
    // Map database column names to frontend expected names
    complaint.name = complaint.complainant_name;
    complaint.email = complaint.complainant_email;
    complaint.phone = complaint.complainant_phone;
    complaint.photo_urls = complaint.photo_urls; // Map database field to frontend expected field
    complaint.responses = responses;

    res.json({
      success: true,
      data: complaint
    });
  } catch (error) {
    console.error('Error fetching complaint:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch complaint'
    });
  }
});

// Create new complaint (public endpoint) - handles both single and multiple photos
router.post('/submit', uploadComplaintPhotos, handleUploadError, async (req, res) => {
  try {
    console.log('📝 Complaint submission received:', req.body);
    
    const {
      complainant_id,
      complainant_name,
      complainant_email,
      complainant_phone,
      name, // Frontend might send 'name' - map to complainant_name
      email, // Frontend might send 'email' - map to complainant_email  
      phone, // Frontend might send 'phone' - map to complainant_phone
      category_id,
      priority = 'medium',
      subject,
      description,
      form_data
    } = req.body;

    // Use new field names first, fall back to legacy names for backward compatibility
    const finalComplainantName = complainant_name || name;
    const finalComplainantEmail = complainant_email || email;
    const finalComplainantPhone = complainant_phone || phone;

    // Handle uploaded photos (multiple photos upload)
    let photoUrls = [];
    
    if (req.files && req.files.length > 0) {
      // Multiple photos
      photoUrls = req.files.map(file => `/uploads/complaints/${file.filename}`);
    }

    // Validation
    if (!finalComplainantName || !subject || !description) {
      return res.status(400).json({
        success: false,
        message: 'Complainant name, subject, and description are required'
      });
    }

    const query = `
      INSERT INTO complaints (
        complainant_id, complainant_name, complainant_email, complainant_phone,
        category_id, priority, subject, description, form_data, 
        photo_urls, ticket_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Generate ticket number based on expected ID
    const [maxIdResult] = await db.execute('SELECT MAX(id) as maxId FROM complaints');
    const nextId = (maxIdResult[0].maxId || 0) + 1;
    const ticketNumber = `COMP-${String(nextId).padStart(6, '0')}`;

    const [result] = await db.execute(query, [
      complainant_id || null,
      finalComplainantName,
      finalComplainantEmail || null,
      finalComplainantPhone || null,
      category_id || null,
      priority,
      subject,
      description,
      JSON.stringify(form_data) || null,
      photoUrls.length > 0 ? JSON.stringify(photoUrls) : null, // Store as JSON array for multiple photos
      ticketNumber
    ]);

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully',
      data: {
        id: result.insertId,
        ticket_number: ticketNumber,
        photo_urls: photoUrls
      }
    });
  } catch (error) {
    console.error('Error creating complaint:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit complaint'
    });
  }
});

// Update complaint status
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assigned_to } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const updates = ['status = ?'];
    const values = [status];

    if (assigned_to !== undefined) {
      updates.push('assigned_to = ?');
      values.push(assigned_to || null);
    }

    if (status === 'resolved' || status === 'closed') {
      updates.push('resolved_at = NOW()');
    }

    values.push(id);

    const query = `UPDATE complaints SET ${updates.join(', ')} WHERE id = ?`;
    
    const [result] = await db.execute(query, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    res.json({
      success: true,
      message: 'Complaint updated successfully'
    });
  } catch (error) {
    console.error('Error updating complaint:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update complaint'
    });
  }
});

// Add response to complaint
router.post('/:id/responses', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { response_text, is_internal = false } = req.body;
    const user_id = req.user.id;

    if (!response_text) {
      return res.status(400).json({
        success: false,
        message: 'Response text is required'
      });
    }

    const query = `
      INSERT INTO complaint_responses (complaint_id, user_id, response_text, is_internal)
      VALUES (?, ?, ?, ?)
    `;

    await db.execute(query, [id, user_id, response_text, is_internal]);

    res.status(201).json({
      success: true,
      message: 'Response added successfully'
    });
  } catch (error) {
    console.error('Error adding response:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add response'
    });
  }
});

// Get complaint categories
router.get('/categories/list', async (req, res) => {
  try {
    const query = 'SELECT * FROM complaint_categories WHERE is_active = 1 ORDER BY name';
    const [rows] = await db.execute(query);
    
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching complaint categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
});

// Get dynamic fields
router.get('/fields/list', async (req, res) => {
  try {
    // Use CAST to get proper JSON from MySQL 
    const query = `
      SELECT 
        id, field_name, field_label, field_type,
        CAST(field_options AS JSON) as field_options,
        is_required, field_order, is_active
      FROM complaint_fields 
      WHERE is_active = 1 
      ORDER BY field_order, field_name
    `;
    const [rows] = await db.execute(query);
    
    // Process each field with safe JSON parsing
    const fields = rows.map(field => {
      let parsedOptions = null;
      
      if (field.field_options) {
        try {
          // If it's already parsed by MySQL JSON type, use it directly
          if (Array.isArray(field.field_options)) {
            parsedOptions = field.field_options;
          } else if (typeof field.field_options === 'string') {
            // Try to parse as JSON string
            parsedOptions = JSON.parse(field.field_options);
          } else {
            // If it's an object, use as is
            parsedOptions = field.field_options;
          }
        } catch (e) {
          // If parsing fails, treat as comma-separated string
          console.warn(`Invalid JSON in field_options for field ${field.field_name}:`, field.field_options);
          if (typeof field.field_options === 'string') {
            parsedOptions = field.field_options.split(',').map(opt => opt.trim());
          } else {
            parsedOptions = null;
          }
        }
      }
      
      return {
        ...field,
        field_options: parsedOptions
      };
    });

    res.json({
      success: true,
      data: fields
    });
  } catch (error) {
    console.error('Error fetching complaint fields:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch fields'
    });
  }
});

// Stats endpoint
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const queries = [
      'SELECT COUNT(*) as total FROM complaints',
      'SELECT COUNT(*) as open FROM complaints WHERE status = "open"',
      'SELECT COUNT(*) as in_progress FROM complaints WHERE status = "in_progress"',
      'SELECT COUNT(*) as resolved FROM complaints WHERE status = "resolved"',
      'SELECT COUNT(*) as closed FROM complaints WHERE status = "closed"',
      'SELECT COUNT(*) as this_month FROM complaints WHERE MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW())'
    ];

    const results = await Promise.all(
      queries.map(query => db.execute(query))
    );

    const stats = {
      total: results[0][0][0].total,
      open: results[1][0][0].open,
      in_progress: results[2][0][0].in_progress,
      resolved: results[3][0][0].resolved,
      closed: results[4][0][0].closed,
      this_month: results[5][0][0].this_month
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching complaint stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stats'
    });
  }
});

// Get all fields (including inactive for management)
router.get('/fields/all', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        id, field_name, field_label, field_type,
        CAST(field_options AS JSON) as field_options,
        is_required, field_order, is_active,
        placeholder, help_text, validation_rules,
        created_at, updated_at
      FROM complaint_fields 
      ORDER BY field_order, field_name
    `;
    const [rows] = await db.execute(query);
    
    // Process each field with safe JSON parsing
    const fields = rows.map(field => {
      let parsedOptions = null;
      
      if (field.field_options) {
        try {
          if (Array.isArray(field.field_options)) {
            parsedOptions = field.field_options;
          } else if (typeof field.field_options === 'string') {
            parsedOptions = JSON.parse(field.field_options);
          } else {
            parsedOptions = field.field_options;
          }
        } catch (e) {
          console.warn(`Invalid JSON in field_options for field ${field.field_name}:`, field.field_options);
          if (typeof field.field_options === 'string') {
            parsedOptions = field.field_options.split(',').map(opt => opt.trim());
          } else {
            parsedOptions = null;
          }
        }
      }
      
      return {
        ...field,
        field_options: parsedOptions
      };
    });

    res.json({
      success: true,
      data: fields
    });
  } catch (error) {
    console.error('Error fetching all complaint fields:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch fields'
    });
  }
});

// Create new field
router.post('/fields', authenticateToken, async (req, res) => {
  try {
    const {
      field_name,
      field_label,
      field_type,
      field_options,
      is_required = false,
      field_order = 1,
      is_active = true,
      placeholder = '',
      help_text = '',
      validation_rules = ''
    } = req.body;

    // Validation
    if (!field_name || !field_label || !field_type) {
      return res.status(400).json({
        success: false,
        message: 'Field name, label, and type are required'
      });
    }

    // Check if field name already exists
    const [existing] = await db.execute(
      'SELECT id FROM complaint_fields WHERE field_name = ?',
      [field_name]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Field name already exists'
      });
    }

    const query = `
      INSERT INTO complaint_fields (
        field_name, field_label, field_type, field_options,
        is_required, field_order, is_active, placeholder, help_text, validation_rules
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.execute(query, [
      field_name,
      field_label,
      field_type,
      field_options ? JSON.stringify(field_options) : null,
      is_required,
      field_order,
      is_active,
      placeholder,
      help_text,
      validation_rules
    ]);

    res.status(201).json({
      success: true,
      message: 'Field created successfully',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Error creating complaint field:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create field'
    });
  }
});

// Update field
router.put('/fields/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      field_name,
      field_label,
      field_type,
      field_options,
      is_required,
      field_order,
      is_active,
      placeholder,
      help_text,
      validation_rules
    } = req.body;

    // Check if field exists
    const [existing] = await db.execute(
      'SELECT id FROM complaint_fields WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Field not found'
      });
    }

    // Check if new field name conflicts with existing (excluding current)
    if (field_name) {
      const [conflicts] = await db.execute(
        'SELECT id FROM complaint_fields WHERE field_name = ? AND id != ?',
        [field_name, id]
      );

      if (conflicts.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Field name already exists'
        });
      }
    }

    const updates = [];
    const values = [];

    if (field_name !== undefined) {
      updates.push('field_name = ?');
      values.push(field_name);
    }
    if (field_label !== undefined) {
      updates.push('field_label = ?');
      values.push(field_label);
    }
    if (field_type !== undefined) {
      updates.push('field_type = ?');
      values.push(field_type);
    }
    if (field_options !== undefined) {
      updates.push('field_options = ?');
      values.push(field_options ? JSON.stringify(field_options) : null);
    }
    if (is_required !== undefined) {
      updates.push('is_required = ?');
      values.push(is_required);
    }
    if (field_order !== undefined) {
      updates.push('field_order = ?');
      values.push(field_order);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active);
    }
    if (placeholder !== undefined) {
      updates.push('placeholder = ?');
      values.push(placeholder);
    }
    if (help_text !== undefined) {
      updates.push('help_text = ?');
      values.push(help_text);
    }
    if (validation_rules !== undefined) {
      updates.push('validation_rules = ?');
      values.push(validation_rules);
    }

    updates.push('updated_at = NOW()');
    values.push(id);

    const query = `UPDATE complaint_fields SET ${updates.join(', ')} WHERE id = ?`;
    
    await db.execute(query, values);

    res.json({
      success: true,
      message: 'Field updated successfully'
    });
  } catch (error) {
    console.error('Error updating complaint field:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update field'
    });
  }
});

// Delete field
router.delete('/fields/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.execute(
      'DELETE FROM complaint_fields WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Field not found'
      });
    }

    res.json({
      success: true,
      message: 'Field deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting complaint field:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete field'
    });
  }
});

// Toggle field active status
router.patch('/fields/:id/toggle', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const [result] = await db.execute(
      'UPDATE complaint_fields SET is_active = ?, updated_at = NOW() WHERE id = ?',
      [is_active, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Field not found'
      });
    }

    res.json({
      success: true,
      message: 'Field status updated successfully'
    });
  } catch (error) {
    console.error('Error toggling field status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update field status'
    });
  }
});

// Update field order
router.patch('/fields/:id/order', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { field_order } = req.body;

    const [result] = await db.execute(
      'UPDATE complaint_fields SET field_order = ?, updated_at = NOW() WHERE id = ?',
      [field_order, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Field not found'
      });
    }

    res.json({
      success: true,
      message: 'Field order updated successfully'
    });
  } catch (error) {
    console.error('Error updating field order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update field order'
    });
  }
});

export default router;
