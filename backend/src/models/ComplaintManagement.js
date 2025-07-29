import db from '../config/database.js';

/**
 * ComplaintManagement Model
 * Handles complaint operations, categories, fields, and responses
 */
export class ComplaintManagement {

  /**
   * Create a new complaint
   */
  static async create(complaintData) {
    try {
      const {
        visitor_id,
        visitor_name,
        visitor_email,
        visitor_phone,
        category_id,
        priority = 'medium',
        subject,
        description,
        form_data,
        photo_urls,
        ticket_number
      } = complaintData;

      const query = `
        INSERT INTO complaints (
          visitor_id, visitor_name, visitor_email, visitor_phone,
          category_id, priority, subject, description, form_data,
          photo_urls, ticket_number, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')
      `;

      const [result] = await db.execute(query, [
        visitor_id || null,
        visitor_name,
        visitor_email || null,
        visitor_phone || null,
        category_id || null,
        priority,
        subject,
        description,
        form_data ? JSON.stringify(form_data) : null,
        photo_urls || null,
        ticket_number
      ]);

      return {
        id: result.insertId,
        ...complaintData,
        status: 'open'
      };
    } catch (error) {
      console.error('Error creating complaint:', error);
      throw error;
    }
  }

  /**
   * Get all complaints with filters
   */
  static async findAll(filters = {}) {
    try {
      let query = `
        SELECT c.*, cc.name as category_name, cc.color as category_color,
               u.name as assigned_to_name, u.role as assigned_to_role,
               v.full_name as visitor_full_name, v.institution as visitor_institution
        FROM complaints c
        LEFT JOIN complaint_categories cc ON c.category_id = cc.id
        LEFT JOIN users u ON c.assigned_to = u.id
        LEFT JOIN visitors v ON c.visitor_id = v.id
      `;

      const params = [];
      const conditions = [];

      // Filter by status
      if (filters.status) {
        conditions.push('c.status = ?');
        params.push(filters.status);
      }

      // Filter by priority
      if (filters.priority) {
        conditions.push('c.priority = ?');
        params.push(filters.priority);
      }

      // Filter by category
      if (filters.category_id) {
        conditions.push('c.category_id = ?');
        params.push(filters.category_id);
      }

      // Filter by assigned user
      if (filters.assigned_to) {
        conditions.push('c.assigned_to = ?');
        params.push(filters.assigned_to);
      }

      // Filter by date range
      if (filters.startDate && filters.endDate) {
        conditions.push('DATE(c.created_at) BETWEEN ? AND ?');
        params.push(filters.startDate, filters.endDate);
      }

      // Search in subject, description, or visitor name
      if (filters.search) {
        conditions.push(`(c.subject LIKE ? OR c.description LIKE ? OR 
                        c.visitor_name LIKE ? OR c.visitor_email LIKE ? OR
                        c.ticket_number LIKE ?)`);
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY c.created_at DESC';

      // Add pagination
      if (filters.limit) {
        query += ` LIMIT ${parseInt(filters.limit)}`;
        if (filters.offset) {
          query += ` OFFSET ${parseInt(filters.offset)}`;
        }
      }

      const [rows] = await db.execute(query, params);
      return rows;
    } catch (error) {
      console.error('Error fetching complaints:', error);
      throw error;
    }
  }

  /**
   * Get complaint by ID
   */
  static async findById(id) {
    try {
      const [rows] = await db.execute(
        `SELECT c.*, cc.name as category_name, cc.color as category_color,
                u.name as assigned_to_name, u.role as assigned_to_role, u.avatar_url as assigned_to_avatar,
                v.full_name as visitor_full_name, v.institution as visitor_institution,
                v.photo_url as visitor_photo
         FROM complaints c
         LEFT JOIN complaint_categories cc ON c.category_id = cc.id
         LEFT JOIN users u ON c.assigned_to = u.id
         LEFT JOIN visitors v ON c.visitor_id = v.id
         WHERE c.id = ?`,
        [id]
      );
      return rows[0];
    } catch (error) {
      console.error('Error fetching complaint by ID:', error);
      throw error;
    }
  }

  /**
   * Update complaint
   */
  static async update(id, updateData) {
    try {
      const {
        category_id,
        priority,
        status,
        subject,
        description,
        assigned_to,
        form_data
      } = updateData;

      const setClause = [];
      const params = [];

      if (category_id !== undefined) {
        setClause.push('category_id = ?');
        params.push(category_id);
      }
      if (priority !== undefined) {
        setClause.push('priority = ?');
        params.push(priority);
      }
      if (status !== undefined) {
        setClause.push('status = ?');
        params.push(status);
        
        // Set resolved_at if status is resolved or closed
        if (status === 'resolved' || status === 'closed') {
          setClause.push('resolved_at = CURRENT_TIMESTAMP');
        }
      }
      if (subject !== undefined) {
        setClause.push('subject = ?');
        params.push(subject);
      }
      if (description !== undefined) {
        setClause.push('description = ?');
        params.push(description);
      }
      if (assigned_to !== undefined) {
        setClause.push('assigned_to = ?');
        params.push(assigned_to);
      }
      if (form_data !== undefined) {
        setClause.push('form_data = ?');
        params.push(JSON.stringify(form_data));
      }

      if (setClause.length === 0) {
        throw new Error('No update data provided');
      }

      params.push(id);
      
      await db.execute(
        `UPDATE complaints SET ${setClause.join(', ')} WHERE id = ?`,
        params
      );

      return this.findById(id);
    } catch (error) {
      console.error('Error updating complaint:', error);
      throw error;
    }
  }

  /**
   * Delete complaint
   */
  static async delete(id) {
    try {
      // First delete related responses
      await db.execute('DELETE FROM complaint_responses WHERE complaint_id = ?', [id]);
      
      // Then delete the complaint
      await db.execute('DELETE FROM complaints WHERE id = ?', [id]);
      return true;
    } catch (error) {
      console.error('Error deleting complaint:', error);
      throw error;
    }
  }

  /**
   * Add response to complaint
   */
  static async addResponse(complaintId, responseData) {
    try {
      const { user_id, response_text, is_internal = false } = responseData;

      const [result] = await db.execute(
        `INSERT INTO complaint_responses (complaint_id, user_id, response_text, is_internal)
         VALUES (?, ?, ?, ?)`,
        [complaintId, user_id, response_text, is_internal]
      );

      // Get the created response with user data
      const [responseRows] = await db.execute(
        `SELECT cr.*, u.name as user_name, u.role as user_role, u.avatar_url as user_avatar
         FROM complaint_responses cr
         LEFT JOIN users u ON cr.user_id = u.id
         WHERE cr.id = ?`,
        [result.insertId]
      );

      return responseRows[0];
    } catch (error) {
      console.error('Error adding complaint response:', error);
      throw error;
    }
  }

  /**
   * Get responses for a complaint
   */
  static async getResponses(complaintId) {
    try {
      const [rows] = await db.execute(
        `SELECT cr.*, u.name as user_name, u.role as user_role, u.avatar_url as user_avatar
         FROM complaint_responses cr
         LEFT JOIN users u ON cr.user_id = u.id
         WHERE cr.complaint_id = ?
         ORDER BY cr.created_at ASC`,
        [complaintId]
      );
      return rows;
    } catch (error) {
      console.error('Error fetching complaint responses:', error);
      throw error;
    }
  }

  /**
   * Get complaint statistics
   */
  static async getStatistics(filters = {}) {
    try {
      let dateCondition = '';
      const params = [];

      if (filters.startDate && filters.endDate) {
        dateCondition = 'WHERE DATE(c.created_at) BETWEEN ? AND ?';
        params.push(filters.startDate, filters.endDate);
      }

      // Total complaints
      const [totalResult] = await db.execute(
        `SELECT COUNT(*) as total FROM complaints c ${dateCondition}`,
        params
      );

      // Status distribution
      const [statusResult] = await db.execute(
        `SELECT status, COUNT(*) as count FROM complaints c ${dateCondition}
         GROUP BY status`,
        params
      );

      // Priority distribution
      const [priorityResult] = await db.execute(
        `SELECT priority, COUNT(*) as count FROM complaints c ${dateCondition}
         GROUP BY priority`,
        params
      );

      // Category distribution
      const [categoryResult] = await db.execute(
        `SELECT cc.name as category, COUNT(*) as count, cc.color
         FROM complaints c
         LEFT JOIN complaint_categories cc ON c.category_id = cc.id
         ${dateCondition}
         GROUP BY c.category_id, cc.name, cc.color
         ORDER BY count DESC`,
        params
      );

      // Recent complaints
      const [recentResult] = await db.execute(
        `SELECT c.*, cc.name as category_name, cc.color as category_color
         FROM complaints c
         LEFT JOIN complaint_categories cc ON c.category_id = cc.id
         ${dateCondition}
         ORDER BY c.created_at DESC
         LIMIT 10`,
        params
      );

      // Monthly trend
      const [monthlyTrend] = await db.execute(
        `SELECT 
           DATE_FORMAT(created_at, '%Y-%m') as month,
           COUNT(*) as count
         FROM complaints
         WHERE created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 12 MONTH)
         GROUP BY DATE_FORMAT(created_at, '%Y-%m')
         ORDER BY month`,
        []
      );

      // Average resolution time
      const [resolutionTime] = await db.execute(
        `SELECT 
           AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)) as avg_hours
         FROM complaints
         WHERE resolved_at IS NOT NULL ${dateCondition ? 'AND ' + dateCondition.replace('WHERE ', '') : ''}`,
        params
      );

      return {
        total: totalResult[0].total,
        byStatus: statusResult,
        byPriority: priorityResult,
        byCategory: categoryResult,
        recentComplaints: recentResult,
        monthlyTrend,
        averageResolutionTime: resolutionTime[0].avg_hours || 0
      };
    } catch (error) {
      console.error('Error getting complaint statistics:', error);
      throw error;
    }
  }

  /**
   * Get complaint categories
   */
  static async getCategories() {
    try {
      const [rows] = await db.execute(
        'SELECT * FROM complaint_categories WHERE is_active = true ORDER BY name'
      );
      return rows;
    } catch (error) {
      console.error('Error fetching complaint categories:', error);
      throw error;
    }
  }

  /**
   * Create/Update complaint category
   */
  static async saveCategory(categoryData) {
    try {
      const { id, name, description, color, is_active = true } = categoryData;

      if (id) {
        // Update existing category
        await db.execute(
          `UPDATE complaint_categories 
           SET name = ?, description = ?, color = ?, is_active = ?
           WHERE id = ?`,
          [name, description, color, is_active, id]
        );
        return { ...categoryData };
      } else {
        // Create new category
        const [result] = await db.execute(
          `INSERT INTO complaint_categories (name, description, color, is_active)
           VALUES (?, ?, ?, ?)`,
          [name, description, color, is_active]
        );
        return { id: result.insertId, ...categoryData };
      }
    } catch (error) {
      console.error('Error saving complaint category:', error);
      throw error;
    }
  }

  /**
   * Delete complaint category
   */
  static async deleteCategory(id) {
    try {
      await db.execute('DELETE FROM complaint_categories WHERE id = ?', [id]);
      return true;
    } catch (error) {
      console.error('Error deleting complaint category:', error);
      throw error;
    }
  }

  /**
   * Get dynamic complaint fields
   */
  static async getDynamicFields() {
    try {
      const [rows] = await db.execute(
        `SELECT * FROM complaint_fields 
         WHERE is_active = true 
         ORDER BY field_order, id`
      );
      
      return rows.map(row => {
        let parsedOptions = null;
        if (row.field_options) {
          try {
            parsedOptions = JSON.parse(row.field_options);
          } catch (jsonError) {
            console.warn(`Invalid JSON in field_options for field ${row.id}: ${row.field_options}`);
            // If it's not valid JSON, treat it as a string and split by comma
            if (typeof row.field_options === 'string') {
              parsedOptions = row.field_options.split(',').map(opt => opt.trim());
            } else {
              parsedOptions = null;
            }
          }
        }
        
        return {
          ...row,
          field_options: parsedOptions
        };
      });
    } catch (error) {
      console.error('Error fetching dynamic complaint fields:', error);
      throw error;
    }
  }

  /**
   * Save dynamic field configuration
   */
  static async saveDynamicField(fieldData) {
    try {
      const {
        id,
        field_name,
        field_label,
        field_type,
        field_options,
        is_required = false,
        field_order = 0,
        is_active = true
      } = fieldData;

      const optionsJson = field_options ? JSON.stringify(field_options) : null;

      if (id) {
        // Update existing field
        await db.execute(
          `UPDATE complaint_fields 
           SET field_name = ?, field_label = ?, field_type = ?, 
               field_options = ?, is_required = ?, field_order = ?, is_active = ?
           WHERE id = ?`,
          [field_name, field_label, field_type, optionsJson, is_required, field_order, is_active, id]
        );
        return { ...fieldData };
      } else {
        // Create new field
        const [result] = await db.execute(
          `INSERT INTO complaint_fields 
           (field_name, field_label, field_type, field_options, is_required, field_order, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [field_name, field_label, field_type, optionsJson, is_required, field_order, is_active]
        );
        return { id: result.insertId, ...fieldData };
      }
    } catch (error) {
      console.error('Error saving dynamic complaint field:', error);
      throw error;
    }
  }

  /**
   * Delete dynamic field
   */
  static async deleteDynamicField(id) {
    try {
      await db.execute('DELETE FROM complaint_fields WHERE id = ?', [id]);
      return true;
    } catch (error) {
      console.error('Error deleting dynamic complaint field:', error);
      throw error;
    }
  }

  /**
   * Generate ticket number
   */
  static generateTicketNumber(id) {
    return `COMP-${String(id).padStart(6, '0')}`;
  }

  /**
   * Export complaints data
   */
  static async exportData(filters = {}, format = 'json') {
    try {
      const complaints = await this.findAll(filters);
      
      if (format === 'csv') {
        const headers = [
          'Ticket Number', 'Status', 'Priority', 'Category', 'Subject',
          'Visitor Name', 'Visitor Email', 'Visitor Phone',
          'Assigned To', 'Created At', 'Resolved At'
        ];
        
        const rows = complaints.map(complaint => [
          complaint.ticket_number,
          complaint.status,
          complaint.priority,
          complaint.category_name,
          complaint.subject,
          complaint.visitor_name,
          complaint.visitor_email,
          complaint.visitor_phone,
          complaint.assigned_to_name,
          complaint.created_at,
          complaint.resolved_at
        ]);

        return { headers, rows };
      }

      return complaints;
    } catch (error) {
      console.error('Error exporting complaints data:', error);
      throw error;
    }
  }
}

export default ComplaintManagement;
