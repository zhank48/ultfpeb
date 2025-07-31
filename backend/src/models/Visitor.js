import db from '../config/database.js';

export class Visitor {
  static async findAll(filters = {}) {
    try {
      let query = `
        SELECT v.*, 
               u.name as input_by_name, 
               u.role as input_by_role,
               u.avatar_url as input_by_avatar,
               u.avatar_url as input_by_photo,
               u.avatar_url as operator_avatar,
               u.avatar_url as operator_photo_url,
               u.email as input_by_email,
               u.study_program as input_by_study_program,
               u.cohort as input_by_cohort,
               u.phone as input_by_phone,
               checkout_u.name as checkout_by_name,
               checkout_u.role as checkout_by_role,
               checkout_u.avatar_url as checkout_by_avatar,
               checkout_u.email as checkout_by_email
        FROM visitors v 
        LEFT JOIN users u ON v.input_by_user_id = u.id
        LEFT JOIN users checkout_u ON v.checkout_by_user_id = checkout_u.id
        WHERE v.deleted_at IS NULL
      `;
      
      const params = [];
      const conditions = [];

      // Add filters
      if (filters.startDate && filters.endDate) {
        conditions.push('v.check_in_time BETWEEN ? AND ?');
        params.push(filters.startDate, filters.endDate);
      }

      if (filters.location) {
        conditions.push('v.location LIKE ?');
        params.push(`%${filters.location}%`);
      }

      if (filters.search) {
        conditions.push('(v.full_name LIKE ? OR v.institution LIKE ? OR v.purpose LIKE ?)');
        params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
      }

      if (conditions.length > 0) {
        query += ' AND ' + conditions.join(' AND ');
      }      query += ' ORDER BY v.check_in_time DESC';

      // Add limit if specified
      if (filters.limit) {
        query += ` LIMIT ${parseInt(filters.limit)}`;
      }

      const [rows] = await db.execute(query, params);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    try {
      const [rows] = await db.execute(
        `SELECT v.*, 
                u.name as input_by_name, 
                u.role as input_by_role, 
                u.avatar_url as input_by_avatar,
                u.avatar_url as input_by_photo,
                u.avatar_url as operator_avatar,
                u.avatar_url as operator_photo_url,
                u.email as input_by_email,
                u.study_program as input_by_study_program,
                u.cohort as input_by_cohort,
                u.phone as input_by_phone,
                checkout_u.name as checkout_by_name,
                checkout_u.role as checkout_by_role,
                checkout_u.avatar_url as checkout_by_avatar,
                checkout_u.email as checkout_by_email
         FROM visitors v 
         LEFT JOIN users u ON v.input_by_user_id = u.id
         LEFT JOIN users checkout_u ON v.checkout_by_user_id = checkout_u.id
         WHERE v.id = ?`,
        [id]
      );
      return rows[0];
    } catch (error) {
      throw error;
    }
  }  static formatDateTimeForMySQL(dateTime) {
    if (!dateTime) return null;
    
    try {
      const date = new Date(dateTime);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }
      
      // Format: YYYY-MM-DD HH:mm:ss
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    } catch (error) {
      console.error('Error formatting datetime:', error);
      return null;
    }
  }
  static async create(visitorData) {
    try {
      const {
        full_name, phone_number, email, institution, purpose, person_to_meet,
        photo_url, signature_url, check_in_time, input_by_user_id,
        id_number, id_type, address, request_document, document_type, document_name, document_number
      } = visitorData;

      // Convert datetime to MySQL format
      const formattedCheckInTime = this.formatDateTimeForMySQL(check_in_time) || this.formatDateTimeForMySQL(new Date());

      const [result] = await db.execute(
        `INSERT INTO visitors 
         (full_name, phone_number, email, institution, purpose, person_to_meet,
          photo_url, signature_url, check_in_time, input_by_user_id, id_number, id_type, address,
          request_document, document_type, document_name, document_number) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [full_name, phone_number, email || '', institution, purpose, person_to_meet || '', 
         photo_url || '', signature_url || '', formattedCheckInTime, input_by_user_id, 
         id_number || '', id_type || '', address || '', 
         request_document || false, document_type || null, document_name || null, document_number || null]
      );

      return this.findById(result.insertId);
    } catch (error) {
      console.error('Error creating visitor:', error);
      throw error;
    }
  }

  static async update(id, visitorData) {
    try {
      const {
        full_name, phone_number, institution, purpose, person_to_meet,
        photo_url, signature_url, id_number, id_type, address, email
      } = visitorData;

      await db.execute(
        `UPDATE visitors 
         SET full_name = ?, phone_number = ?, email = ?, institution = ?, purpose = ?, 
             person_to_meet = ?, photo_url = ?, signature_url = ?,
             id_number = ?, id_type = ?, address = ?
         WHERE id = ?`,
        [full_name, phone_number, email || '', institution, purpose, person_to_meet,
         photo_url, signature_url, id_number || '', id_type || '', address || '', id]
      );

      return this.findById(id);
    } catch (error) {
      throw error;
    }
  }  static async checkOut(id, check_out_time, checkoutOperator = null) {
    try {
      // Convert datetime to MySQL format
      const formattedCheckOutTime = this.formatDateTimeForMySQL(check_out_time) || this.formatDateTimeForMySQL(new Date());

      // Prepare update query with checkout operator info
      let updateQuery = 'UPDATE visitors SET check_out_time = ?';
      let params = [formattedCheckOutTime];

      if (checkoutOperator) {
        updateQuery += ', checkout_by_user_id = ?, checkout_by_name = ?, checkout_by_role = ?, checkout_by_avatar = ?';
        params.push(checkoutOperator.userId, checkoutOperator.name, checkoutOperator.role, checkoutOperator.avatar);
      }

      updateQuery += ' WHERE id = ?';
      params.push(id);

      await db.execute(updateQuery, params);

      return this.findById(id);
    } catch (error) {
      console.error('Error checking out visitor:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      await db.execute('DELETE FROM visitors WHERE id = ?', [id]);
      return true;
    } catch (error) {
      throw error;
    }
  }
  static async getStatistics(filters = {}) {
    try {
      let dateCondition = '';
      const params = [];

      if (filters.startDate && filters.endDate) {
        dateCondition = 'WHERE check_in_time BETWEEN ? AND ?';
        params.push(filters.startDate, filters.endDate);
      }

      // Total visitors
      const [totalResult] = await db.execute(
        `SELECT COUNT(*) as total FROM visitors ${dateCondition}`,
        params
      );

      // Today's visitors
      const [todayResult] = await db.execute(
        `SELECT COUNT(*) as today FROM visitors WHERE DATE(check_in_time) = CURDATE()`
      );

      // Active visitors (checked in but not checked out)
      const [activeResult] = await db.execute(
        `SELECT COUNT(*) as active FROM visitors WHERE check_out_time IS NULL`
      );

      // This week vs last week comparison
      const [thisWeekResult] = await db.execute(
        `SELECT COUNT(*) as this_week FROM visitors 
         WHERE check_in_time >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)`
      );

      const [lastWeekResult] = await db.execute(
        `SELECT COUNT(*) as last_week FROM visitors 
         WHERE check_in_time >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) + 7 DAY)
         AND check_in_time < DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)`
      );

      // Calculate weekly growth percentage
      const thisWeek = thisWeekResult[0].this_week;
      const lastWeek = lastWeekResult[0].last_week;
      const weeklyGrowth = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek * 100) : 0;

      // Visitors by location
      const [locationResult] = await db.execute(
        `SELECT location, COUNT(*) as count FROM visitors ${dateCondition} GROUP BY location ORDER BY count DESC`,
        params
      );

      // Daily visits (last 7 days)
      const [dailyResult] = await db.execute(
        `SELECT DATE(check_in_time) as date, COUNT(*) as count 
         FROM visitors 
         WHERE check_in_time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
         GROUP BY DATE(check_in_time)
         ORDER BY date`
      );

      // Recent visitors
      const [recentResult] = await db.execute(
        `SELECT v.*, u.name as input_by_name 
         FROM visitors v 
         LEFT JOIN users u ON v.input_by_user_id = u.id
         ORDER BY v.check_in_time DESC 
         LIMIT 10`
      );      // Popular purposes
      const [purposeResult] = await db.execute(
        `SELECT purpose, COUNT(*) as count FROM visitors ${dateCondition} GROUP BY purpose ORDER BY count DESC LIMIT 5`,
        params
      );      // Unit/Department statistics based on the new units structure
      const [unitResult] = await db.execute(
        `SELECT 
           CASE 
             WHEN location LIKE '%Dekan%' THEN 'Dekan'
             WHEN location LIKE '%Wakil Dekan Bidang Akademik%' OR location LIKE '%WD 1%' THEN 'Wakil Dekan Bidang Akademik (WD 1)'
             WHEN location LIKE '%Wakil Dekan bidang Sumberdaya%' OR location LIKE '%WD 2%' THEN 'Wakil Dekan bidang Sumberdaya, Keuangan, dan Umum (WD 2)'
             WHEN location LIKE '%Wakil Dekan Bidang Kemahasiswaan%' OR location LIKE '%WD 3%' THEN 'Wakil Dekan Bidang Kemahasiswaan (WD 3)'
             WHEN location LIKE '%Prodi Akuntansi (S1)%' OR location LIKE '%Akuntansi S1%' THEN 'Prodi Akuntansi (S1)'
             WHEN location LIKE '%Prodi Ilmu Akuntansi (S2)%' OR location LIKE '%Akuntansi S2%' THEN 'Prodi Ilmu Akuntansi (S2)'
             WHEN location LIKE '%Prodi Ilmu Ekonomi dan Keuangan Islam%' OR location LIKE '%Ekonomi Islam%' THEN 'Prodi Ilmu Ekonomi dan Keuangan Islam (S1)'
             WHEN location LIKE '%Prodi Manajemen (S1)%' OR location LIKE '%Manajemen S1%' THEN 'Prodi Manajemen (S1)'
             WHEN location LIKE '%Prodi Manajemen (S2)%' OR location LIKE '%Manajemen S2%' THEN 'Prodi Manajemen (S2)'
             WHEN location LIKE '%Prodi Manajemen (S3)%' OR location LIKE '%Manajemen S3%' THEN 'Prodi Manajemen (S3)'
             WHEN location LIKE '%Prodi Pendidikan Akuntansi%' OR location LIKE '%Pendidikan Akuntansi%' THEN 'Prodi Pendidikan Akuntansi (S1)'
             WHEN location LIKE '%Prodi Pendidikan Bisnis%' OR location LIKE '%Pendidikan Bisnis%' THEN 'Prodi Pendidikan Bisnis (S1)'
             WHEN location LIKE '%Prodi Pendidikan Ekonomi (S1)%' OR location LIKE '%Pendidikan Ekonomi S1%' THEN 'Prodi Pendidikan Ekonomi (S1)'
             WHEN location LIKE '%Prodi Pendidikan Ekonomi (S2)%' OR location LIKE '%Pendidikan Ekonomi S2%' THEN 'Prodi Pendidikan Ekonomi (S2)'
             WHEN location LIKE '%Prodi Pendidikan Ekonomi (S3)%' OR location LIKE '%Pendidikan Ekonomi S3%' THEN 'Prodi Pendidikan Ekonomi (S3)'
             WHEN location LIKE '%Prodi Pendidikan Manajemen Perkantoran%' OR location LIKE '%Manajemen Perkantoran%' THEN 'Prodi Pendidikan Manajemen Perkantoran (S1)'
             WHEN location LIKE '%Administrasi Umum dan Perlengkapan%' OR location LIKE '%ADUM%' THEN 'Administrasi Umum dan Perlengkapan (ADUM)'
             WHEN location LIKE '%Akademik dan Kemahasiswaan%' OR location LIKE '%AKMAWA%' THEN 'Akademik dan Kemahasiswaan (AKMAWA)'
             ELSE 'Lainnya'
           END as unit_name,
           COUNT(*) as count
         FROM visitors ${dateCondition}
         WHERE location IS NOT NULL AND location != ''
         GROUP BY unit_name
         ORDER BY count DESC`,
        params
      );

      // Calculate percentages for units
      const totalUnitVisitors = unitResult.reduce((sum, unit) => sum + unit.count, 0);
      const unitStats = unitResult.map(unit => ({
        name: unit.unit_name,
        visitors: unit.count,
        percentage: totalUnitVisitors > 0 ? Math.round((unit.count / totalUnitVisitors) * 100) : 0
      }));      return {
        total: totalResult[0].total,
        today: todayResult[0].today,
        active: activeResult[0].active,
        weeklyGrowth: Math.round(weeklyGrowth * 10) / 10,
        mostVisitedUnit: unitStats.length > 0 ? unitStats[0] : { name: 'No Data', visitors: 0 },
        byLocation: locationResult,
        dailyVisits: dailyResult,
        recentVisitors: recentResult,
        popularPurposes: purposeResult,
        unitStats: unitStats
      };
    } catch (error) {
      throw error;
    }
  }
  
  // Soft Delete Methods
  static async softDelete(id, deletedBy) {
    try {
      const [result] = await db.execute(
        'UPDATE visitors SET deleted_at = NOW(), deleted_by = ? WHERE id = ? AND deleted_at IS NULL',
        [deletedBy, id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }
  
  static async restore(id) {
    try {
      const [result] = await db.execute(
        'UPDATE visitors SET deleted_at = NULL, deleted_by = NULL WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }
  
  static async findAllWithDeleted(filters = {}) {
    try {
      let query = `
        SELECT v.*, 
               u.name as input_by_name, 
               u.role as input_by_role,
               u.avatar_url as input_by_avatar,
               u.avatar_url as input_by_photo,
               u.avatar_url as operator_avatar,
               u.avatar_url as operator_photo_url,
               u.email as input_by_email,
               deleted_u.name as deleted_by_name,
               checkout_u.name as checkout_by_name,
               checkout_u.role as checkout_by_role,
               checkout_u.avatar_url as checkout_by_avatar,
               checkout_u.email as checkout_by_email
        FROM visitors v 
        LEFT JOIN users u ON v.input_by_user_id = u.id
        LEFT JOIN users deleted_u ON v.deleted_by = deleted_u.id
        LEFT JOIN users checkout_u ON v.checkout_by_user_id = checkout_u.id
      `;
      
      const params = [];
      const conditions = [];

      // Add filters
      if (filters.includeDeleted === false) {
        conditions.push('v.deleted_at IS NULL');
      }

      if (filters.onlyDeleted === true) {
        conditions.push('v.deleted_at IS NOT NULL');
      }

      if (filters.startDate && filters.endDate) {
        conditions.push('v.check_in_time BETWEEN ? AND ?');
        params.push(filters.startDate, filters.endDate);
      }

      if (filters.location) {
        conditions.push('v.location LIKE ?');
        params.push(`%${filters.location}%`);
      }

      if (filters.search) {
        conditions.push('(v.full_name LIKE ? OR v.institution LIKE ? OR v.purpose LIKE ?)');
        params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY v.check_in_time DESC';

      if (filters.limit) {
        query += ` LIMIT ${parseInt(filters.limit)}`;
      }

      const [rows] = await db.execute(query, params);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      const setClause = [];
      const params = [];
      
      // Build dynamic update query
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          setClause.push(`${key} = ?`);
          params.push(updateData[key]);
        }
      });
      
      if (setClause.length === 0) {
        throw new Error('No fields to update');
      }
      
      params.push(id);
      
      const [result] = await db.execute(
        `UPDATE visitors SET ${setClause.join(', ')}, updated_at = NOW() WHERE id = ?`,
        params
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  static async permanentDelete(id) {
    try {
      const [result] = await db.execute(
        'DELETE FROM visitors WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  static async findAllDeleted(filters = {}) {
    try {
      let query = `
        SELECT v.*, 
               u.name as input_by_name, 
               u.role as input_by_role,
               u.avatar_url as input_by_avatar,
               u.avatar_url as input_by_photo,
               u.avatar_url as operator_avatar,
               u.avatar_url as operator_photo_url,
               u.email as input_by_email,
               deleted_u.name as deleted_by_name,
               checkout_u.name as checkout_by_name,
               checkout_u.role as checkout_by_role,
               checkout_u.avatar_url as checkout_by_avatar,
               checkout_u.email as checkout_by_email
        FROM visitors v 
        LEFT JOIN users u ON v.input_by_user_id = u.id
        LEFT JOIN users deleted_u ON v.deleted_by = deleted_u.id
        LEFT JOIN users checkout_u ON v.checkout_by_user_id = checkout_u.id
        WHERE v.deleted_at IS NOT NULL
      `;
      
      const params = [];
      const conditions = [];

      // Add filters
      if (filters.startDate && filters.endDate) {
        conditions.push('v.check_in_time BETWEEN ? AND ?');
        params.push(filters.startDate, filters.endDate);
      }

      if (filters.location) {
        conditions.push('v.location LIKE ?');
        params.push(`%${filters.location}%`);
      }

      if (filters.search) {
        conditions.push('(v.full_name LIKE ? OR v.institution LIKE ? OR v.purpose LIKE ?)');
        params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
      }

      if (conditions.length > 0) {
        query += ' AND ' + conditions.join(' AND ');
      }

      query += ' ORDER BY v.deleted_at DESC';

      const [rows] = await db.execute(query, params);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Stats methods for visitor counts
  static async getTotalCount() {
    try {
      const [rows] = await db.execute('SELECT COUNT(*) as count FROM visitors');
      return rows[0].count;
    } catch (error) {
      console.error('Error getting total visitor count:', error);
      return 0;
    }
  }

  static async getActiveCount() {
    try {
      const [rows] = await db.execute('SELECT COUNT(*) as count FROM visitors WHERE deleted_at IS NULL');
      return rows[0].count;
    } catch (error) {
      console.error('Error getting active visitor count:', error);
      return 0;
    }
  }

  static async getDeletedCount() {
    try {
      const [rows] = await db.execute('SELECT COUNT(*) as count FROM visitors WHERE deleted_at IS NOT NULL');
      return rows[0].count;
    } catch (error) {
      console.error('Error getting deleted visitor count:', error);
      return 0;
    }
  }
}
