import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config();

class DatabaseMigration {
  constructor() {
    this.connection = null;
    this.dbName = process.env.DB_NAME || 'ult_fpeb_dev';
  }

  async connect() {
    try {
      this.connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        multipleStatements: true
      });
      console.log('✅ Connected to MySQL server');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      throw error;
    }
  }

  async createDatabase() {
    try {
      await this.connection.execute(`CREATE DATABASE IF NOT EXISTS \`${this.dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      console.log(`✅ Database '${this.dbName}' created/verified`);
      await this.connection.query(`USE \`${this.dbName}\``);
    } catch (error) {
      console.error('❌ Error creating database:', error.message);
      throw error;
    }
  }

  async createTables() {
    const tables = [
      // Users table
      {
        name: 'users',
        sql: `CREATE TABLE IF NOT EXISTS users (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          role ENUM('Admin','Manager','Receptionist','Operator','Staff') NOT NULL DEFAULT 'Receptionist',
          avatar_url VARCHAR(2048) NULL,
          photo_url VARCHAR(2048) NULL,
          phone VARCHAR(45) NULL,
          study_program VARCHAR(255) NULL,
          cohort VARCHAR(45) NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          INDEX idx_users_email (email),
          INDEX idx_users_role (role)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      },

      // Visitors table
      {
        name: 'visitors',
        sql: `CREATE TABLE IF NOT EXISTS visitors (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          full_name VARCHAR(255) NOT NULL,
          phone_number VARCHAR(45) NOT NULL,
          email VARCHAR(255) NULL,
          id_number VARCHAR(100) NULL,
          id_type VARCHAR(50) NULL COMMENT 'Type of identity document (KTP, SIM, Passport, etc.)',
          address TEXT NULL,
          institution VARCHAR(255) NULL,
          purpose VARCHAR(255) NOT NULL,
          person_to_meet VARCHAR(255) NOT NULL,
          location VARCHAR(255) NOT NULL,
          photo_url VARCHAR(2048) NULL,
          signature_url VARCHAR(2048) NULL,
          check_in_time DATETIME NOT NULL,
          check_out_time DATETIME NULL,
          deleted_at TIMESTAMP NULL,
          input_by_user_id INT UNSIGNED NOT NULL,
          input_by_name VARCHAR(255) NULL,
          input_by_role VARCHAR(100) NULL,
          checkout_by_user_id INT UNSIGNED NULL,
          checkout_by_name VARCHAR(255) NULL,
          checkout_by_role VARCHAR(100) NULL,
          checkout_by_avatar VARCHAR(255) NULL,
          deleted_by INT NULL,
          request_document TINYINT(1) NOT NULL DEFAULT 0,
          document_type VARCHAR(255) NULL,
          document_name VARCHAR(500) NULL,
          document_number VARCHAR(255) NULL,
          document_details TEXT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          INDEX idx_visitors_check_in_time (check_in_time),
          INDEX idx_visitors_full_name (full_name),
          INDEX idx_visitors_location (location),
          INDEX idx_visitors_document_type (document_type),
          INDEX idx_visitors_request_document (request_document),
          INDEX idx_visitors_checkout_by_user (checkout_by_user_id),
          INDEX idx_visitors_checkout_by_name (checkout_by_name),
          
          FOREIGN KEY (input_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
          FOREIGN KEY (checkout_by_user_id) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      },

      // Visitor Edit History
      {
        name: 'visitor_edit_history',
        sql: `CREATE TABLE IF NOT EXISTS visitor_edit_history (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          visitor_id INT UNSIGNED NOT NULL,
          user_id INT UNSIGNED NULL,
          user VARCHAR(255) NOT NULL,
          timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          changes JSON NOT NULL,
          original JSON NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          INDEX idx_visitor_edit_history_visitor_id (visitor_id),
          INDEX idx_visitor_edit_history_user_id (user_id),
          INDEX idx_visitor_edit_history_timestamp (timestamp),
          
          FOREIGN KEY (visitor_id) REFERENCES visitors(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      },

      // Visitor Actions
      {
        name: 'visitor_actions',
        sql: `CREATE TABLE IF NOT EXISTS visitor_actions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          visitor_id INT NOT NULL,
          action_type ENUM('edit','delete') NOT NULL,
          status ENUM('pending','approved','rejected') DEFAULT 'pending',
          original_data JSON NULL,
          proposed_data JSON NULL,
          reason TEXT NOT NULL,
          notes TEXT NULL,
          requested_by INT NOT NULL,
          requested_by_name VARCHAR(255) NULL,
          requested_by_role VARCHAR(100) NULL,
          processed_by INT NULL,
          processed_by_name VARCHAR(255) NULL,
          processed_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          INDEX idx_visitor_id (visitor_id),
          INDEX idx_action_type (action_type),
          INDEX idx_status (status),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      },

      // Deletion Requests
      {
        name: 'deletion_requests',
        sql: `CREATE TABLE IF NOT EXISTS deletion_requests (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          visitor_id INT UNSIGNED NOT NULL,
          requested_by INT UNSIGNED NOT NULL,
          reason TEXT NOT NULL,
          status ENUM('pending','approved','rejected') DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          approved_by INT UNSIGNED NULL,
          approved_at TIMESTAMP NULL,
          rejection_reason TEXT NULL,
          rejected_by INT UNSIGNED NULL,
          rejected_at TIMESTAMP NULL,
          deleted_at TIMESTAMP NULL,
          
          INDEX idx_visitor_id (visitor_id),
          INDEX idx_requested_by (requested_by),
          INDEX idx_status (status),
          INDEX idx_created_at (created_at),
          INDEX idx_approved_by (approved_by),
          
          FOREIGN KEY (visitor_id) REFERENCES visitors(id) ON DELETE CASCADE,
          FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      },

      // Deletion Audit Logs
      {
        name: 'deletion_audit_logs',
        sql: `CREATE TABLE IF NOT EXISTS deletion_audit_logs (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          deletion_request_id INT UNSIGNED NOT NULL,
          action ENUM('created','approved','rejected','deleted') NOT NULL,
          performed_by INT UNSIGNED NOT NULL,
          action_details JSON NULL,
          ip_address VARCHAR(45) NULL,
          user_agent TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          INDEX idx_deletion_request_id (deletion_request_id),
          INDEX idx_performed_by (performed_by),
          INDEX idx_action (action),
          INDEX idx_created_at (created_at),
          
          FOREIGN KEY (deletion_request_id) REFERENCES deletion_requests(id) ON DELETE CASCADE,
          FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      },

      // Lost Items
      {
        name: 'lost_items',
        sql: `CREATE TABLE IF NOT EXISTS lost_items (
          id INT AUTO_INCREMENT PRIMARY KEY,
          item_name VARCHAR(255) NOT NULL,
          description TEXT NULL,
          category VARCHAR(100) NULL,
          found_location VARCHAR(255) NOT NULL,
          found_date DATE NOT NULL,
          found_time TIME NOT NULL,
          finder_name VARCHAR(255) NULL,
          finder_contact VARCHAR(100) NULL,
          found_by VARCHAR(255) NULL,
          condition_status ENUM('excellent','good','fair','poor') DEFAULT 'good',
          handover_photo_url VARCHAR(500) NULL,
          handover_signature_data TEXT NULL,
          status ENUM('found','returned','disposed') DEFAULT 'found',
          notes TEXT NULL,
          input_by_user_id INT UNSIGNED NULL,
          received_by_operator VARCHAR(255) NULL,
          received_by_operator_id INT UNSIGNED NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          FOREIGN KEY (input_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
          FOREIGN KEY (received_by_operator_id) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      },

      // Lost Item History
      {
        name: 'lost_item_history',
        sql: `CREATE TABLE IF NOT EXISTS lost_item_history (
          id INT AUTO_INCREMENT PRIMARY KEY,
          lost_item_id INT NOT NULL,
          action_type ENUM('created','updated','status_changed','returned','reverted') NOT NULL,
          old_data JSON NULL,
          new_data JSON NULL,
          changed_fields TEXT NULL,
          user_id INT UNSIGNED NULL,
          user_name VARCHAR(255) NULL,
          ip_address VARCHAR(45) NULL,
          user_agent TEXT NULL,
          notes TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          FOREIGN KEY (lost_item_id) REFERENCES lost_items(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      },

      // Item Returns
      {
        name: 'item_returns',
        sql: `CREATE TABLE IF NOT EXISTS item_returns (
          id INT AUTO_INCREMENT PRIMARY KEY,
          lost_item_id INT NOT NULL,
          claimer_name VARCHAR(255) NOT NULL,
          claimer_contact VARCHAR(100) NOT NULL,
          claimer_id_number VARCHAR(100) NOT NULL,
          relationship_to_owner ENUM('owner','family','friend','colleague','representative') DEFAULT 'owner',
          proof_of_ownership TEXT NULL,
          return_date DATE NOT NULL,
          return_time TIME NOT NULL,
          returned_by VARCHAR(255) NULL,
          returned_by_user_id INT UNSIGNED NULL,
          return_operator VARCHAR(255) NULL,
          return_operator_id INT UNSIGNED NULL,
          return_photo_url VARCHAR(500) NULL,
          return_signature_data TEXT NULL,
          notes TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          FOREIGN KEY (lost_item_id) REFERENCES lost_items(id) ON DELETE CASCADE,
          FOREIGN KEY (returned_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
          FOREIGN KEY (return_operator_id) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      },

      // Complaint Categories
      {
        name: 'complaint_categories',
        sql: `CREATE TABLE IF NOT EXISTS complaint_categories (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          description TEXT NULL,
          color VARCHAR(7) DEFAULT '#6c757d',
          is_active TINYINT(1) DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      },

      // Complaints
      {
        name: 'complaints',
        sql: `CREATE TABLE IF NOT EXISTS complaints (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          ticket_number VARCHAR(20) UNIQUE NULL,
          complainant_id VARCHAR(255) NULL,
          complainant_name VARCHAR(255) NULL,
          complainant_email VARCHAR(255) NULL,
          complainant_phone VARCHAR(255) NULL,
          category_id INT UNSIGNED NULL,
          priority ENUM('low','medium','high','urgent') DEFAULT 'medium',
          status ENUM('open','in_progress','resolved','closed') DEFAULT 'open',
          subject VARCHAR(500) NOT NULL,
          description TEXT NOT NULL,
          form_data JSON NULL,
          photo_urls JSON NULL,
          assigned_to INT UNSIGNED NULL,
          resolved_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          INDEX idx_complaints_status (status),
          INDEX idx_complaints_priority (priority),
          INDEX idx_complaints_created_at (created_at),
          INDEX idx_complaints_category_id (category_id),
          INDEX idx_complaints_assigned_to (assigned_to),
          
          FOREIGN KEY (category_id) REFERENCES complaint_categories(id) ON DELETE SET NULL,
          FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      },

      // Feedback Categories
      {
        name: 'feedback_categories',
        sql: `CREATE TABLE IF NOT EXISTS feedback_categories (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT NULL,
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          sort_order INT NOT NULL DEFAULT 0,
          color VARCHAR(7) DEFAULT '#6c757d',
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          INDEX idx_feedback_categories_active (is_active),
          INDEX idx_feedback_categories_sort_order (sort_order)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      },

      // Feedbacks
      {
        name: 'feedbacks',
        sql: `CREATE TABLE IF NOT EXISTS feedbacks (
          id INT AUTO_INCREMENT PRIMARY KEY,
          category INT NULL,
          visitor_id INT NULL,
          visitor_name VARCHAR(255) NOT NULL,
          rating INT NOT NULL,
          feedback_text TEXT NULL,
          access_ease_rating TINYINT NULL,
          wait_time_rating TINYINT NULL,
          staff_friendliness_rating TINYINT NULL,
          info_clarity_rating TINYINT NULL,
          overall_satisfaction_rating TINYINT NULL,
          willing_to_return TINYINT(1) NULL,
          likes TEXT NULL,
          suggestions TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          INDEX idx_feedbacks_rating (rating),
          INDEX idx_feedbacks_visitor_id (visitor_id),
          
          FOREIGN KEY (category) REFERENCES feedback_categories(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      },

      // Configuration Categories
      {
        name: 'configuration_categories',
        sql: `CREATE TABLE IF NOT EXISTS configuration_categories (
          id INT AUTO_INCREMENT PRIMARY KEY,
          key_name VARCHAR(50) NOT NULL UNIQUE,
          display_name VARCHAR(100) NOT NULL,
          description TEXT NULL,
          is_active TINYINT(1) DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          INDEX idx_config_categories_key_name (key_name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      },

      // Configuration Groups
      {
        name: 'configuration_groups',
        sql: `CREATE TABLE IF NOT EXISTS configuration_groups (
          id INT AUTO_INCREMENT PRIMARY KEY,
          category_id INT NOT NULL,
          group_name VARCHAR(100) NOT NULL,
          sort_order INT DEFAULT 0,
          is_active TINYINT(1) DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          INDEX idx_config_groups_category_sort (category_id, sort_order),
          
          FOREIGN KEY (category_id) REFERENCES configuration_categories(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      },

      // Configuration Options
      {
        name: 'configuration_options',
        sql: `CREATE TABLE IF NOT EXISTS configuration_options (
          id INT AUTO_INCREMENT PRIMARY KEY,
          category_id INT NOT NULL,
          group_id INT NULL,
          option_value VARCHAR(255) NOT NULL,
          display_text VARCHAR(255) NOT NULL,
          sort_order INT DEFAULT 0,
          is_active TINYINT(1) DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          INDEX idx_config_options_category_group_sort (category_id, group_id, sort_order),
          INDEX idx_config_options_active (is_active),
          INDEX idx_config_options_group_id (group_id),
          
          FOREIGN KEY (category_id) REFERENCES configuration_categories(id) ON DELETE CASCADE,
          FOREIGN KEY (group_id) REFERENCES configuration_groups(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      },

      // Menu Items
      {
        name: 'menu_items',
        sql: `CREATE TABLE IF NOT EXISTS menu_items (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          href VARCHAR(255) NOT NULL,
          icon VARCHAR(50) NOT NULL,
          roles JSON NOT NULL DEFAULT (JSON_ARRAY('Admin', 'Receptionist')),
          parent_id INT UNSIGNED NULL,
          sort_order INT NOT NULL DEFAULT 0,
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          is_external TINYINT(1) NOT NULL DEFAULT 0,
          description TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          INDEX idx_menu_items_is_active (is_active),
          INDEX idx_menu_items_parent_id (parent_id),
          INDEX idx_menu_items_sort_order (sort_order),
          
          FOREIGN KEY (parent_id) REFERENCES menu_items(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      },

      // Menu Config
      {
        name: 'menu_config',
        sql: `CREATE TABLE IF NOT EXISTS menu_config (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          show_logos TINYINT(1) NOT NULL DEFAULT 1,
          show_icons TINYINT(1) NOT NULL DEFAULT 1,
          collapse_behavior ENUM('click','hover','none') NOT NULL DEFAULT 'hover',
          theme_mode ENUM('light','dark','auto') NOT NULL DEFAULT 'auto',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      },

      // Configurations
      {
        name: 'configurations',
        sql: `CREATE TABLE IF NOT EXISTS configurations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          config_key VARCHAR(255) NOT NULL UNIQUE,
          config_value TEXT NULL,
          config_type ENUM('string','number','boolean','json','array') DEFAULT 'string',
          description TEXT NULL,
          is_active TINYINT(1) DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      }
    ];

    for (const table of tables) {
      try {
        await this.connection.execute(table.sql);
        console.log(`✅ Table '${table.name}' created/verified`);
      } catch (error) {
        console.error(`❌ Error creating table '${table.name}':`, error.message);
        throw error;
      }
    }
  }

  async seedData() {
    console.log('\n🌱 Seeding initial data...');

    // Seed admin user
    const adminEmail = 'admin@ultfpeb.upi.edu';
    const adminPassword = await bcrypt.hash('admin123', 10);
    
    try {
      const [existingAdmin] = await this.connection.execute(
        'SELECT id FROM users WHERE email = ?',
        [adminEmail]
      );

      if (existingAdmin.length === 0) {
        await this.connection.execute(
          'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
          ['Administrator', adminEmail, adminPassword, 'Admin']
        );
        console.log('✅ Admin user created');
        console.log(`   📧 Email: ${adminEmail}`);
        console.log('   🔑 Password: admin123');
      } else {
        console.log('ℹ️  Admin user already exists');
      }
    } catch (error) {
      console.error('❌ Error seeding admin user:', error.message);
    }

    // Seed receptionist user
    const receptionistEmail = 'receptionist@ultfpeb.upi.edu';
    const receptionistPassword = await bcrypt.hash('receptionist123', 10);
    
    try {
      const [existingReceptionist] = await this.connection.execute(
        'SELECT id FROM users WHERE email = ?',
        [receptionistEmail]
      );

      if (existingReceptionist.length === 0) {
        await this.connection.execute(
          'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
          ['Receptionist', receptionistEmail, receptionistPassword, 'Receptionist']
        );
        console.log('✅ Receptionist user created');
        console.log(`   📧 Email: ${receptionistEmail}`);
        console.log('   🔑 Password: receptionist123');
      } else {
        console.log('ℹ️  Receptionist user already exists');
      }
    } catch (error) {
      console.error('❌ Error seeding receptionist user:', error.message);
    }

    // Seed configuration categories
    const configCategories = [
      ['purpose', 'Tujuan Kunjungan', 'Daftar tujuan kunjungan pengunjung'],
      ['unit', 'Unit/Bagian', 'Daftar unit atau bagian yang dapat dikunjungi'],
      ['person_to_meet', 'Orang yang Dituju', 'Daftar orang yang dapat ditemui'],
      ['id_type', 'Jenis Identitas', 'Jenis dokumen identitas'],
      ['document_type', 'Jenis Dokumen', 'Jenis dokumen yang diminta'],
      ['complaint_category', 'Kategori Pengaduan', 'Kategori untuk sistem pengaduan']
    ];

    for (const [key, name, desc] of configCategories) {
      try {
        const [existing] = await this.connection.execute(
          'SELECT id FROM configuration_categories WHERE key_name = ?',
          [key]
        );
        
        if (existing.length === 0) {
          await this.connection.execute(
            'INSERT INTO configuration_categories (key_name, display_name, description) VALUES (?, ?, ?)',
            [key, name, desc]
          );
        }
      } catch (error) {
        console.log(`⚠️  Skipping config category ${key}:`, error.message);
      }
    }

    // Seed complaint categories
    const complaintCategories = [
      ['Layanan', 'Keluhan terkait layanan'],
      ['Fasilitas', 'Keluhan terkait fasilitas'],
      ['Staff', 'Keluhan terkait staff'],
      ['Sistem', 'Keluhan terkait sistem'],
      ['Lainnya', 'Keluhan lainnya']
    ];

    for (const [name, desc] of complaintCategories) {
      try {
        const [existing] = await this.connection.execute(
          'SELECT id FROM complaint_categories WHERE name = ?',
          [name]
        );
        
        if (existing.length === 0) {
          await this.connection.execute(
            'INSERT INTO complaint_categories (name, description) VALUES (?, ?)',
            [name, desc]
          );
        }
      } catch (error) {
        console.log(`⚠️  Skipping complaint category ${name}:`, error.message);
      }
    }

    // Seed feedback categories
    const feedbackCategories = [
      ['Layanan Umum', 'Feedback tentang layanan umum'],
      ['Kualitas Staff', 'Feedback tentang kualitas staff'],
      ['Fasilitas', 'Feedback tentang fasilitas'],
      ['Proses Administrasi', 'Feedback tentang proses administrasi'],
      ['Kepuasan Keseluruhan', 'Feedback kepuasan keseluruhan']
    ];

    for (const [name, desc] of feedbackCategories) {
      try {
        const [existing] = await this.connection.execute(
          'SELECT id FROM feedback_categories WHERE name = ?',
          [name]
        );
        
        if (existing.length === 0) {
          await this.connection.execute(
            'INSERT INTO feedback_categories (name, description) VALUES (?, ?)',
            [name, desc]
          );
        }
      } catch (error) {
        console.log(`⚠️  Skipping feedback category ${name}:`, error.message);
      }
    }

    // Seed menu config
    try {
      const [existingMenuConfig] = await this.connection.execute('SELECT id FROM menu_config');
      
      if (existingMenuConfig.length === 0) {
        await this.connection.execute(
          'INSERT INTO menu_config (show_logos, show_icons, collapse_behavior, theme_mode) VALUES (1, 1, "hover", "auto")'
        );
        console.log('✅ Menu config seeded');
      }
    } catch (error) {
      console.log('⚠️  Skipping menu config:', error.message);
    }

    console.log('✅ Initial data seeding completed');
  }

  async close() {
    if (this.connection) {
      await this.connection.end();
      console.log('✅ Database connection closed');
    }
  }

  async migrate() {
    try {
      console.log('🚀 Starting database migration...');
      console.log('=' .repeat(50));
      
      await this.connect();
      await this.createDatabase();
      await this.createTables();
      await this.seedData();
      
      console.log('\n' + '=' .repeat(50));
      console.log('🎉 Database migration completed successfully!');
      console.log('\n📋 Default Login Credentials:');
      console.log('   👨‍💼 Admin: admin@ultfpeb.upi.edu / admin123');
      console.log('   👩‍💻 Receptionist: receptionist@ultfpeb.upi.edu / receptionist123');
      
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      throw error;
    } finally {
      await this.close();
    }
  }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const migration = new DatabaseMigration();
  migration.migrate()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

export default DatabaseMigration;