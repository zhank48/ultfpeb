import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { LostItemDocxService } from '../services/LostItemDocxService.js';
import { FileStructureManager } from '../utils/fileStructure.js';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Create lost_items table if not exists
const createLostItemsTable = async () => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS lost_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        item_name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        found_location VARCHAR(255) NOT NULL,
        found_date DATE NOT NULL,
        found_time TIME NOT NULL,
        finder_name VARCHAR(255),
        finder_contact VARCHAR(100),
        found_by VARCHAR(255),
        condition_status ENUM('excellent', 'good', 'fair', 'poor') DEFAULT 'good',
        handover_photo_url VARCHAR(500),
        handover_signature_data TEXT,
        status ENUM('found', 'returned', 'disposed') DEFAULT 'found',
        notes TEXT,
        input_by_user_id INT UNSIGNED,
        received_by_operator VARCHAR(255),
        received_by_operator_id INT UNSIGNED,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (input_by_user_id) REFERENCES users(id),
        FOREIGN KEY (received_by_operator_id) REFERENCES users(id)
      )
    `);
    
    
    // Create returns table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS item_returns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lost_item_id INT NOT NULL,
        claimer_name VARCHAR(255) NOT NULL,
        claimer_contact VARCHAR(100) NOT NULL,
        claimer_id_number VARCHAR(100) NOT NULL,
        relationship_to_owner ENUM('owner', 'family', 'friend', 'colleague', 'representative') DEFAULT 'owner',
        proof_of_ownership TEXT,
        return_date DATE NOT NULL,
        return_time TIME NOT NULL,
        returned_by VARCHAR(255),
        returned_by_user_id INT UNSIGNED,
        return_operator VARCHAR(255),
        return_operator_id INT UNSIGNED,
        return_photo_url VARCHAR(500),
        return_signature_data TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lost_item_id) REFERENCES lost_items(id),
        FOREIGN KEY (returned_by_user_id) REFERENCES users(id),
        FOREIGN KEY (return_operator_id) REFERENCES users(id)
      )
    `);

    // Create history table for tracking changes
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS lost_item_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lost_item_id INT NOT NULL,
        action_type ENUM('created', 'updated', 'status_changed', 'returned', 'reverted') NOT NULL,
        old_data JSON,
        new_data JSON,
        changed_fields TEXT,
        user_id INT UNSIGNED,
        user_name VARCHAR(255),
        ip_address VARCHAR(45),
        user_agent TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lost_item_id) REFERENCES lost_items(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    
    console.log('✅ Lost items tables ready');
  } catch (error) {
    console.error('❌ Error creating lost items tables:', error);
  }
};

// Helper function to log history changes
const logHistoryChange = async (lostItemId, actionType, oldData, newData, userId, userName, req, notes = null) => {
  try {
    const changedFields = [];
    if (oldData && newData) {
      Object.keys(newData).forEach(key => {
        if (oldData[key] !== newData[key]) {
          changedFields.push(key);
        }
      });
    }

    await pool.execute(`
      INSERT INTO lost_item_history (
        lost_item_id, action_type, old_data, new_data, changed_fields,
        user_id, user_name, ip_address, user_agent, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      lostItemId,
      actionType,
      oldData ? JSON.stringify(oldData) : null,
      newData ? JSON.stringify(newData) : null,
      changedFields.join(', '),
      userId,
      userName,
      req?.ip || null,
      req?.get('User-Agent') || null,
      notes
    ]);

    console.log(`📝 History logged: ${actionType} for item ${lostItemId} by ${userName}`);
  } catch (error) {
    console.error('❌ Error logging history:', error);
    // Don't throw error to not break main operation
  }
};

// Initialize tables and folder structure
createLostItemsTable();
FileStructureManager.createLostItemFolders();

// Get all lost items
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, category, limit = 50 } = req.query;
    
    let query = `
      SELECT li.*, u.name as input_by_name,
             ro.name as received_by_operator_name,
             ir.claimer_name, ir.return_date, ir.returned_by,
             reto.name as return_operator_name,
             ir.return_photo_url, ir.return_signature_data
      FROM lost_items li
      LEFT JOIN users u ON li.input_by_user_id = u.id
      LEFT JOIN users ro ON li.received_by_operator_id = ro.id
      LEFT JOIN item_returns ir ON li.id = ir.lost_item_id
      LEFT JOIN users reto ON ir.return_operator_id = reto.id
    `;
    
    const conditions = [];
    const params = [];
    
    if (status) {
      conditions.push('li.status = ?');
      params.push(status);
    }
    
    if (category) {
      conditions.push('li.category = ?');
      params.push(category);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    const limitNumber = parseInt(limit) || 50; // Ensure valid number or default to 50
    query += ` ORDER BY li.created_at DESC LIMIT ${limitNumber}`;
    
    const [rows] = await pool.execute(query, params);
    
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching lost items:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching lost items'
    });
  }
});

// Get single lost item
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [rows] = await pool.execute(`
      SELECT li.*, u.name as input_by_name,
             ro.name as received_by_operator_name,
             ir.claimer_name, ir.claimer_contact, ir.return_date, ir.returned_by,
             ir.return_operator, reto.name as return_operator_name,
             ir.return_photo_url, ir.return_signature_data
      FROM lost_items li
      LEFT JOIN users u ON li.input_by_user_id = u.id
      LEFT JOIN users ro ON li.received_by_operator_id = ro.id
      LEFT JOIN item_returns ir ON li.id = ir.lost_item_id
      LEFT JOIN users reto ON ir.return_operator_id = reto.id
      WHERE li.id = ?
    `, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Lost item not found'
      });
    }
    
    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error fetching lost item:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching lost item'
    });
  }
});

// Register new lost item
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      item_name,
      description,
      category,
      found_location,
      found_date,
      found_time,
      finder_name,
      finder_contact,
      found_by,
      condition_status,
      handover_photo_url: handover_photo_data,
      handover_signature_data,
      notes,
      input_by_user_id,
      received_by_operator,
      received_by_operator_id
    } = req.body;
    
    // Validate required fields
    if (!item_name || !found_location || !found_date || !found_time) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Handle photo upload if provided - save as file and get URL
    let handover_photo_url = null;
    if (handover_photo_data && handover_photo_data.startsWith('data:image/')) {
      try {
        const base64Data = handover_photo_data.replace(/^data:image\/[a-z]+;base64,/, '');
        const photoBuffer = Buffer.from(base64Data, 'base64');
        
        // Ensure directory exists for handover photos
        const photoDir = path.join(__dirname, '../../uploads/lost-items/handover/photos');
        if (!fs.existsSync(photoDir)) {
          fs.mkdirSync(photoDir, { recursive: true });
        }
        
        // Create unique filename
        const photoFileName = `handover_photo_${Date.now()}.jpg`;
        const photoPath = path.join(photoDir, photoFileName);
        
        // Save photo file
        fs.writeFileSync(photoPath, photoBuffer);
        handover_photo_url = `/uploads/lost-items/handover/photos/${photoFileName}`;
        console.log('📸 Handover photo saved:', handover_photo_url);
      } catch (photoError) {
        console.error('❌ Error saving handover photo:', photoError);
        // Continue without photo if save fails
      }
    }

    // Handle signature - keep as base64 in database for now
    let handover_signature_final = null;
    if (handover_signature_data && handover_signature_data.startsWith('data:image/')) {
      handover_signature_final = handover_signature_data;
      console.log('✍️ Handover signature data processed');
    }
    
    const [result] = await pool.execute(`
      INSERT INTO lost_items (
        item_name, description, category, found_location, found_date, found_time,
        finder_name, finder_contact, found_by, condition_status, handover_photo_url, handover_signature_data, notes, 
        input_by_user_id, received_by_operator, received_by_operator_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      item_name, 
      description || null, 
      category || null, 
      found_location, 
      found_date, 
      found_time,
      finder_name || null, 
      finder_contact || null, 
      found_by || null, 
      condition_status || 'good', 
      handover_photo_url || null, 
      handover_signature_final || null, 
      notes || null, 
      input_by_user_id || null, 
      received_by_operator || null, 
      received_by_operator_id || null
    ]);
    
    res.status(201).json({
      success: true,
      message: 'Lost item registered successfully',
      data: {
        id: result.insertId,
        item_name,
        found_location,
        found_date,
        status: 'found',
        handover_photo_url: handover_photo_url,
        has_signature: !!handover_signature_final
      }
    });
  } catch (error) {
    console.error('Error registering lost item:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while registering lost item'
    });
  }
});

// Return item to owner
router.post('/:id/return', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      claimer_name,
      claimer_contact,
      claimer_id_number,
      relationship_to_owner,
      proof_of_ownership,
      return_date,
      return_time,
      returned_by,
      returned_by_user_id,
      return_operator,
      return_operator_id,
      return_photo_url,
      return_signature_data,
      notes
    } = req.body;
    
    // Validate required fields
    if (!claimer_name || !claimer_contact || !claimer_id_number || !return_date || !return_time) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Check if item exists and is available for return
    const [itemRows] = await pool.execute('SELECT * FROM lost_items WHERE id = ? AND status = "found"', [id]);
    
    if (itemRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found or already returned'
      });
    }
    
    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Update item status to returned
      await connection.execute('UPDATE lost_items SET status = "returned" WHERE id = ?', [id]);
      
      // Record the return (ensure no undefined values)
      await connection.execute(`
        INSERT INTO item_returns (
          lost_item_id, claimer_name, claimer_contact, claimer_id_number,
          relationship_to_owner, proof_of_ownership, return_date, return_time,
          returned_by, returned_by_user_id, return_operator, return_operator_id,
          return_photo_url, return_signature_data, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id, 
        claimer_name, 
        claimer_contact, 
        claimer_id_number,
        relationship_to_owner || null, 
        proof_of_ownership || null, 
        return_date, 
        return_time,
        returned_by || null, 
        returned_by_user_id || null, 
        return_operator || null, 
        return_operator_id || null,
        return_photo_url || null, 
        return_signature_data || null, 
        notes || null
      ]);
      
      await connection.commit();
      
      res.json({
        success: true,
        message: 'Item returned successfully',
        data: {
          item_id: id,
          claimer_name,
          return_date,
          return_time
        }
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error returning item:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while returning item'
    });
  }
});

// Update lost item
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      item_name,
      description,
      category,
      found_location,
      finder_name,
      finder_contact,
      condition_status,
      notes,
      status,
      updated_by
    } = req.body;
    
    console.log('📝 Updating lost item ID:', id);
    console.log('📝 Update data:', { item_name, description, category, found_location, finder_name, finder_contact, condition_status, notes, status, updated_by });
    
    // Get current data for history tracking
    const [currentRows] = await pool.execute('SELECT * FROM lost_items WHERE id = ?', [id]);
    
    if (currentRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Lost item not found'
      });
    }
    
    const currentData = currentRows[0];
    
    const [result] = await pool.execute(`
      UPDATE lost_items SET
        item_name = COALESCE(?, item_name),
        description = COALESCE(?, description),
        category = COALESCE(?, category),
        found_location = COALESCE(?, found_location),
        finder_name = COALESCE(?, finder_name),
        finder_contact = COALESCE(?, finder_contact),
        condition_status = COALESCE(?, condition_status),
        notes = COALESCE(?, notes),
        status = COALESCE(?, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      item_name || null, 
      description || null, 
      category || null, 
      found_location || null, 
      finder_name || null, 
      finder_contact || null, 
      condition_status || null, 
      notes || null, 
      status || null, 
      id
    ]);
    
    // Create new data object for comparison
    const newData = {
      item_name: item_name || currentData.item_name,
      description: description || currentData.description,
      category: category || currentData.category,
      found_location: found_location || currentData.found_location,
      finder_name: finder_name || currentData.finder_name,
      finder_contact: finder_contact || currentData.finder_contact,
      condition_status: condition_status || currentData.condition_status,
      notes: notes || currentData.notes,
      status: status || currentData.status
    };
    
    // Log the change for history
    const actionType = status && status !== currentData.status ? 'status_changed' : 'updated';
    await logHistoryChange(
      id,
      actionType,
      currentData,
      newData,
      updated_by || req.user?.id,
      req.user?.name || 'Unknown',
      req,
      status && status !== currentData.status ? `Status changed from ${currentData.status} to ${status}` : 'Item updated'
    );
    
    console.log(`✅ Lost item ${id} updated by user ${updated_by || req.user?.id}`);
    
    res.json({
      success: true,
      message: 'Lost item updated successfully'
    });
  } catch (error) {
    console.error('Error updating lost item:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating lost item'
    });
  }
});

// Process item return
router.put('/:id/return', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      claimer_name,
      claimer_contact,
      claimer_id_number = '',
      relationship_to_owner = 'owner',
      return_notes = '',
      return_photo,
      return_signature,
      return_date,
      updated_by
    } = req.body;

    console.log('📝 Processing return for item ID:', id);
    console.log('📝 Return data received:', {
      claimer_name,
      claimer_contact,
      claimer_id_number,
      relationship_to_owner,
      return_notes: return_notes.length > 0 ? `${return_notes.substring(0, 50)}...` : 'Empty',
      return_photo: return_photo ? 'BASE64_DATA_PRESENT' : 'NULL',
      return_signature: return_signature ? 'BASE64_DATA_PRESENT' : 'NULL',
      return_date,
      updated_by
    });

    const currentDate = return_date || new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().split(' ')[0];

    let return_photo_url = null;
    let return_signature_data = null;

    // Handle photo upload if provided
    if (return_photo && return_photo.startsWith('data:image/')) {
      try {
        const base64Data = return_photo.replace(/^data:image\/[a-z]+;base64,/, '');
        const photoBuffer = Buffer.from(base64Data, 'base64');
        const photoFileName = `return_photo_${id}_${Date.now()}.jpg`;
        const photoPath = path.join(__dirname, '../../uploads/return_photos', photoFileName);
        
        // Ensure directory exists
        const photoDir = path.dirname(photoPath);
        if (!fs.existsSync(photoDir)) {
          fs.mkdirSync(photoDir, { recursive: true });
        }
        
        fs.writeFileSync(photoPath, photoBuffer);
        return_photo_url = `/uploads/return_photos/${photoFileName}`;
        console.log('📸 Return photo saved:', return_photo_url);
      } catch (photoError) {
        console.error('❌ Error saving return photo:', photoError);
        // Continue without photo if save fails
      }
    }

    // Handle signature if provided
    if (return_signature && return_signature.startsWith('data:image/')) {
      return_signature_data = return_signature;
      console.log('✍️ Return signature data saved');
    }

    // Update lost item status to returned
    await pool.execute(`
      UPDATE lost_items SET 
        status = 'returned',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [id]);

    // Validate relationship_to_owner value
    const validRelationships = ['owner', 'family', 'friend', 'colleague', 'representative'];
    const sanitizedRelationship = validRelationships.includes(relationship_to_owner) 
      ? relationship_to_owner 
      : 'owner';
    
    console.log('📝 Return request data:', {
      relationship_to_owner: relationship_to_owner,
      sanitized: sanitizedRelationship,
      claimer_name: claimer_name?.substring(0, 20) + '...'
    });

    // Insert return record
    const [result] = await pool.execute(`
      INSERT INTO item_returns (
        lost_item_id, claimer_name, claimer_contact, claimer_id_number,
        relationship_to_owner, return_date, return_time,
        returned_by, returned_by_user_id, return_operator, return_operator_id,
        notes, return_photo_url, return_signature_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      parseInt(id), 
      claimer_name || '', 
      claimer_contact || '', 
      claimer_id_number || '',
      sanitizedRelationship, 
      currentDate, 
      currentTime,
      req.user?.name || 'Unknown', 
      req.user?.id || null, 
      req.user?.name || 'Unknown', 
      req.user?.id || null,
      return_notes || '', 
      return_photo_url || null, 
      return_signature_data || null
    ]);

    console.log('✅ Return record created with ID:', result.insertId);

    res.json({
      success: true,
      message: 'Item marked as returned successfully',
      data: {
        return_id: result.insertId,
        return_photo_url,
        has_signature: !!return_signature_data
      }
    });
  } catch (error) {
    console.error('❌ Error processing item return:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while processing item return'
    });
  }
});

// Delete lost item
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await pool.execute('DELETE FROM lost_items WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Lost item not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Lost item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting lost item:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting lost item'
    });
  }
});

// Export data to Excel
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        li.id,
        li.item_name,
        li.description,
        li.category,
        li.found_location,
        li.found_date,
        li.found_time,
        li.finder_name,
        li.finder_contact,
        li.condition_status,
        li.status,
        li.notes,
        li.created_at,
        u.name as input_by_name,
        li.received_by_operator,
        ro.name as received_by_operator_name,
        ir.claimer_name,
        ir.claimer_contact,
        ir.return_date,
        ir.return_time,
        ir.return_operator,
        reto.name as return_operator_name
      FROM lost_items li
      LEFT JOIN users u ON li.input_by_user_id = u.id
      LEFT JOIN users ro ON li.received_by_operator_id = ro.id
      LEFT JOIN item_returns ir ON li.id = ir.lost_item_id
      LEFT JOIN users reto ON ir.return_operator_id = reto.id
      ORDER BY li.created_at DESC
    `);
    
    // Create CSV content
    const headers = [
      'ID', 'Item Name', 'Description', 'Category', 'Found Location', 
      'Found Date', 'Found Time', 'Finder Name', 'Finder Contact', 
      'Condition', 'Status', 'Notes', 'Registered Date', 'Input By',
      'Received By Operator', 'Claimer Name', 'Claimer Contact', 
      'Return Date', 'Return Time', 'Return Operator'
    ];
    
    let csvContent = headers.join(',') + '\n';
    
    rows.forEach(row => {
      const csvRow = [
        row.id,
        `"${row.item_name || ''}"`,
        `"${row.description || ''}"`,
        row.category || '',
        `"${row.found_location || ''}"`,
        row.found_date || '',
        row.found_time || '',
        `"${row.finder_name || ''}"`,
        row.finder_contact || '',
        row.condition_status || '',
        row.status || '',
        `"${row.notes || ''}"`,
        row.created_at ? new Date(row.created_at).toLocaleDateString('id-ID') : '',
        `"${row.input_by_name || ''}"`,
        `"${row.received_by_operator_name || ''}"`,
        `"${row.claimer_name || ''}"`,
        row.claimer_contact || '',
        row.return_date || '',
        row.return_time || '',
        `"${row.return_operator_name || ''}"`
      ];
      csvContent += csvRow.join(',') + '\n';
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=lost-items-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
    
  } catch (error) {
    console.error('Error exporting lost items:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while exporting data'
    });
  }
});

// Download individual item report
router.get('/:id/report', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [rows] = await pool.execute(`
      SELECT li.*, u.name as input_by_name,
             ro.name as received_by_operator_name,
             ir.claimer_name, ir.claimer_contact, ir.claimer_id_number,
             ir.relationship_to_owner, ir.proof_of_ownership,
             ir.return_date, ir.return_time, ir.returned_by, ir.notes as return_notes,
             ir.return_operator, reto.name as return_operator_name,
             ir.return_photo_url, ir.return_signature_data
      FROM lost_items li
      LEFT JOIN users u ON li.input_by_user_id = u.id
      LEFT JOIN users ro ON li.received_by_operator_id = ro.id
      LEFT JOIN item_returns ir ON li.id = ir.lost_item_id
      LEFT JOIN users reto ON ir.return_operator_id = reto.id
      WHERE li.id = ?
    `, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }
    
    const item = rows[0];
    
    // Create simple HTML report
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Lost Item Report - ${item.item_name}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #0d6efd; padding-bottom: 20px; }
        .section { margin-bottom: 25px; }
        .section h3 { color: #0d6efd; border-bottom: 1px solid #dee2e6; padding-bottom: 8px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .info-item { margin-bottom: 10px; }
        .label { font-weight: bold; color: #6c757d; }
        .value { margin-top: 5px; }
        .status { padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; }
        .status.found { background-color: #dcfce7; color: #166534; }
        .status.returned { background-color: #dbeafe; color: #1e40af; }
        .status.disposed { background-color: #fef3c7; color: #92400e; }
        @media print { body { margin: 20px; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>LOST ITEM REPORT</h1>
        <h2>${item.item_name}</h2>
        <p>Report ID: #${item.id} | Generated: ${new Date().toLocaleDateString('id-ID')}</p>
        <span class="status ${item.status}">${item.status.toUpperCase()}</span>
    </div>

    <div class="section">
        <h3>Item Information</h3>
        <div class="info-grid">
            <div class="info-item">
                <div class="label">Item Name:</div>
                <div class="value">${item.item_name || '-'}</div>
            </div>
            <div class="info-item">
                <div class="label">Category:</div>
                <div class="value">${item.category || '-'}</div>
            </div>
            <div class="info-item" style="grid-column: 1 / -1;">
                <div class="label">Description:</div>
                <div class="value">${item.description || '-'}</div>
            </div>
            <div class="info-item">
                <div class="label">Condition:</div>
                <div class="value">${item.condition_status || '-'}</div>
            </div>
            <div class="info-item">
                <div class="label">Status:</div>
                <div class="value">${item.status || '-'}</div>
            </div>
        </div>
    </div>

    <div class="section">
        <h3>Found Information</h3>
        <div class="info-grid">
            <div class="info-item">
                <div class="label">Found Location:</div>
                <div class="value">${item.found_location || '-'}</div>
            </div>
            <div class="info-item">
                <div class="label">Found Date & Time:</div>
                <div class="value">${item.found_date ? new Date(item.found_date).toLocaleDateString('id-ID') : '-'} ${item.found_time || ''}</div>
            </div>
            <div class="info-item">
                <div class="label">Finder Name:</div>
                <div class="value">${item.finder_name || '-'}</div>
            </div>
            <div class="info-item">
                <div class="label">Finder Contact:</div>
                <div class="value">${item.finder_contact || '-'}</div>
            </div>
            <div class="info-item">
                <div class="label">Registered By:</div>
                <div class="value">${item.input_by_name || '-'}</div>
            </div>
            <div class="info-item">
                <div class="label">Registration Date:</div>
                <div class="value">${item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : '-'}</div>
            </div>
        </div>
        ${item.notes ? `
        <div class="info-item">
            <div class="label">Additional Notes:</div>
            <div class="value">${item.notes}</div>
        </div>
        ` : ''}
    </div>

    ${item.status === 'returned' ? `
    <div class="section">
        <h3>Return Information</h3>
        <div class="info-grid">
            <div class="info-item">
                <div class="label">Claimer Name:</div>
                <div class="value">${item.claimer_name || '-'}</div>
            </div>
            <div class="info-item">
                <div class="label">Claimer Contact:</div>
                <div class="value">${item.claimer_contact || '-'}</div>
            </div>
            <div class="info-item">
                <div class="label">ID Number:</div>
                <div class="value">${item.claimer_id_number || '-'}</div>
            </div>
            <div class="info-item">
                <div class="label">Relationship:</div>
                <div class="value">${item.relationship_to_owner || '-'}</div>
            </div>
            <div class="info-item">
                <div class="label">Return Date & Time:</div>
                <div class="value">${item.return_date ? new Date(item.return_date).toLocaleDateString('id-ID') : '-'} ${item.return_time || ''}</div>
            </div>
            <div class="info-item">
                <div class="label">Returned By:</div>
                <div class="value">${item.returned_by || '-'}</div>
            </div>
            ${item.proof_of_ownership ? `
            <div class="info-item" style="grid-column: 1 / -1;">
                <div class="label">Proof of Ownership:</div>
                <div class="value">${item.proof_of_ownership}</div>
            </div>
            ` : ''}
            ${item.return_notes ? `
            <div class="info-item" style="grid-column: 1 / -1;">
                <div class="label">Return Notes:</div>
                <div class="value">${item.return_notes}</div>
            </div>
            ` : ''}
        </div>
    </div>
    ` : ''}

    <div class="section">
        <p style="text-align: center; color: #6c757d; font-size: 12px; margin-top: 40px;">
            This report was generated automatically by ULT FPEB Lost Items Management System<br>
            Generated on ${new Date().toLocaleString('id-ID')}
        </p>
    </div>
</body>
</html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `inline; filename=lost-item-report-${item.item_name}-${id}.html`);
    res.send(htmlContent);
    
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating report'
    });
  }
});

// Download handover document (for when item is registered/found)
router.get('/:id/handover-document', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get lost item data with all relations
    const [rows] = await pool.execute(`
      SELECT li.*, u.name as input_by_name,
             ro.name as received_by_operator_name
      FROM lost_items li
      LEFT JOIN users u ON li.input_by_user_id = u.id
      LEFT JOIN users ro ON li.received_by_operator_id = ro.id
      WHERE li.id = ?
    `, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Lost item not found'
      });
    }
    
    const lostItem = rows[0];
    
    // Generate handover document
    const documentResult = await LostItemDocxService.generateHandoverDocument(lostItem);
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${documentResult.fileName}"`);
    
    // Send the file
    res.sendFile(documentResult.filePath);
    
  } catch (error) {
    console.error('Error generating handover document:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating handover document'
    });
  }
});

// Download return document (for when item is returned)
router.get('/:id/return-document', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get lost item data with return information
    const [rows] = await pool.execute(`
      SELECT li.*, u.name as input_by_name,
             ro.name as received_by_operator_name,
             ir.claimer_name, ir.claimer_contact, ir.claimer_id_number,
             ir.relationship_to_owner, ir.proof_of_ownership,
             ir.return_date, ir.return_time, ir.returned_by, ir.notes as return_notes,
             ir.return_operator, reto.name as return_operator_name,
             ir.return_photo_url, ir.return_signature_data
      FROM lost_items li
      LEFT JOIN users u ON li.input_by_user_id = u.id
      LEFT JOIN users ro ON li.received_by_operator_id = ro.id
      LEFT JOIN item_returns ir ON li.id = ir.lost_item_id
      LEFT JOIN users reto ON ir.return_operator_id = reto.id
      WHERE li.id = ? AND li.status = 'returned'
    `, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Lost item not found or not returned yet'
      });
    }
    
    const itemWithReturn = rows[0];
    
    // Separate lost item data and return data for the service
    const lostItemData = {
      id: itemWithReturn.id,
      item_name: itemWithReturn.item_name,
      description: itemWithReturn.description,
      category: itemWithReturn.category,
      found_location: itemWithReturn.found_location,
      found_date: itemWithReturn.found_date,
      found_time: itemWithReturn.found_time,
      finder_name: itemWithReturn.finder_name,
      finder_contact: itemWithReturn.finder_contact,
      condition_status: itemWithReturn.condition_status,
      photo_url: itemWithReturn.handover_photo_url,
      received_by_operator: itemWithReturn.received_by_operator,
      received_by_operator_id: itemWithReturn.received_by_operator_id,
      status: itemWithReturn.status,
      notes: itemWithReturn.notes,
      created_at: itemWithReturn.created_at
    };
    
    const returnData = {
      claimer_name: itemWithReturn.claimer_name,
      claimer_contact: itemWithReturn.claimer_contact,
      claimer_id_number: itemWithReturn.claimer_id_number,
      relationship_to_owner: itemWithReturn.relationship_to_owner,
      proof_of_ownership: itemWithReturn.proof_of_ownership,
      return_date: itemWithReturn.return_date,
      return_time: itemWithReturn.return_time,
      return_operator: itemWithReturn.return_operator,
      return_operator_id: itemWithReturn.return_operator_id,
      return_photo_url: itemWithReturn.return_photo_url,
      return_signature_data: itemWithReturn.return_signature_data,
      notes: itemWithReturn.return_notes
    };
    
    // Generate return document
    const documentResult = await LostItemDocxService.generateReturnDocument(lostItemData, returnData);
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${documentResult.fileName}"`);
    
    // Send the file
    res.sendFile(documentResult.filePath);
    
  } catch (error) {
    console.error('Error generating return document:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating return document'
    });
  }
});

// Get item history
router.get('/:id/history', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [rows] = await pool.execute(`
      SELECT h.*, u.name as user_full_name
      FROM lost_item_history h
      LEFT JOIN users u ON h.user_id = u.id
      WHERE h.lost_item_id = ?
      ORDER BY h.created_at DESC
    `, [id]);
    
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching item history:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching item history'
    });
  }
});

// Revert item to previous state
router.post('/:id/revert/:historyId', authenticateToken, async (req, res) => {
  try {
    const { id, historyId } = req.params;
    
    // Get the history entry to revert to
    const [historyRows] = await pool.execute(
      'SELECT * FROM lost_item_history WHERE id = ? AND lost_item_id = ?',
      [historyId, id]
    );
    
    if (historyRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'History entry not found'
      });
    }
    
    const historyEntry = historyRows[0];
    const oldData = JSON.parse(historyEntry.old_data);
    
    // Get current item data for logging
    const [currentRows] = await pool.execute('SELECT * FROM lost_items WHERE id = ?', [id]);
    const currentData = currentRows[0];
    
    // Revert the item to previous state
    await pool.execute(`
      UPDATE lost_items SET
        item_name = ?,
        description = ?,
        category = ?,
        found_location = ?,
        condition_status = ?,
        notes = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      oldData.item_name,
      oldData.description,
      oldData.category,
      oldData.found_location,
      oldData.condition_status,
      oldData.notes,
      oldData.status,
      id
    ]);
    
    // Log the revert action
    await logHistoryChange(
      id,
      'reverted',
      currentData,
      oldData,
      req.user?.id,
      req.user?.name || 'Unknown',
      req,
      `Reverted to state from ${new Date(historyEntry.created_at).toLocaleString('id-ID')}`
    );
    
    res.json({
      success: true,
      message: 'Item successfully reverted to previous state'
    });
  } catch (error) {
    console.error('Error reverting item:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while reverting item'
    });
  }
});

// Get statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const queries = [
      'SELECT COUNT(*) as total FROM lost_items',
      'SELECT COUNT(*) as found FROM lost_items WHERE status = "found"',
      'SELECT COUNT(*) as returned FROM lost_items WHERE status = "returned"',
      'SELECT COUNT(*) as this_month FROM lost_items WHERE MONTH(created_at) = MONTH(CURRENT_DATE()) AND YEAR(created_at) = YEAR(CURRENT_DATE())',
      'SELECT COUNT(*) as returns_this_month FROM item_returns WHERE MONTH(created_at) = MONTH(CURRENT_DATE()) AND YEAR(created_at) = YEAR(CURRENT_DATE())'
    ];
    
    const results = await Promise.all(
      queries.map(query => pool.execute(query))
    );
    
    const stats = {
      total: results[0][0][0].total,
      found: results[1][0][0].found,
      returned: results[2][0][0].returned,
      pending: results[1][0][0].found, // Same as found items waiting to be returned
      this_month: results[3][0][0].this_month,
      returns_this_month: results[4][0][0].returns_this_month
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching lost items stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stats'
    });
  }
});

export default router;
