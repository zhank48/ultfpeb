import db from '../config/database.js';

export class VisitorEditHistory {
  static async findByVisitorId(visitorId, options = {}) {
    try {
      const { limit = 50, offset = 0 } = options;
      
      const query = `
        SELECT 
          veh.*,
          u.name as user_name,
          u.role as user_role,
          u.email as user_email,
          u.avatar_url as user_avatar
        FROM visitor_edit_history veh
        LEFT JOIN users u ON veh.user_id = u.id
        WHERE veh.visitor_id = ?
        ORDER BY veh.timestamp DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      
      const [rows] = await db.execute(query, [parseInt(visitorId)]);
      
      // Parse JSON fields
      return rows.map(row => ({
        ...row,
        changes: typeof row.changes === 'string' ? JSON.parse(row.changes) : row.changes,
        original: typeof row.original === 'string' ? JSON.parse(row.original) : row.original
      }));
    } catch (error) {
      console.error('Error finding visitor edit history:', error);
      throw error;
    }
  }

  static async create(data) {
    try {
      // Use simple INSERT without prepared statements to avoid binding issues
      const visitor_id = data.visitor_id ? parseInt(data.visitor_id, 10) : 0;
      const user_id = data.user_id ? parseInt(data.user_id, 10) : null;
      const user = (data.user && data.user.trim() ? data.user.trim() : 'System User').replace(/'/g, "''");
      const changes = JSON.stringify(data.changes || {}).replace(/'/g, "''");
      const original = JSON.stringify(data.original || {}).replace(/'/g, "''");

      const query = `
        INSERT INTO visitor_edit_history 
        (visitor_id, user_id, user, changes, original, timestamp) 
        VALUES (${visitor_id}, ${user_id}, '${user}', '${changes}', '${original}', NOW())
      `;

      const [result] = await db.query(query);
      console.log('✅ Edit history created with ID:', result.insertId);
      return result.insertId;

    } catch (error) {
      console.error('❌ Error creating visitor edit history:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const query = `
        SELECT 
          veh.*,
          u.name as user_name,
          u.role as user_role,
          u.email as user_email,
          u.avatar_url as user_avatar,
          v.full_name as visitor_name
        FROM visitor_edit_history veh
        LEFT JOIN users u ON veh.user_id = u.id
        LEFT JOIN visitors v ON veh.visitor_id = v.id
        WHERE veh.id = ?
      `;
      
      const [rows] = await db.execute(query, [id]);
      
      if (rows.length === 0) {
        return null;
      }

      const row = rows[0];
      return {
        ...row,
        changes: typeof row.changes === 'string' ? JSON.parse(row.changes) : row.changes,
        original: typeof row.original === 'string' ? JSON.parse(row.original) : row.original
      };
    } catch (error) {
      console.error('Error finding visitor edit history by ID:', error);
      throw error;
    }
  }

  static async getCount(visitorId) {
    try {
      const query = 'SELECT COUNT(*) as count FROM visitor_edit_history WHERE visitor_id = ?';
      const [rows] = await db.execute(query, [visitorId]);
      return rows[0].count;
    } catch (error) {
      console.error('Error getting visitor edit history count:', error);
      throw error;
    }
  }

  static async deleteByVisitorId(visitorId) {
    try {
      const query = 'DELETE FROM visitor_edit_history WHERE visitor_id = ?';
      const [result] = await db.execute(query, [visitorId]);
      return result.affectedRows;
    } catch (error) {
      console.error('Error deleting visitor edit history:', error);
      throw error;
    }
  }

  static async findRecent(limit = 100) {
    try {
      const query = `
        SELECT 
          veh.*,
          u.name as user_name,
          u.role as user_role,
          u.email as user_email,
          u.avatar_url as user_avatar,
          v.full_name as visitor_name
        FROM visitor_edit_history veh
        LEFT JOIN users u ON veh.user_id = u.id
        LEFT JOIN visitors v ON veh.visitor_id = v.id
        ORDER BY veh.timestamp DESC
        LIMIT ?
      `;
      
      const [rows] = await db.execute(query, [limit]);
      
      return rows.map(row => ({
        ...row,
        changes: typeof row.changes === 'string' ? JSON.parse(row.changes) : row.changes,
        original: typeof row.original === 'string' ? JSON.parse(row.original) : row.original
      }));
    } catch (error) {
      console.error('Error finding recent visitor edit history:', error);
      throw error;
    }
  }

  static async logEdit(visitorId, originalData, newData, userId, userName) {
    try {
      // Compare and find only changed fields
      const changes = {};
      const original = {};
      
      const fieldsToTrack = [
        'full_name', 'phone_number', 'email', 'id_number', 'institution', 
        'address', 'purpose', 'person_to_meet', 'location'
      ];

      for (const field of fieldsToTrack) {
        if (originalData[field] !== newData[field]) {
          changes[field] = newData[field];
          original[field] = originalData[field];
        }
      }

      // Only log if there are actual changes
      if (Object.keys(changes).length > 0) {
        await this.create({
          visitor_id: visitorId,
          user_id: userId,
          user: userName,
          changes,
          original
        });
        
        console.log(`✅ Edit history logged for visitor ${visitorId} by ${userName}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error logging visitor edit:', error);
      throw error;
    }
  }
}