import bcrypt from 'bcryptjs';
import db from '../config/database.js';

export class User {
  static async findByEmail(email) {
    try {
      const [rows] = await db.execute(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );
      return rows[0];
    } catch (error) {
      throw error;
    }
  }
  static async findById(id) {
    try {
      const [rows] = await db.execute(
        'SELECT id, name, email, role, avatar_url, avatar_url as photo_url, study_program, cohort, phone, created_at, updated_at FROM users WHERE id = ?',
        [id]
      );
      return rows[0];
    } catch (error) {
      throw error;
    }
  }  static async findAll(filters = {}) {
    try {
      let query = 'SELECT id, name, email, role, avatar_url, avatar_url as photo_url, study_program, cohort, phone, created_at, updated_at FROM users';
      const params = [];
      const conditions = [];

      // Add filters
      if (filters.role) {
        conditions.push('role = ?');
        params.push(filters.role);
      }

      if (filters.search) {
        conditions.push('(name LIKE ? OR email LIKE ? OR study_program LIKE ?)');
        params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY created_at DESC';

      const [rows] = await db.execute(query, params);
      return rows;
    } catch (error) {
      throw error;
    }
  }
  static async create(userData) {
    try {
      const { 
        name, 
        email, 
        password, 
        role = 'Receptionist', 
        avatar_url = null, 
        study_program = null, 
        cohort = null 
      } = userData;
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      const [result] = await db.execute(
        'INSERT INTO users (name, email, password, role, avatar_url, study_program, cohort) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, email, hashedPassword, role, avatar_url, study_program, cohort]
      );

      return { id: result.insertId, ...userData, password: undefined };
    } catch (error) {
      throw error;
    }
  }  static async update(id, userData) {
    try {
      // Build the SQL query dynamically based on provided fields
      const updateFields = [];
      const updateValues = [];
      
      if (userData.name !== undefined) {
        updateFields.push('name = ?');
        updateValues.push(userData.name);
      }
      
      if (userData.email !== undefined) {
        updateFields.push('email = ?');
        updateValues.push(userData.email);
      }
      
      if (userData.role !== undefined) {
        updateFields.push('role = ?');
        updateValues.push(userData.role);
      }
      if (userData.avatar_url !== undefined) {
        updateFields.push('avatar_url = ?');
        updateValues.push(userData.avatar_url);
      }
      
      if (userData.photo_url !== undefined) {
        updateFields.push('avatar_url = ?');
        updateValues.push(userData.photo_url);
      }
      
      if (userData.phone !== undefined) {
        updateFields.push('phone = ?');
        updateValues.push(userData.phone);
      }
      
      if (userData.study_program !== undefined) {
        updateFields.push('study_program = ?');
        updateValues.push(userData.study_program);
      }
      
      if (userData.cohort !== undefined) {
        updateFields.push('cohort = ?');
        updateValues.push(userData.cohort);
      }
      
      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }
      
      // Add the updated_at field
      updateFields.push('updated_at = NOW()');
      updateValues.push(id); // For the WHERE clause
      
      const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
      
      await db.execute(sql, updateValues);

      return this.findById(id);
    } catch (error) {
      throw error;
    }
  }

  static async updatePassword(id, newPassword) {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      await db.execute(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedPassword, id]
      );

      return true;
    } catch (error) {
      throw error;
    }
  }  static async delete(id) {
    try {
      // Check if user has created visitors
      const [visitorCount] = await db.execute(
        'SELECT COUNT(*) as count FROM visitors WHERE input_by_user_id = ?',
        [id]
      );

      if (visitorCount[0].count > 0) {
        const error = new Error('Cannot delete user who has created visitor records');
        error.visitorCount = visitorCount[0].count;
        throw error;
      }

      await db.execute('DELETE FROM users WHERE id = ?', [id]);
      return true;
    } catch (error) {
      throw error;
    }
  }static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async verifyPasswordById(userId, plainPassword) {
    try {
      const [rows] = await db.execute(
        'SELECT password FROM users WHERE id = ?',
        [userId]
      );
      
      if (!rows[0]) {
        return false;
      }
      
      return await bcrypt.compare(plainPassword, rows[0].password);
    } catch (error) {
      throw error;
    }
  }

  static async getStats() {
    try {
      const [adminCount] = await db.execute(
        'SELECT COUNT(*) as count FROM users WHERE role = ?',
        ['Admin']
      );
      
      const [receptionistCount] = await db.execute(
        'SELECT COUNT(*) as count FROM users WHERE role = ?',
        ['Receptionist']
      );

      const [totalCount] = await db.execute(
        'SELECT COUNT(*) as count FROM users'
      );

      const [recentUsers] = await db.execute(
        'SELECT name, role, created_at FROM users ORDER BY created_at DESC LIMIT 5'
      );

      return {
        total: totalCount[0].count,
        admins: adminCount[0].count,
        receptionists: receptionistCount[0].count,
        recent: recentUsers
      };
    } catch (error) {
      throw error;
    }
  }

  static async changeRole(id, newRole) {
    try {
      if (!['Admin', 'Receptionist'].includes(newRole)) {
        throw new Error('Invalid role. Must be Admin or Receptionist');
      }

      await db.execute(
        'UPDATE users SET role = ? WHERE id = ?',
        [newRole, id]
      );

      return this.findById(id);
    } catch (error) {
      throw error;
    }
  }

  static async isEmailTaken(email, excludeId = null) {
    try {
      let query = 'SELECT COUNT(*) as count FROM users WHERE email = ?';
      const params = [email];

      if (excludeId) {
        query += ' AND id != ?';
        params.push(excludeId);
      }

      const [rows] = await db.execute(query, params);
      return rows[0].count > 0;
    } catch (error) {
      throw error;
    }
  }

  // Get visitor count for user
  static async getVisitorCount(userId) {
    try {
      const [rows] = await db.execute(
        'SELECT COUNT(*) as count FROM visitors WHERE input_by_user_id = ?',
        [userId]
      );
      return rows[0].count;
    } catch (error) {
      throw error;
    }
  }

  // Transfer visitors from one user to another
  static async transferVisitors(fromUserId, toUserId) {
    try {
      const [result] = await db.execute(
        'UPDATE visitors SET input_by_user_id = ? WHERE input_by_user_id = ?',
        [toUserId, fromUserId]
      );
      return result.affectedRows;
    } catch (error) {
      throw error;
    }
  }
}
