import db from '../config/database.js';

/**
 * FeedbackManagement Model
 * Handles feedback operations and management
 */
export class FeedbackManagement {
  
  /**
   * Create feedback entry
   */
  static async create(feedbackData) {
    try {
      const {
        visitor_id,
        visitor_name,
        access_ease_rating,
        wait_time_rating,
        staff_friendliness_rating,
        info_clarity_rating,
        overall_satisfaction_rating,
        willing_to_return,
        likes,
        suggestions,
        rating,
        category,
        feedback_text
      } = feedbackData;

      // For backward compatibility with simplified feedback format
      const query = `
        INSERT INTO feedbacks (
          visitor_id, visitor_name, access_ease_rating, wait_time_rating,
          staff_friendliness_rating, info_clarity_rating, overall_satisfaction_rating,
          willing_to_return, likes, suggestions, rating, category, feedback_text
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const [result] = await db.execute(query, [
        visitor_id || null,
        visitor_name,
        access_ease_rating || rating || null,
        wait_time_rating || null,
        staff_friendliness_rating || null,
        info_clarity_rating || null,
        overall_satisfaction_rating || rating || null,
        willing_to_return || null,
        likes || null,
        suggestions || feedback_text || null,
        rating || overall_satisfaction_rating || null,
        category || 'overall',
        feedback_text || suggestions || null
      ]);

      return {
        id: result.insertId,
        ...feedbackData
      };
    } catch (error) {
      console.error('Error creating feedback:', error);
      throw error;
    }
  }

  /**
   * Get all feedback entries with filters
   */
  static async findAll(filters = {}) {
    try {
      let query = `
        SELECT f.*, v.full_name as visitor_full_name, v.check_in_time, v.check_out_time,
               u.name as operator_name, u.role as operator_role
        FROM feedbacks f
        LEFT JOIN visitors v ON f.visitor_id = v.id
        LEFT JOIN users u ON v.input_by_user_id = u.id
      `;
      
      const params = [];
      const conditions = [];

      // Filter by rating
      if (filters.rating) {
        conditions.push('(f.rating = ? OR f.overall_satisfaction_rating = ?)');
        params.push(filters.rating, filters.rating);
      }

      // Filter by rating range
      if (filters.minRating) {
        conditions.push('(f.rating >= ? OR f.overall_satisfaction_rating >= ?)');
        params.push(filters.minRating, filters.minRating);
      }

      if (filters.maxRating) {
        conditions.push('(f.rating <= ? OR f.overall_satisfaction_rating <= ?)');
        params.push(filters.maxRating, filters.maxRating);
      }

      // Filter by category
      if (filters.category) {
        conditions.push('f.category = ?');
        params.push(filters.category);
      }

      // Filter by date range
      if (filters.startDate && filters.endDate) {
        conditions.push('DATE(f.created_at) BETWEEN ? AND ?');
        params.push(filters.startDate, filters.endDate);
      }

      // Filter by visitor
      if (filters.visitorName) {
        conditions.push('(f.visitor_name LIKE ? OR v.full_name LIKE ?)');
        params.push(`%${filters.visitorName}%`, `%${filters.visitorName}%`);
      }

      // Filter by text content
      if (filters.searchText) {
        conditions.push('(f.feedback_text LIKE ? OR f.likes LIKE ? OR f.suggestions LIKE ?)');
        params.push(`%${filters.searchText}%`, `%${filters.searchText}%`, `%${filters.searchText}%`);
      }

      // Filter by operator
      if (filters.operator) {
        conditions.push('u.name LIKE ?');
        params.push(`%${filters.operator}%`);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY f.created_at DESC';

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
      console.error('Error fetching feedbacks:', error);
      throw error;
    }
  }

  /**
   * Get feedback by ID
   */
  static async findById(id) {
    try {
      const [rows] = await db.execute(
        `SELECT f.*, v.full_name as visitor_full_name, v.check_in_time, v.check_out_time,
                u.name as operator_name, u.role as operator_role, u.avatar_url as operator_avatar
         FROM feedbacks f
         LEFT JOIN visitors v ON f.visitor_id = v.id
         LEFT JOIN users u ON v.input_by_user_id = u.id
         WHERE f.id = ?`,
        [id]
      );
      return rows[0];
    } catch (error) {
      console.error('Error fetching feedback by ID:', error);
      throw error;
    }
  }

  /**
   * Get feedback by visitor ID
   */
  static async findByVisitorId(visitorId) {
    try {
      const [rows] = await db.execute(
        `SELECT f.*, v.full_name as visitor_full_name, v.check_in_time, v.check_out_time,
                u.name as operator_name, u.role as operator_role, u.avatar_url as operator_avatar
         FROM feedbacks f
         LEFT JOIN visitors v ON f.visitor_id = v.id
         LEFT JOIN users u ON v.input_by_user_id = u.id
         WHERE f.visitor_id = ?
         ORDER BY f.created_at DESC`,
        [visitorId]
      );
      return rows;
    } catch (error) {
      console.error('Error fetching feedback by visitor ID:', error);
      throw error;
    }
  }

  /**
   * Update feedback
   */
  static async update(id, feedbackData) {
    try {
      const {
        access_ease_rating,
        wait_time_rating,
        staff_friendliness_rating,
        info_clarity_rating,
        overall_satisfaction_rating,
        willing_to_return,
        likes,
        suggestions,
        rating,
        category,
        feedback_text
      } = feedbackData;

      await db.execute(
        `UPDATE feedbacks SET
         access_ease_rating = ?, wait_time_rating = ?, staff_friendliness_rating = ?,
         info_clarity_rating = ?, overall_satisfaction_rating = ?, willing_to_return = ?,
         likes = ?, suggestions = ?, rating = ?, category = ?, feedback_text = ?
         WHERE id = ?`,
        [
          access_ease_rating || rating,
          wait_time_rating,
          staff_friendliness_rating,
          info_clarity_rating,
          overall_satisfaction_rating || rating,
          willing_to_return,
          likes,
          suggestions || feedback_text,
          rating || overall_satisfaction_rating,
          category,
          feedback_text || suggestions,
          id
        ]
      );

      return this.findById(id);
    } catch (error) {
      console.error('Error updating feedback:', error);
      throw error;
    }
  }

  /**
   * Delete feedback
   */
  static async delete(id) {
    try {
      await db.execute('DELETE FROM feedbacks WHERE id = ?', [id]);
      return true;
    } catch (error) {
      console.error('Error deleting feedback:', error);
      throw error;
    }
  }

  /**
   * Get feedback statistics
   */
  static async getStatistics(filters = {}) {
    try {
      let dateCondition = '';
      const params = [];

      if (filters.startDate && filters.endDate) {
        dateCondition = 'WHERE DATE(f.created_at) BETWEEN ? AND ?';
        params.push(filters.startDate, filters.endDate);
      }

      // Total feedback count
      const [totalResult] = await db.execute(
        `SELECT COUNT(*) as total FROM feedbacks f ${dateCondition}`,
        params
      );

      // Average ratings
      const [avgResult] = await db.execute(
        `SELECT 
           AVG(COALESCE(rating, overall_satisfaction_rating)) as overall_avg,
           AVG(access_ease_rating) as access_ease_avg,
           AVG(wait_time_rating) as wait_time_avg,
           AVG(staff_friendliness_rating) as staff_friendliness_avg,
           AVG(info_clarity_rating) as info_clarity_avg
         FROM feedbacks f ${dateCondition}`,
        params
      );

      // Rating distribution
      const [ratingDistribution] = await db.execute(
        `SELECT 
           COALESCE(rating, overall_satisfaction_rating) as rating,
           COUNT(*) as count
         FROM feedbacks f ${dateCondition}
         GROUP BY COALESCE(rating, overall_satisfaction_rating)
         ORDER BY rating DESC`,
        params
      );

      // Category distribution
      const [categoryDistribution] = await db.execute(
        `SELECT category, COUNT(*) as count
         FROM feedbacks f ${dateCondition}
         GROUP BY category
         ORDER BY count DESC`,
        params
      );

      // Willing to return statistics
      const [willingToReturnStats] = await db.execute(
        `SELECT willing_to_return, COUNT(*) as count
         FROM feedbacks f ${dateCondition}
         WHERE willing_to_return IS NOT NULL
         GROUP BY willing_to_return`,
        params
      );

      // Recent feedback
      const [recentFeedback] = await db.execute(
        `SELECT f.*, v.full_name as visitor_full_name, u.name as operator_name
         FROM feedbacks f
         LEFT JOIN visitors v ON f.visitor_id = v.id
         LEFT JOIN users u ON v.input_by_user_id = u.id
         ${dateCondition}
         ORDER BY f.created_at DESC
         LIMIT 10`,
        params
      );

      // Monthly trend
      const [monthlyTrend] = await db.execute(
        `SELECT 
           DATE_FORMAT(f.created_at, '%Y-%m') as month,
           COUNT(*) as count,
           AVG(COALESCE(rating, overall_satisfaction_rating)) as avg_rating
         FROM feedbacks f
         WHERE f.created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 12 MONTH)
         GROUP BY DATE_FORMAT(f.created_at, '%Y-%m')
         ORDER BY month`,
        []
      );

      // Satisfaction levels
      const [satisfactionLevels] = await db.execute(
        `SELECT 
           CASE 
             WHEN COALESCE(rating, overall_satisfaction_rating) >= 4 THEN 'Satisfied'
             WHEN COALESCE(rating, overall_satisfaction_rating) = 3 THEN 'Neutral'
             ELSE 'Dissatisfied'
           END as satisfaction_level,
           COUNT(*) as count
         FROM feedbacks f ${dateCondition}
         WHERE COALESCE(rating, overall_satisfaction_rating) IS NOT NULL
         GROUP BY satisfaction_level`,
        params
      );

      return {
        total: totalResult[0].total,
        averageRatings: {
          overall: parseFloat(avgResult[0].overall_avg || 0).toFixed(1),
          accessEase: parseFloat(avgResult[0].access_ease_avg || 0).toFixed(1),
          waitTime: parseFloat(avgResult[0].wait_time_avg || 0).toFixed(1),
          staffFriendliness: parseFloat(avgResult[0].staff_friendliness_avg || 0).toFixed(1),
          infoCLarity: parseFloat(avgResult[0].info_clarity_avg || 0).toFixed(1)
        },
        ratingDistribution,
        categoryDistribution,
        willingToReturnStats,
        recentFeedback,
        monthlyTrend,
        satisfactionLevels
      };
    } catch (error) {
      console.error('Error getting feedback statistics:', error);
      throw error;
    }
  }

  /**
   * Get feedback configuration for dynamic forms
   */
  static async getFeedbackConfiguration() {
    try {
      // Get from CMS or return default configuration
      const [configResult] = await db.execute(
        "SELECT content_value FROM cms_content WHERE content_key = 'feedback_config'"
      );

      if (configResult.length > 0) {
        return JSON.parse(configResult[0].content_value);
      }

      // Default configuration
      return {
        categories: [
          { value: 'service', label: 'Pelayanan Staff' },
          { value: 'facility', label: 'Fasilitas' },
          { value: 'process', label: 'Proses Kunjungan' },
          { value: 'overall', label: 'Keseluruhan' },
          { value: 'suggestion', label: 'Saran' }
        ],
        ratingFields: [
          { key: 'access_ease_rating', label: 'Kemudahan Akses', required: false },
          { key: 'wait_time_rating', label: 'Waktu Tunggu', required: false },
          { key: 'staff_friendliness_rating', label: 'Keramahan Staff', required: false },
          { key: 'info_clarity_rating', label: 'Kejelasan Informasi', required: false },
          { key: 'overall_satisfaction_rating', label: 'Kepuasan Keseluruhan', required: true }
        ],
        textFields: [
          { key: 'likes', label: 'Yang Disukai', required: false },
          { key: 'suggestions', label: 'Saran', required: false }
        ],
        willingToReturn: {
          enabled: true,
          label: 'Bersedia Datang Kembali?',
          options: [
            { value: 'Ya', label: 'Ya' },
            { value: 'Tidak', label: 'Tidak' }
          ]
        }
      };
    } catch (error) {
      console.error('Error getting feedback configuration:', error);
      throw error;
    }
  }

  /**
   * Update feedback configuration
   */
  static async updateFeedbackConfiguration(config) {
    try {
      await db.execute(
        `INSERT INTO cms_content (content_key, content_value) 
         VALUES ('feedback_config', ?) 
         ON DUPLICATE KEY UPDATE content_value = VALUES(content_value)`,
        [JSON.stringify(config)]
      );
      return config;
    } catch (error) {
      console.error('Error updating feedback configuration:', error);
      throw error;
    }
  }

  /**
   * Export feedback data
   */
  static async exportData(filters = {}, format = 'json') {
    try {
      const feedbacks = await this.findAll(filters);
      
      if (format === 'csv') {
        // Convert to CSV format
        const headers = [
          'ID', 'Visitor Name', 'Rating', 'Category', 'Feedback Text',
          'Access Ease', 'Wait Time', 'Staff Friendliness', 'Info Clarity',
          'Overall Satisfaction', 'Willing to Return', 'Likes', 'Suggestions',
          'Operator Name', 'Created At'
        ];
        
        const rows = feedbacks.map(feedback => [
          feedback.id,
          feedback.visitor_name,
          feedback.rating || feedback.overall_satisfaction_rating,
          feedback.category,
          feedback.feedback_text || feedback.suggestions,
          feedback.access_ease_rating,
          feedback.wait_time_rating,
          feedback.staff_friendliness_rating,
          feedback.info_clarity_rating,
          feedback.overall_satisfaction_rating,
          feedback.willing_to_return,
          feedback.likes,
          feedback.suggestions,
          feedback.operator_name,
          feedback.created_at
        ]);

        return {
          headers,
          rows
        };
      }

      return feedbacks;
    } catch (error) {
      console.error('Error exporting feedback data:', error);
      throw error;
    }
  }
}

export default FeedbackManagement;
