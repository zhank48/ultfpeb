import db from '../config/database.js';

export class VisitorEnhanced {
  
  /**
   * Get visitors based on role and view type
   * @param {Object} filters - Filter parameters
   * @param {string} userRole - User role (Admin, Receptionist, etc.)
   * @param {string} viewType - Type of view (active, pending_deletion, deleted, all)
   */
  static async findByRoleAndView(filters = {}, userRole, viewType = 'active') {
    try {
      let baseQuery = `
        SELECT 
          v.*,
          u.name as input_by_name,
          u.role as input_by_role,
          u.email as input_by_email,
          deleted_u.name as deleted_by_name,
          
          -- Deletion request info
          dr.id as deletion_request_id,
          dr.status as deletion_status,
          dr.reason as deletion_reason,
          dr.created_at as deletion_requested_at,
          dr_req.name as deletion_requested_by_name,
          dr_req.role as deletion_requested_by_role,
          
          -- Edit request info  
          va.id as edit_request_id,
          va.status as edit_status,
          va.reason as edit_reason,
          va.created_at as edit_requested_at,
          va_req.name as edit_requested_by_name,
          va_req.role as edit_requested_by_role,
          
          -- Computed status
          CASE 
            WHEN v.deleted_at IS NOT NULL THEN 'deleted'
            WHEN dr.status = 'pending' THEN 'pending_delete'
            WHEN va.status = 'pending' AND va.action_type = 'edit' THEN 'pending_edit'
            ELSE 'active'
          END as computed_status
          
        FROM visitors v
        LEFT JOIN users u ON v.input_by_user_id = u.id
  
        LEFT JOIN users deleted_u ON v.deleted_by = deleted_u.id
        
        -- Latest deletion request
        LEFT JOIN deletion_requests dr ON v.id = dr.visitor_id 
          AND dr.id = (
            SELECT MAX(id) FROM deletion_requests 
            WHERE visitor_id = v.id AND status = 'pending'
          )
        LEFT JOIN users dr_req ON dr.requested_by = dr_req.id
        
        -- Latest edit request
        LEFT JOIN visitor_actions va ON v.id = va.visitor_id 
          AND va.action_type = 'edit'
          AND va.id = (
            SELECT MAX(id) FROM visitor_actions 
            WHERE visitor_id = v.id AND action_type = 'edit' AND status = 'pending'
          )
        LEFT JOIN users va_req ON va.requested_by = va_req.id
      `;

      const conditions = [];
      const params = [];

      // Role-based filtering
      if (userRole === 'Receptionist') {
        switch (viewType) {
          case 'active':
            conditions.push('v.deleted_at IS NULL');
            conditions.push('(dr.status IS NULL OR dr.status != "pending")');
            conditions.push('(va.status IS NULL OR va.status != "pending")');
            break;
          case 'pending_requests':
            conditions.push('v.deleted_at IS NULL');
            conditions.push('(dr.status = "pending" OR (va.status = "pending" AND va.action_type = "edit"))');
            break;
        }
      } else if (userRole === 'Admin') {
        switch (viewType) {
          case 'active':
            conditions.push('v.deleted_at IS NULL');
            conditions.push('(dr.status IS NULL OR dr.status != "pending")');
            conditions.push('(va.status IS NULL OR va.status != "pending")');
            break;
          case 'pending_deletion':
            conditions.push('dr.status = "pending"');
            break;
          case 'pending_edit':
            conditions.push('va.status = "pending" AND va.action_type = "edit"');
            break;
          case 'deleted':
            conditions.push('v.deleted_at IS NOT NULL');
            break;
          case 'all':
            // No additional conditions
            break;
        }
      }

      // Additional filters
      if (filters.search) {
        conditions.push('(v.full_name LIKE ? OR v.institution LIKE ? OR v.purpose LIKE ?)');
        params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
      }

      if (filters.location) {
        conditions.push('v.location LIKE ?');
        params.push(`%${filters.location}%`);
      }

      if (filters.startDate && filters.endDate) {
        conditions.push('v.check_in_time BETWEEN ? AND ?');
        params.push(filters.startDate, filters.endDate);
      }

      if (conditions.length > 0) {
        baseQuery += ' WHERE ' + conditions.join(' AND ');
      }

      baseQuery += ' ORDER BY ';
      
      // Sort by priority for admin
      if (userRole === 'Admin') {
        baseQuery += `
          CASE computed_status
            WHEN 'pending_delete' THEN 1
            WHEN 'pending_edit' THEN 2  
            WHEN 'active' THEN 3
            WHEN 'deleted' THEN 4
          END,
        `;
      }
      
      baseQuery += 'v.check_in_time DESC';

      if (filters.limit) {
        baseQuery += ` LIMIT ${parseInt(filters.limit)}`;
      }

      const [rows] = await db.execute(baseQuery, params);
      return rows;
      
    } catch (error) {
      console.error('Error in findByRoleAndView:', error);
      throw error;
    }
  }

  /**
   * Create visitor edit request
   */
  static async createEditRequest(visitorId, editData, reason, requestedBy) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      // Get original visitor data
      const [originalData] = await connection.execute(
        'SELECT * FROM visitors WHERE id = ?', 
        [visitorId]
      );

      if (originalData.length === 0) {
        throw new Error('Visitor not found');
      }

      // Check for existing pending edit request
      const [existingRequest] = await connection.execute(
        'SELECT id FROM visitor_actions WHERE visitor_id = ? AND action_type = "edit" AND status = "pending"',
        [visitorId]
      );

      if (existingRequest.length > 0) {
        // Update existing pending request instead of creating new one
        console.log(`Updating existing edit request ${existingRequest[0].id} for visitor ${visitorId}`);
        
        const updateParams = [
          reason || '',
          JSON.stringify(originalData[0]),
          JSON.stringify(editData),
          requestedBy.id || null,
          requestedBy.name || 'Unknown User',
          requestedBy.role || 'User',
          existingRequest[0].id
        ].map(param => param === undefined ? null : param);
        
        await connection.execute(`
          UPDATE visitor_actions SET 
            reason = ?,
            original_data = ?,
            proposed_data = ?,
            requested_by = ?,
            requested_by_name = ?,
            requested_by_role = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, updateParams);
        
        return {
          id: existingRequest[0].id,
          visitor_id: visitorId,
          action_type: 'edit',
          status: 'pending',
          message: 'Edit request updated successfully'
        };
      }

      // Create visitor action record
      const params = [
        visitorId,
        reason || '',
        JSON.stringify(originalData[0]),
        JSON.stringify(editData),
        requestedBy.id || null,
        requestedBy.name || 'Unknown User',
        requestedBy.role || 'User'
      ].map(param => param === undefined ? null : param);
      
      console.log('SQL parameters:', params);
      console.log('Parameter types:', params.map(p => typeof p));
      console.log('requestedBy object:', requestedBy);
      
      const [result] = await connection.execute(`
        INSERT INTO visitor_actions (
          visitor_id, action_type, reason, original_data, proposed_data,
          requested_by, requested_by_name, requested_by_role, status
        ) VALUES (?, 'edit', ?, ?, ?, ?, ?, ?, 'pending')
      `, params);

      await connection.commit();
      return { id: result.insertId, status: 'pending' };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Create visitor deletion request
   */
  static async createDeletionRequest(visitorId, reason, requestedBy) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      // Check if visitor exists and not already deleted
      const [visitor] = await connection.execute(
        'SELECT id, full_name FROM visitors WHERE id = ? AND deleted_at IS NULL',
        [visitorId]
      );

      if (visitor.length === 0) {
        throw new Error('Visitor not found or already deleted');
      }

      // Check for existing pending deletion request
      const [existingRequest] = await connection.execute(
        'SELECT id FROM deletion_requests WHERE visitor_id = ? AND status = "pending"',
        [visitorId]
      );

      if (existingRequest.length > 0) {
        // Update existing pending deletion request instead of creating new one
        console.log(`Updating existing deletion request ${existingRequest[0].id} for visitor ${visitorId}`);
        
        await connection.execute(`
          UPDATE deletion_requests SET 
            reason = ?,
            requested_by = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [reason, requestedBy.id || null, existingRequest[0].id]);
        
        return {
          id: existingRequest[0].id,
          visitor_id: visitorId,
          action_type: 'delete',
          status: 'pending',
          message: 'Deletion request updated successfully'
        };
      }

      // Create deletion request
      const [result] = await connection.execute(`
        INSERT INTO deletion_requests (visitor_id, requested_by, reason, status)
        VALUES (?, ?, ?, 'pending')
      `, [visitorId, requestedBy.id || null, reason || '']);

      // Log the action
      await connection.execute(`
        INSERT INTO deletion_audit_logs (
          deletion_request_id, action, performed_by, action_details
        ) VALUES (?, 'created', ?, ?)
      `, [
        result.insertId,
        requestedBy.id || null,
        JSON.stringify({
          visitor_id: visitorId,
          visitor_name: visitor[0].full_name,
          reason: reason || ''
        })
      ]);

      await connection.commit();
      return { id: result.insertId, status: 'pending' };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Approve edit request
   */
  static async approveEditRequest(requestId, approvedBy) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      // Get the edit request
      const [request] = await connection.execute(
        'SELECT * FROM visitor_actions WHERE id = ? AND status = "pending" AND action_type = "edit"',
        [requestId]
      );

      if (request.length === 0) {
        throw new Error('Edit request not found or already processed');
      }

      const editRequest = request[0];
      const proposedData = JSON.parse(editRequest.proposed_data);

      // Update visitor with proposed changes
      const updateFields = [];
      const updateValues = [];
      
      Object.keys(proposedData).forEach(key => {
        if (key !== 'id' && proposedData[key] !== undefined) {
          updateFields.push(`${key} = ?`);
          updateValues.push(proposedData[key]);
        }
      });

      if (updateFields.length > 0) {
        updateValues.push(editRequest.visitor_id);
        await connection.execute(
          `UPDATE visitors SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
          updateValues
        );
      }

      // Update request status
      await connection.execute(
        'UPDATE visitor_actions SET status = "approved", processed_by = ?, processed_at = NOW() WHERE id = ?',
        [approvedBy.id, requestId]
      );

      await connection.commit();
      return { success: true, message: 'Edit request approved successfully' };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Approve deletion request
   */
  static async approveDeletionRequest(requestId, approvedBy) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      // Get the deletion request
      const [request] = await connection.execute(`
        SELECT dr.*, v.full_name 
        FROM deletion_requests dr 
        JOIN visitors v ON dr.visitor_id = v.id 
        WHERE dr.id = ? AND dr.status = "pending"
      `, [requestId]);

      if (request.length === 0) {
        throw new Error('Deletion request not found or already processed');
      }

      const deletionRequest = request[0];

      // Soft delete the visitor
      await connection.execute(
        'UPDATE visitors SET deleted_at = NOW(), deleted_by = ? WHERE id = ?',
        [approvedBy.id, deletionRequest.visitor_id]
      );

      // Update deletion request status
      await connection.execute(
        'UPDATE deletion_requests SET status = "approved", approved_by = ?, approved_at = NOW() WHERE id = ?',
        [approvedBy.id, requestId]
      );

      // Log the approval
      await connection.execute(`
        INSERT INTO deletion_audit_logs (
          deletion_request_id, action, performed_by, action_details
        ) VALUES (?, 'approved', ?, ?)
      `, [
        requestId,
        approvedBy.id,
        JSON.stringify({
          visitor_id: deletionRequest.visitor_id,
          visitor_name: deletionRequest.full_name
        })
      ]);

      await connection.commit();
      return { success: true, message: 'Deletion request approved and visitor deleted successfully' };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Reject request (edit or deletion)
   */
  static async rejectRequest(requestId, requestType, rejectedBy, rejectionReason = '') {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      if (requestType === 'edit') {
        await connection.execute(
          'UPDATE visitor_actions SET status = "rejected", processed_by = ?, processed_at = NOW(), notes = ? WHERE id = ?',
          [rejectedBy.id, rejectionReason, requestId]
        );
      } else if (requestType === 'deletion') {
        await connection.execute(
          'UPDATE deletion_requests SET status = "rejected", rejected_by = ?, rejected_at = NOW(), rejection_reason = ? WHERE id = ?',
          [rejectedBy.id, rejectionReason, requestId]
        );

        // Log the rejection
        await connection.execute(`
          INSERT INTO deletion_audit_logs (
            deletion_request_id, action, performed_by, action_details
          ) VALUES (?, 'rejected', ?, ?)
        `, [
          requestId,
          rejectedBy.id,
          JSON.stringify({
            rejection_reason: rejectionReason,
            rejected_by: rejectedBy.name,
            rejected_by_role: rejectedBy.role
          })
        ]);
      }

      await connection.commit();
      return { success: true, message: 'Request rejected successfully' };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get dashboard statistics by role
   */
  static async getDashboardStats(userRole) {
    try {
      const baseStats = {
        total_visitors: 0,
        active_visitors: 0,
        deleted_visitors: 0,
        pending_edit_requests: 0,
        pending_deletion_requests: 0,
        today_visitors: 0,
        weekly_growth: 0
      };

      // Basic visitor counts
      const [totalCount] = await db.execute('SELECT COUNT(*) as count FROM visitors');
      const [activeCount] = await db.execute('SELECT COUNT(*) as count FROM visitors WHERE deleted_at IS NULL');
      const [deletedCount] = await db.execute('SELECT COUNT(*) as count FROM visitors WHERE deleted_at IS NOT NULL');
      const [todayCount] = await db.execute('SELECT COUNT(*) as count FROM visitors WHERE DATE(check_in_time) = CURDATE()');

      baseStats.total_visitors = totalCount[0].count;
      baseStats.active_visitors = activeCount[0].count;
      baseStats.deleted_visitors = deletedCount[0].count;
      baseStats.today_visitors = todayCount[0].count;

      // Request counts (only for admin)
      if (userRole === 'Admin') {
        const [pendingEdits] = await db.execute(
          'SELECT COUNT(*) as count FROM visitor_actions WHERE status = "pending" AND action_type = "edit"'
        );
        const [pendingDeletions] = await db.execute(
          'SELECT COUNT(*) as count FROM deletion_requests WHERE status = "pending"'
        );

        baseStats.pending_edit_requests = pendingEdits[0].count;
        baseStats.pending_deletion_requests = pendingDeletions[0].count;
      }

      // Weekly growth calculation
      const [thisWeek] = await db.execute(`
        SELECT COUNT(*) as count FROM visitors 
        WHERE check_in_time >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
      `);
      
      const [lastWeek] = await db.execute(`
        SELECT COUNT(*) as count FROM visitors 
        WHERE check_in_time >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) + 7 DAY)
        AND check_in_time < DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
      `);

      const thisWeekCount = thisWeek[0].count;
      const lastWeekCount = lastWeek[0].count;
      baseStats.weekly_growth = lastWeekCount > 0 ? 
        Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100) : 0;

      return baseStats;

    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      throw error;
    }
  }
}