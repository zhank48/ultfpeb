import db from '../config/database.js';

/**
 * Configuration Model
 * Handles dynamic configuration for check-in categories, units, purposes, and persons to meet
 */
export class Configuration {
  
  /**
   * Get all configurations organized by categories
   */
  static async getAll() {
    try {
      const [rows] = await db.execute(
        `SELECT cc.key_name as category, cc.display_name as category_display,
                co.id, co.option_value, co.display_text, co.group_id, co.sort_order
         FROM configuration_categories cc
         LEFT JOIN configuration_options co ON cc.id = co.category_id AND co.is_active = true
         WHERE cc.is_active = true
         ORDER BY cc.key_name, co.sort_order`
      );

      // Group by category and format for frontend
      const result = {
        purposes: [],
        units: [],
        personToMeet: []
      };
      
      rows.forEach(row => {
        if (row.id) {
          const option = {
            id: row.id,
            name: row.display_text,
            value: row.option_value,
            sort_order: row.sort_order
          };

          // Map categories to frontend format
          switch(row.category) {
            case 'purposes':
              result.purposes.push(option);
              break;
            case 'units':
              result.units.push(option);
              break;
            case 'person_to_meet':
              result.personToMeet.push(option);
              break;
          }
        }
      });

      return result;
    } catch (error) {
      console.error('Error fetching all configurations:', error);
      throw error;
    }
  }

  /**
   * Get all configurations by category
   */
  static async getByCategory(category) {
    try {
      const [rows] = await db.execute(
        `SELECT cc.key_name as category, cc.display_name,
                co.id, co.option_value, co.display_text, co.group_id, co.sort_order
         FROM configuration_categories cc
         LEFT JOIN configuration_options co ON cc.id = co.category_id AND co.is_active = true
         WHERE cc.key_name = ? AND cc.is_active = true
         ORDER BY co.sort_order`,
        [category]
      );

      const options = rows
        .filter(row => row.id)
        .map(row => ({
          id: row.id,
          value: row.option_value,
          display_text: row.display_text,
          group_id: row.group_id,
          sort_order: row.sort_order
        }));

      return {
        category: category,
        display_name: rows[0]?.display_name || category,
        options: options
      };
    } catch (error) {
      console.error('Error fetching configuration by category:', error);
      throw error;
    }
  }

  /**
   * Get all purposes configuration
   */
  static async getPurposes() {
    try {
      return await this.getByCategory('purposes');
    } catch (error) {
      console.error('Error fetching purposes:', error);
      throw error;
    }
  }

  /**
   * Get all units configuration
   */
  static async getUnits() {
    try {
      return await this.getByCategory('units');
    } catch (error) {
      console.error('Error fetching units:', error);
      throw error;
    }
  }

  /**
   * Get all persons to meet configuration
   */
  static async getPersonsToMeet() {
    try {
      return await this.getByCategory('person_to_meet');
    } catch (error) {
      console.error('Error fetching persons to meet:', error);
      throw error;
    }
  }

  /**
   * Get all configurations (all categories)
   */
  static async getAllConfigurations() {
    try {
      const [purposes, units, personsToMeet] = await Promise.all([
        this.getPurposes(),
        this.getUnits(),
        this.getPersonsToMeet()
      ]);

      return {
        purposes,
        units,
        person_to_meet: personsToMeet
      };
    } catch (error) {
      console.error('Error fetching all configurations:', error);
      throw error;
    }
  }

  /**
   * Create configuration category
   */
  static async createCategory(categoryData) {
    try {
      const { key_name, display_name, description } = categoryData;

      const [result] = await db.execute(
        `INSERT INTO configuration_categories (key_name, display_name, description, is_active)
         VALUES (?, ?, ?, true)`,
        [key_name, display_name, description]
      );

      return {
        id: result.insertId,
        ...categoryData,
        is_active: true
      };
    } catch (error) {
      console.error('Error creating configuration category:', error);
      throw error;
    }
  }

  /**
   * Update configuration category
   */
  static async updateCategory(id, categoryData) {
    try {
      const { key_name, display_name, description, is_active } = categoryData;

      const setClause = [];
      const params = [];

      if (key_name !== undefined) {
        setClause.push('key_name = ?');
        params.push(key_name);
      }
      if (display_name !== undefined) {
        setClause.push('display_name = ?');
        params.push(display_name);
      }
      if (description !== undefined) {
        setClause.push('description = ?');
        params.push(description);
      }
      if (is_active !== undefined) {
        setClause.push('is_active = ?');
        params.push(is_active);
      }

      if (setClause.length === 0) {
        throw new Error('No update data provided');
      }

      params.push(id);
      
      await db.execute(
        `UPDATE configuration_categories SET ${setClause.join(', ')} WHERE id = ?`,
        params
      );

      return await this.getCategoryById(id);
    } catch (error) {
      console.error('Error updating configuration category:', error);
      throw error;
    }
  }

  /**
   * Delete configuration category
   */
  static async deleteCategory(id) {
    try {
      // First delete all options in this category
      await db.execute('DELETE FROM configuration_options WHERE category_id = ?', [id]);
      
      // Then delete the category
      await db.execute('DELETE FROM configuration_categories WHERE id = ?', [id]);
      return true;
    } catch (error) {
      console.error('Error deleting configuration category:', error);
      throw error;
    }
  }

  /**
   * Get category by ID
   */
  static async getCategoryById(id) {
    try {
      const [rows] = await db.execute(
        'SELECT * FROM configuration_categories WHERE id = ?',
        [id]
      );
      return rows[0];
    } catch (error) {
      console.error('Error fetching category by ID:', error);
      throw error;
    }
  }

  /**
   * Create configuration option
   * Supports both formats:
   * 1. createOption(optionData) - with category_id in optionData
   * 2. createOption(categoryName, optionData) - with category name as first parameter
   */
  static async createOption(categoryOrData, optionData = null) {
    try {
      let category_id;
      let data;

      // Handle both calling formats
      if (typeof categoryOrData === 'string' && optionData) {
        // Format: createOption(categoryName, optionData)
        const categoryName = categoryOrData;
        data = optionData;
        
        // Get category_id from category name
        const [categoryRows] = await db.execute(
          'SELECT id FROM configuration_categories WHERE key_name = ? AND is_active = true',
          [categoryName]
        );
        
        if (!categoryRows[0]) {
          throw new Error(`Category '${categoryName}' not found`);
        }
        
        category_id = categoryRows[0].id;
      } else {
        // Format: createOption(optionData)
        data = categoryOrData;
        category_id = data.category_id;
      }

      const {
        option_value = data.value,
        display_text = data.name,
        group_id = null,
        sort_order = 0,
        metadata = null
      } = data;

      if (!category_id) {
        throw new Error('Category ID is required');
      }

      const [result] = await db.execute(
        `INSERT INTO configuration_options 
         (category_id, option_value, display_text, group_id, sort_order, is_active)
         VALUES (?, ?, ?, ?, ?, true)`,
        [category_id, option_value, display_text, group_id, sort_order]
      );

      return {
        id: result.insertId,
        category_id,
        option_value,
        display_text,
        group_id,
        sort_order,
        is_active: true
      };
    } catch (error) {
      console.error('Error creating configuration option:', error);
      throw error;
    }
  }

  /**
   * Update configuration option
   */
  static async updateOption(id, optionData) {
    try {
      const { 
        option_value = optionData.value, 
        display_text = optionData.name, 
        group_id, 
        sort_order, 
        metadata, 
        is_active 
      } = optionData;

      const setClause = [];
      const params = [];

      if (option_value !== undefined) {
        setClause.push('option_value = ?');
        params.push(option_value);
      }
      if (display_text !== undefined) {
        setClause.push('display_text = ?');
        params.push(display_text);
      }
      if (group_id !== undefined) {
        setClause.push('group_id = ?');
        params.push(group_id);
      }
      if (sort_order !== undefined) {
        setClause.push('sort_order = ?');
        params.push(sort_order);
      }
      if (metadata !== undefined) {
        setClause.push('metadata = ?');
        params.push(metadata ? JSON.stringify(metadata) : null);
      }
      if (is_active !== undefined) {
        setClause.push('is_active = ?');
        params.push(is_active);
      }

      if (setClause.length === 0) {
        throw new Error('No update data provided');
      }

      params.push(id);
      
      await db.execute(
        `UPDATE configuration_options SET ${setClause.join(', ')} WHERE id = ?`,
        params
      );

      return await this.getOptionById(id);
    } catch (error) {
      console.error('Error updating configuration option:', error);
      throw error;
    }
  }

  /**
   * Delete configuration option
   */
  static async deleteOption(id) {
    try {
      // Delete child options first (if using hierarchical structure)
      // await db.execute('DELETE FROM configuration_options WHERE group_id = ?', [id]);
      
      // Then delete the option
      await db.execute('DELETE FROM configuration_options WHERE id = ?', [id]);
      return true;
    } catch (error) {
      console.error('Error deleting configuration option:', error);
      throw error;
    }
  }

  /**
   * Get option by ID
   */
  static async getOptionById(id) {
    try {
      const [rows] = await db.execute(
        'SELECT * FROM configuration_options WHERE id = ?',
        [id]
      );
      
      if (rows[0] && rows[0].metadata) {
        rows[0].metadata = JSON.parse(rows[0].metadata);
      }
      
      return rows[0];
    } catch (error) {
      console.error('Error fetching option by ID:', error);
      throw error;
    }
  }

  /**
   * Get hierarchical tree structure for a category
   */
  static async getHierarchicalStructure(category) {
    try {
      const groups = await this.getByCategory(category);
      
      // Build hierarchical structure
      return groups.map(group => ({
        ...group,
        children: this.buildTree(group.options)
      }));
    } catch (error) {
      console.error('Error building hierarchical structure:', error);
      throw error;
    }
  }

  /**
   * Build tree structure from flat array
   */
  static buildTree(items, groupId = null) {
    return items
      .filter(item => item.group_id === groupId)
      .map(item => ({
        ...item,
        children: this.buildTree(items, item.id)
      }))
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  /**
   * Search configurations
   */
  static async search(category, searchTerm) {
    try {
      const [rows] = await db.execute(
        `SELECT cc.key_name as category, cc.display_name as category_display,
                co.id, co.option_value, co.display_text, co.group_id
         FROM configuration_categories cc
         LEFT JOIN configuration_options co ON cc.id = co.category_id
         WHERE cc.key_name = ? AND cc.is_active = true AND co.is_active = true
         AND (co.display_text LIKE ? OR co.option_value LIKE ?)
         ORDER BY co.sort_order`,
        [category, `%${searchTerm}%`, `%${searchTerm}%`]
      );

      return rows;
    } catch (error) {
      console.error('Error searching configurations:', error);
      throw error;
    }
  }

  /**
   * Bulk update option orders
   */
  static async updateOptionOrders(updates) {
    try {
      const connection = await db.getConnection();
      await connection.beginTransaction();

      try {
        for (const update of updates) {
          await connection.execute(
            'UPDATE configuration_options SET order_index = ? WHERE id = ?',
            [update.order_index, update.id]
          );
        }

        await connection.commit();
        return true;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Error updating option orders:', error);
      throw error;
    }
  }

  /**
   * Get configuration statistics
   */
  static async getStatistics() {
    try {
      const [stats] = await db.execute(`
        SELECT 
          COUNT(DISTINCT cc.id) as total_categories,
          COUNT(co.id) as total_options,
          SUM(CASE WHEN cc.key_name = 'purposes' THEN 1 ELSE 0 END) as purpose_categories,
          SUM(CASE WHEN cc.key_name = 'units' THEN 1 ELSE 0 END) as unit_categories,
          SUM(CASE WHEN cc.key_name = 'person_to_meet' THEN 1 ELSE 0 END) as person_categories
        FROM configuration_categories cc
        LEFT JOIN configuration_options co ON cc.id = co.category_id AND co.is_active = true
        WHERE cc.is_active = true
      `);

      return stats[0];
    } catch (error) {
      console.error('Error getting configuration statistics:', error);
      throw error;
    }
  }

  /**
   * Import configuration data
   */
  static async importData(categoryData) {
    try {
      const connection = await db.getConnection();
      await connection.beginTransaction();

      try {
        for (const category of categoryData.categories) {
          // Create category if not exists
          const [categoryResult] = await connection.execute(
            `INSERT INTO configuration_categories (key_name, display_name, description, is_active)
             VALUES (?, ?, ?, true)
             ON DUPLICATE KEY UPDATE 
             display_name = VALUES(display_name), 
             description = VALUES(description)`,
            [categoryData.category, categoryData.display_name, categoryData.description]
          );

          const categoryId = categoryResult.insertId || categoryData.id;

          // Create options
          if (categoryData.options) {
            for (const option of categoryData.options) {
              await connection.execute(
                `INSERT INTO configuration_options 
                 (category_id, option_value, display_text, group_id, sort_order, is_active)
                 VALUES (?, ?, ?, ?, ?, true)`,
                [categoryId, option.option_value, option.display_text, option.group_id || null, option.sort_order || 0]
              );
            }
          }
        }

        await connection.commit();
        return true;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Error importing configuration data:', error);
      throw error;
    }
  }

  /**
   * Export configuration data
   */
  static async exportData(category) {
    try {
      const groups = await this.getByCategory(category);
      
      return {
        category,
        exported_at: new Date().toISOString(),
        options: groups.options.map(option => ({
          option_value: option.option_value,
          display_text: option.display_text,
          group_id: option.group_id,
          sort_order: option.sort_order
        }))
      };
    } catch (error) {
      console.error('Error exporting configuration data:', error);
      throw error;
    }
  }

  /**
   * Get all available categories
   */
  static async getCategories() {
    try {
      const [rows] = await db.execute(
        `SELECT key_name as category, display_name, COUNT(co.id) as option_count
         FROM configuration_categories cc
         LEFT JOIN configuration_options co ON cc.id = co.category_id AND co.is_active = true
         WHERE cc.is_active = true
         GROUP BY cc.id, cc.key_name, cc.display_name
         ORDER BY cc.key_name`
      );

      return rows.map(row => ({
        category: row.category,
        display_name: row.display_name,
        option_count: row.option_count
      }));
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }
}

export default Configuration;
