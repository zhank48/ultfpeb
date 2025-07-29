import db from '../config/database.js';

export class DeletionRequest {
  static async findAll(filters = {}) {
    try {
      console.log('🔍 SIMPLE DeletionRequest.findAll called with filters:', filters);
      
      // Very simple query to test if basic query works
      let query = `SELECT * FROM deletion_requests LIMIT 5`;
      
      console.log('🔍 SIMPLE Query:', query);
      const [rows] = await db.execute(query);
      console.log('✅ SIMPLE Query executed successfully, found', rows.length, 'rows');
      return rows;
      
    } catch (error) {
      console.error('❌ SIMPLE Error in DeletionRequest.findAll:', error.message);
      console.error('❌ SIMPLE Error stack:', error.stack);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const query = `
        SELECT 
          dr.*,
          v.full_name as visitor_name,
          v.phone_number as visitor_phone,
          v.email as visitor_email,
          u.name as requested_by_name,
          u.email as requested_by_email,
          ua.name as approved_by_name
        FROM deletion_requests dr
        LEFT JOIN visitors v ON dr.visitor_id = v.id
        LEFT JOIN users u ON dr.requested_by = u.id
        LEFT JOIN users ua ON dr.approved_by = ua.id
        WHERE dr.id = ?
      `;
      
      const [rows] = await db.execute(query, [id]);
      return rows[0] || null;
    } catch (error) {
      console.error('Error in DeletionRequest.findById:', error);
      throw error;
    }
  }

  static async findByVisitorId(visitorId) {
    try {
      const query = `
        SELECT 
          dr.*,
          u.name as requested_by_name,
          u.role as requested_by_role,
          u.email as requested_by_email
        FROM deletion_requests dr
        LEFT JOIN users u ON dr.requested_by = u.id
        WHERE dr.visitor_id = ?
        ORDER BY dr.created_at DESC
      `;
      
      const [rows] = await db.execute(query, [visitorId]);
      return rows;
    } catch (error) {
      console.error('Error in DeletionRequest.findByVisitorId:', error);
      throw error;
    }
  }

  static async create(data) {
    try {
      const query = `
        INSERT INTO deletion_requests (
          visitor_id, 
          requested_by, 
          reason, 
          status,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, 'pending', NOW(), NOW())
      `;
      
      const [result] = await db.execute(query, [
        data.visitor_id,
        data.requested_by,
        data.reason
      ]);
      
      return await this.findById(result.insertId);
    } catch (error) {
      console.error('Error in DeletionRequest.create:', error);
      throw error;
    }
  }

  static async approve(id, data) {
    try {
      const query = `
        UPDATE deletion_requests 
        SET 
          status = 'approved',
          approved_by = ?,
          approved_at = NOW(),
          updated_at = NOW()
        WHERE id = ?
      `;
      
      await db.execute(query, [data.approved_by, id]);
      return await this.findById(id);
    } catch (error) {
      console.error('Error in DeletionRequest.approve:', error);
      throw error;
    }
  }

  static async reject(id, data) {
    try {
      const query = `
        UPDATE deletion_requests 
        SET 
          status = 'rejected',
          rejection_reason = ?,
          updated_at = NOW()
        WHERE id = ?
      `;
      
      await db.execute(query, [data.rejection_reason, id]);
      return await this.findById(id);
    } catch (error) {
      console.error('Error in DeletionRequest.reject:', error);
      throw error;
    }
  }

  static async getAllWithVisitorInfo() {
    try {
      console.log('🔍 DeletionRequest.getAllWithVisitorInfo called');
      
      const query = `
        SELECT 
          dr.*,
          v.full_name as visitor_name,
          v.phone_number as visitor_phone,
          v.email as visitor_email,
          v.institution as visitor_institution,
          u.name as requested_by_name,
          u.email as requested_by_email,
          ua.name as approved_by_name
        FROM deletion_requests dr
        LEFT JOIN visitors v ON dr.visitor_id = v.id
        LEFT JOIN users u ON dr.requested_by = u.id
        LEFT JOIN users ua ON dr.approved_by = ua.id
        ORDER BY dr.created_at DESC
      `;
      
      console.log('🔍 Executing query:', query);
      const [rows] = await db.execute(query);
      console.log('✅ Query executed successfully, found', rows.length, 'rows');
      return rows;
    } catch (error) {
      console.error('❌ Error in DeletionRequest.getAllWithVisitorInfo:', error.message);
      console.error('❌ Error stack:', error.stack);
      throw error;
    }
  }

  static async getStats() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
        FROM deletion_requests 
      `;
      
      const [rows] = await db.execute(query);
      return rows[0];
    } catch (error) {
      console.error('Error in DeletionRequest.getStats:', error);
      throw error;
    }
  }
}