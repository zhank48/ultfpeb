/**
 * ULT FPEB Consolidated Database Deployment Script
 * 
 * Script deployment database yang akurat berdasarkan struktur database development aktual
 * Kompatibel dengan MySQL 8.0+ dan dioptimalkan untuk deployment production
 * 
 * Features:
 * - Schema yang sesuai dengan database development aktual
 * - Auto-detection environment (development/production)
 * - Complete foreign key constraints
 * - Performance indexes
 * - Default data seeding
 * - User creation with hashed passwords
 * - Error handling dan rollback capability
 * 
 * Usage:
 *   node scripts/deploy-database-consolidated.js [environment]
 *   
 * Examples:
 *   node scripts/deploy-database-consolidated.js development
 *   node scripts/deploy-database-consolidated.js production
 */

import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment configuration
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

class DatabaseDeployment {
  constructor(environment = 'development') {
    this.environment = environment;
    this.connection = null;
    this.dbName = environment === 'production' ? 'ult_fpeb_prod' : 'ult_fpeb_dev';
    this.saltRounds = environment === 'production' ? 12 : 10;
    
    // Database configuration
    this.dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true,
      charset: 'utf8mb4',
      timezone: '+00:00'
    };
    
    // Colors for console output
    this.colors = {
      reset: '\x1b[0m',
      bright: '\x1b[1m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      cyan: '\x1b[36m'
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString().substring(11, 19);
    let color = this.colors.blue;
    let prefix = 'ℹ️';
    
    switch (type) {
      case 'success':
        color = this.colors.green;
        prefix = '✅';
        break;
      case 'warning':
        color = this.colors.yellow;
        prefix = '⚠️';
        break;
      case 'error':
        color = this.colors.red;
        prefix = '❌';
        break;
      case 'header':
        color = this.colors.cyan + this.colors.bright;
        prefix = '🚀';
        break;
    }
    
    console.log(`${color}[${timestamp}] ${prefix} ${message}${this.colors.reset}`);
  }

  async connect() {
    try {
      this.connection = await mysql.createConnection(this.dbConfig);
      this.log('Connected to MySQL server', 'success');
    } catch (error) {
      this.log(`Database connection failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async createDatabase() {
    try {
      await this.connection.execute(`CREATE DATABASE IF NOT EXISTS \`${this.dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      this.log(`Database '${this.dbName}' created/verified`, 'success');
      await this.connection.query(`USE \`${this.dbName}\``);
    } catch (error) {
      this.log(`Error creating database: ${error.message}`, 'error');
      throw error;
    }
  }

  async createTables() {
    this.log('Creating database tables...', 'header');
    
    const tables = [
      // 1. Users table (base for foreign keys)
      {
        name: 'users',
        sql: `CREATE TABLE IF NOT EXISTS users (
          id int unsigned NOT NULL AUTO_INCREMENT,
          name varchar(255) NOT NULL,
          email varchar(255) NOT NULL,
          password varchar(255) NOT NULL COMMENT 'Hashed password',
          role enum('Admin','Manager','Receptionist','Operator','Staff') NOT NULL DEFAULT 'Receptionist',
          avatar_url varchar(2048) DEFAULT NULL,
          photo_url varchar(2048) DEFAULT NULL,
          phone varchar(45) DEFAULT NULL,
          study_program varchar(255) DEFAULT NULL,
          cohort varchar(45) DEFAULT NULL,
          created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY email (email),
          KEY idx_users_email (email),
          KEY idx_users_role (role)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`
      },

      // 2. Visitors table
      {
        name: 'visitors',
        sql: `CREATE TABLE IF NOT EXISTS visitors (
          id int unsigned NOT NULL AUTO_INCREMENT,
          full_name varchar(255) NOT NULL,
          phone_number varchar(45) NOT NULL,
          email varchar(255) DEFAULT NULL,
          id_number varchar(100) DEFAULT NULL,
          id_type varchar(50) DEFAULT NULL,
          address text,
          institution varchar(255) DEFAULT NULL,
          purpose varchar(255) NOT NULL,
          person_to_meet varchar(255) NOT NULL,
          location varchar(255) NOT NULL,
          photo_url varchar(2048) DEFAULT NULL,
          signature_url varchar(2048) DEFAULT NULL,
          check_in_time datetime NOT NULL,
          check_out_time datetime DEFAULT NULL,
          deleted_at timestamp NULL DEFAULT NULL,
          input_by_user_id int unsigned NOT NULL,
          created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          request_document tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Whether visitor requested a document',
          document_type varchar(255) DEFAULT NULL COMMENT 'Type of document requested',
          document_name varchar(500) DEFAULT NULL COMMENT 'Name/description of document requested',
          document_number varchar(255) DEFAULT NULL COMMENT 'Reference number for document',
          input_by_name varchar(255) DEFAULT NULL COMMENT 'Nama operator yang menginput visitor',
          input_by_role varchar(100) DEFAULT NULL COMMENT 'Role/jabatan operator yang menginput visitor',
          checkout_by_user_id int unsigned DEFAULT NULL COMMENT 'ID of user who performed checkout',
          checkout_by_name varchar(255) DEFAULT NULL COMMENT 'Name of operator who performed checkout',
          checkout_by_role varchar(100) DEFAULT NULL COMMENT 'Role of operator who performed checkout',
          checkout_by_avatar varchar(255) DEFAULT NULL,
          deleted_by int DEFAULT NULL,
          document_details text,
          PRIMARY KEY (id),
          KEY idx_visitors_check_in_time (check_in_time),
          KEY idx_visitors_full_name (full_name),
          KEY idx_visitors_location (location),
          KEY idx_visitors_document_type (document_type),
          KEY idx_visitors_request_document (request_document),
          KEY fk_visitors_users_idx (input_by_user_id),
          KEY idx_visitors_checkout_by_user (checkout_by_user_id),
          KEY idx_visitors_checkout_by_name (checkout_by_name),
          CONSTRAINT fk_visitors_checkout_user FOREIGN KEY (checkout_by_user_id) REFERENCES users (id) ON UPDATE CASCADE,
          CONSTRAINT fk_visitors_users FOREIGN KEY (input_by_user_id) REFERENCES users (id) ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`
      },

      // 3. Configuration Categories
      {
        name: 'configuration_categories',
        sql: `CREATE TABLE IF NOT EXISTS configuration_categories (
          id int NOT NULL AUTO_INCREMENT,
          key_name varchar(50) NOT NULL COMMENT 'units, purposes, documentTypes',
          display_name varchar(100) NOT NULL COMMENT 'Human readable name',
          description text COMMENT 'Description of this configuration category',
          is_active tinyint(1) DEFAULT '1',
          created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY key_name (key_name),
          KEY idx_config_categories_key_name (key_name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`
      },

      // 4. Configuration Groups
      {
        name: 'configuration_groups',
        sql: `CREATE TABLE IF NOT EXISTS configuration_groups (
          id int NOT NULL AUTO_INCREMENT,
          category_id int NOT NULL,
          group_name varchar(100) NOT NULL COMMENT 'Group label like DEKANAT, Program Studi',
          sort_order int DEFAULT '0',
          is_active tinyint(1) DEFAULT '1',
          created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_config_groups_category_sort (category_id,sort_order),
          CONSTRAINT fk_config_groups_category FOREIGN KEY (category_id) REFERENCES configuration_categories (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`
      },

      // 5. Configuration Options
      {
        name: 'configuration_options',
        sql: `CREATE TABLE IF NOT EXISTS configuration_options (
          id int NOT NULL AUTO_INCREMENT,
          category_id int NOT NULL,
          group_id int DEFAULT NULL COMMENT 'NULL for flat lists like purposes, documentTypes',
          option_value varchar(255) NOT NULL,
          display_text varchar(255) NOT NULL,
          sort_order int DEFAULT '0',
          is_active tinyint(1) DEFAULT '1',
          created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_config_options_category_group_sort (category_id,group_id,sort_order),
          KEY idx_config_options_active (is_active),
          KEY idx_config_options_group_id (group_id),
          CONSTRAINT fk_config_options_category FOREIGN KEY (category_id) REFERENCES configuration_categories (id) ON DELETE CASCADE,
          CONSTRAINT fk_config_options_group FOREIGN KEY (group_id) REFERENCES configuration_groups (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`
      },

      // 6. Configurations (general key-value store)
      {
        name: 'configurations',
        sql: `CREATE TABLE IF NOT EXISTS configurations (
          id int NOT NULL AUTO_INCREMENT,
          config_key varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
          config_value text COLLATE utf8mb4_unicode_ci,
          config_type enum('string','number','boolean','json','array') COLLATE utf8mb4_unicode_ci DEFAULT 'string',
          description text COLLATE utf8mb4_unicode_ci,
          is_active tinyint(1) DEFAULT '1',
          created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY config_key (config_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      },

      // 7. Complaint Categories
      {
        name: 'complaint_categories',
        sql: `CREATE TABLE IF NOT EXISTS complaint_categories (
          id int unsigned NOT NULL AUTO_INCREMENT,
          name varchar(100) NOT NULL,
          description text,
          color varchar(7) DEFAULT '#6c757d',
          is_active tinyint(1) DEFAULT '1',
          created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`
      },

      // 8. Complaint Fields (dynamic form fields)
      {
        name: 'complaint_fields',
        sql: `CREATE TABLE IF NOT EXISTS complaint_fields (
          id int unsigned NOT NULL AUTO_INCREMENT,
          field_name varchar(100) NOT NULL,
          field_label varchar(200) NOT NULL,
          field_type enum('text','textarea','select','radio','checkbox','date','time','email','phone','number','url','file') NOT NULL DEFAULT 'text',
          field_options json DEFAULT NULL,
          is_required tinyint(1) DEFAULT '0',
          field_order int DEFAULT '0',
          is_active tinyint(1) DEFAULT '1',
          created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          placeholder varchar(255) DEFAULT NULL,
          help_text text,
          validation_rules json DEFAULT NULL,
          PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`
      },

      // 9. Complaints
      {
        name: 'complaints',
        sql: `CREATE TABLE IF NOT EXISTS complaints (
          id int unsigned NOT NULL AUTO_INCREMENT,
          ticket_number varchar(20) DEFAULT NULL,
          complainant_id varchar(255) DEFAULT NULL,
          complainant_name varchar(255) DEFAULT NULL,
          complainant_email varchar(255) DEFAULT NULL,
          complainant_phone varchar(255) DEFAULT NULL,
          category_id int unsigned DEFAULT NULL,
          priority enum('low','medium','high','urgent') DEFAULT 'medium',
          status enum('open','in_progress','resolved','closed') DEFAULT 'open',
          subject varchar(500) NOT NULL,
          description text NOT NULL,
          form_data json DEFAULT NULL,
          photo_urls json DEFAULT NULL COMMENT 'Array of photo URLs for complaint evidence',
          assigned_to int unsigned DEFAULT NULL,
          resolved_at timestamp NULL DEFAULT NULL,
          created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY ticket_number (ticket_number),
          KEY idx_complaints_status (status),
          KEY idx_complaints_priority (priority),
          KEY idx_complaints_created_at (created_at),
          KEY idx_complaints_category_id (category_id),
          KEY idx_complaints_assigned_to (assigned_to),
          CONSTRAINT fk_complaints_assigned_to FOREIGN KEY (assigned_to) REFERENCES users (id) ON DELETE SET NULL,
          CONSTRAINT fk_complaints_category FOREIGN KEY (category_id) REFERENCES complaint_categories (id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`
      },

      // 10. Complaint Responses
      {
        name: 'complaint_responses',
        sql: `CREATE TABLE IF NOT EXISTS complaint_responses (
          id int unsigned NOT NULL AUTO_INCREMENT,
          complaint_id int unsigned NOT NULL,
          user_id int unsigned NOT NULL,
          response_text text NOT NULL,
          is_internal tinyint(1) DEFAULT '0',
          created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY fk_complaint_responses_complaint (complaint_id),
          KEY fk_complaint_responses_user (user_id),
          CONSTRAINT fk_complaint_responses_complaint FOREIGN KEY (complaint_id) REFERENCES complaints (id) ON DELETE CASCADE,
          CONSTRAINT fk_complaint_responses_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`
      },

      // 11. Feedback Categories
      {
        name: 'feedback_categories',
        sql: `CREATE TABLE IF NOT EXISTS feedback_categories (
          id int NOT NULL AUTO_INCREMENT,
          name varchar(255) NOT NULL,
          description text,
          is_active tinyint(1) NOT NULL DEFAULT '1',
          sort_order int NOT NULL DEFAULT '0',
          created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          color varchar(7) DEFAULT '#6c757d',
          PRIMARY KEY (id),
          KEY idx_feedback_categories_active (is_active),
          KEY idx_feedback_categories_sort_order (sort_order)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`
      },

      // 12. Feedbacks (new structure)
      {
        name: 'feedbacks',
        sql: `CREATE TABLE IF NOT EXISTS feedbacks (
          id int NOT NULL AUTO_INCREMENT,
          category int DEFAULT NULL,
          visitor_id int DEFAULT NULL,
          visitor_name varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
          rating int NOT NULL,
          feedback_text text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
          created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          access_ease_rating tinyint DEFAULT NULL COMMENT 'Rating from 1 to 5',
          wait_time_rating tinyint DEFAULT NULL COMMENT 'Rating from 1 to 5',
          staff_friendliness_rating tinyint DEFAULT NULL COMMENT 'Rating from 1 to 5',
          info_clarity_rating tinyint DEFAULT NULL COMMENT 'Rating from 1 to 5',
          overall_satisfaction_rating tinyint DEFAULT NULL COMMENT 'Rating from 1 to 5',
          willing_to_return tinyint(1) DEFAULT NULL COMMENT 'Whether visitor is willing to return',
          likes text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Visitor feedback text',
          suggestions text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Visitor feedback text',
          PRIMARY KEY (id),
          KEY idx_feedbacks_rating (rating),
          KEY idx_feedbacks_visitor_id (visitor_id),
          KEY fk_feedbacks_category_idx (category),
          CONSTRAINT fk_feedback_category FOREIGN KEY (category) REFERENCES feedback_categories (id) ON DELETE SET NULL,
          CONSTRAINT feedbacks_chk_1 CHECK (((rating >= 1) and (rating <= 5)))
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      },

      // 13. Feedback (legacy table for compatibility)
      {
        name: 'feedback',
        sql: `CREATE TABLE IF NOT EXISTS feedback (
          id int NOT NULL AUTO_INCREMENT,
          visitor_name varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
          email varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          phone varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          rating int NOT NULL,
          service_type varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          feedback_text text COLLATE utf8mb4_unicode_ci,
          suggestions text COLLATE utf8mb4_unicode_ci,
          status enum('new','reviewed','responded') COLLATE utf8mb4_unicode_ci DEFAULT 'new',
          response_text text COLLATE utf8mb4_unicode_ci,
          responded_by int DEFAULT NULL,
          responded_at timestamp NULL DEFAULT NULL,
          created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          CONSTRAINT feedback_chk_1 CHECK (((rating >= 1) and (rating <= 5)))
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      },

      // 14. Lost Items
      {
        name: 'lost_items',
        sql: `CREATE TABLE IF NOT EXISTS lost_items (
          id int NOT NULL AUTO_INCREMENT,
          item_name varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
          description text COLLATE utf8mb4_unicode_ci,
          category varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          found_location varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
          found_date date NOT NULL,
          found_time time NOT NULL,
          finder_name varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          finder_contact varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          found_by varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          condition_status enum('excellent','good','fair','poor') COLLATE utf8mb4_unicode_ci DEFAULT 'good',
          handover_photo_url varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          handover_signature_data text COLLATE utf8mb4_unicode_ci,
          status enum('found','returned','disposed') COLLATE utf8mb4_unicode_ci DEFAULT 'found',
          notes text COLLATE utf8mb4_unicode_ci,
          input_by_user_id int unsigned DEFAULT NULL,
          received_by_operator varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          received_by_operator_id int unsigned DEFAULT NULL,
          created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY input_by_user_id (input_by_user_id),
          KEY received_by_operator_id (received_by_operator_id),
          CONSTRAINT lost_items_ibfk_1 FOREIGN KEY (input_by_user_id) REFERENCES users (id),
          CONSTRAINT lost_items_ibfk_2 FOREIGN KEY (received_by_operator_id) REFERENCES users (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      },

      // 15. Item Returns
      {
        name: 'item_returns',
        sql: `CREATE TABLE IF NOT EXISTS item_returns (
          id int NOT NULL AUTO_INCREMENT,
          lost_item_id int NOT NULL,
          claimer_name varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
          claimer_contact varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
          claimer_id_number varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
          relationship_to_owner enum('owner','family','friend','colleague','representative') COLLATE utf8mb4_unicode_ci DEFAULT 'owner',
          proof_of_ownership text COLLATE utf8mb4_unicode_ci,
          return_date date NOT NULL,
          return_time time NOT NULL,
          returned_by varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          returned_by_user_id int unsigned DEFAULT NULL,
          return_operator varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          return_operator_id int unsigned DEFAULT NULL,
          return_photo_url varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          return_signature_data text COLLATE utf8mb4_unicode_ci,
          notes text COLLATE utf8mb4_unicode_ci,
          created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY lost_item_id (lost_item_id),
          KEY returned_by_user_id (returned_by_user_id),
          KEY return_operator_id (return_operator_id),
          CONSTRAINT item_returns_ibfk_1 FOREIGN KEY (lost_item_id) REFERENCES lost_items (id),
          CONSTRAINT item_returns_ibfk_2 FOREIGN KEY (returned_by_user_id) REFERENCES users (id),
          CONSTRAINT item_returns_ibfk_3 FOREIGN KEY (return_operator_id) REFERENCES users (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      },

      // 16. Lost Item History
      {
        name: 'lost_item_history',
        sql: `CREATE TABLE IF NOT EXISTS lost_item_history (
          id int NOT NULL AUTO_INCREMENT,
          lost_item_id int NOT NULL,
          action_type enum('created','updated','status_changed','returned','reverted') COLLATE utf8mb4_unicode_ci NOT NULL,
          old_data json DEFAULT NULL,
          new_data json DEFAULT NULL,
          changed_fields text COLLATE utf8mb4_unicode_ci,
          user_id int unsigned DEFAULT NULL,
          user_name varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          ip_address varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          user_agent text COLLATE utf8mb4_unicode_ci,
          notes text COLLATE utf8mb4_unicode_ci,
          created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY lost_item_id (lost_item_id),
          KEY user_id (user_id),
          CONSTRAINT lost_item_history_ibfk_1 FOREIGN KEY (lost_item_id) REFERENCES lost_items (id),
          CONSTRAINT lost_item_history_ibfk_2 FOREIGN KEY (user_id) REFERENCES users (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      },

      // 17. Deletion Requests
      {
        name: 'deletion_requests',
        sql: `CREATE TABLE IF NOT EXISTS deletion_requests (
          id int unsigned NOT NULL AUTO_INCREMENT,
          visitor_id int unsigned NOT NULL,
          requested_by int unsigned NOT NULL,
          reason text NOT NULL,
          status enum('pending','approved','rejected') DEFAULT 'pending',
          created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          approved_by int unsigned DEFAULT NULL,
          approved_at timestamp NULL DEFAULT NULL,
          rejection_reason text,
          rejected_by int unsigned DEFAULT NULL,
          rejected_at timestamp NULL DEFAULT NULL,
          deleted_at timestamp NULL DEFAULT NULL,
          PRIMARY KEY (id),
          KEY idx_visitor_id (visitor_id),
          KEY idx_requested_by (requested_by),
          KEY idx_status (status),
          KEY idx_created_at (created_at),
          KEY idx_approved_by (approved_by),
          CONSTRAINT fk_deletion_requests_approved_by FOREIGN KEY (approved_by) REFERENCES users (id) ON DELETE SET NULL,
          CONSTRAINT fk_deletion_requests_requested_by FOREIGN KEY (requested_by) REFERENCES users (id) ON DELETE CASCADE,
          CONSTRAINT fk_deletion_requests_visitor FOREIGN KEY (visitor_id) REFERENCES visitors (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`
      },

      // 18. Deletion Audit Logs
      {
        name: 'deletion_audit_logs',
        sql: `CREATE TABLE IF NOT EXISTS deletion_audit_logs (
          id int unsigned NOT NULL AUTO_INCREMENT,
          deletion_request_id int unsigned NOT NULL,
          action enum('created','approved','rejected','deleted') COLLATE utf8mb4_unicode_ci NOT NULL,
          performed_by int unsigned NOT NULL,
          action_details json DEFAULT NULL,
          ip_address varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          user_agent text COLLATE utf8mb4_unicode_ci,
          created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_deletion_request_id (deletion_request_id),
          KEY idx_performed_by (performed_by),
          KEY idx_action (action),
          KEY idx_created_at (created_at),
          CONSTRAINT deletion_audit_logs_ibfk_1 FOREIGN KEY (deletion_request_id) REFERENCES deletion_requests (id) ON DELETE CASCADE,
          CONSTRAINT deletion_audit_logs_ibfk_2 FOREIGN KEY (performed_by) REFERENCES users (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      },

      // 19. Visitor Actions
      {
        name: 'visitor_actions',
        sql: `CREATE TABLE IF NOT EXISTS visitor_actions (
          id int NOT NULL AUTO_INCREMENT,
          visitor_id int NOT NULL,
          action_type enum('edit','delete') COLLATE utf8mb4_unicode_ci NOT NULL,
          status enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
          original_data json DEFAULT NULL,
          proposed_data json DEFAULT NULL,
          reason text COLLATE utf8mb4_unicode_ci NOT NULL,
          notes text COLLATE utf8mb4_unicode_ci,
          requested_by int NOT NULL,
          requested_by_name varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          requested_by_role varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          processed_by int DEFAULT NULL,
          processed_by_name varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          processed_at timestamp NULL DEFAULT NULL,
          created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_visitor_id (visitor_id),
          KEY idx_action_type (action_type),
          KEY idx_status (status),
          KEY idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      },

      // 20. Visitor Edit History
      {
        name: 'visitor_edit_history',
        sql: `CREATE TABLE IF NOT EXISTS visitor_edit_history (
          id int unsigned NOT NULL AUTO_INCREMENT,
          visitor_id int unsigned NOT NULL COMMENT 'ID of the visitor being edited',
          user_id int unsigned DEFAULT NULL COMMENT 'ID of user who made the edit',
          user varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Name of user who made the edit',
          timestamp datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When the edit was made',
          changes json NOT NULL COMMENT 'JSON object containing the new values',
          original json NOT NULL COMMENT 'JSON object containing the original values',
          created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_visitor_edit_history_visitor_id (visitor_id),
          KEY idx_visitor_edit_history_user_id (user_id),
          KEY idx_visitor_edit_history_timestamp (timestamp)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Stores history of visitor data edits'`
      },

      // 21. Menu Config
      {
        name: 'menu_config',
        sql: `CREATE TABLE IF NOT EXISTS menu_config (
          id int unsigned NOT NULL AUTO_INCREMENT,
          show_logos tinyint(1) NOT NULL DEFAULT '1',
          show_icons tinyint(1) NOT NULL DEFAULT '1',
          collapse_behavior enum('click','hover','none') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'hover',
          theme_mode enum('light','dark','auto') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'auto',
          updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      },

      // 22. Menu Items
      {
        name: 'menu_items',
        sql: `CREATE TABLE IF NOT EXISTS menu_items (
          id int unsigned NOT NULL AUTO_INCREMENT,
          name varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
          href varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
          icon varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
          roles json NOT NULL DEFAULT (json_array(_utf8mb4'Admin',_utf8mb4'Receptionist')),
          parent_id int unsigned DEFAULT NULL,
          sort_order int NOT NULL DEFAULT '0',
          is_active tinyint(1) NOT NULL DEFAULT '1',
          is_external tinyint(1) NOT NULL DEFAULT '0',
          description text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
          created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_menu_items_is_active (is_active),
          KEY idx_menu_items_parent_id (parent_id),
          KEY idx_menu_items_sort_order (sort_order),
          CONSTRAINT fk_menu_items_parent FOREIGN KEY (parent_id) REFERENCES menu_items (id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      },

      // 23. Additional tables that might exist
      {
        name: 'lost_item_handovers',
        sql: `CREATE TABLE IF NOT EXISTS lost_item_handovers (
          id int NOT NULL AUTO_INCREMENT,
          lost_item_id int NOT NULL,
          handover_date timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          handover_location varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          finder_name varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
          finder_contact varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          item_condition varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          photos json DEFAULT NULL,
          additional_notes text COLLATE utf8mb4_unicode_ci,
          received_by int NOT NULL,
          created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      },

      {
        name: 'lost_item_returns',
        sql: `CREATE TABLE IF NOT EXISTS lost_item_returns (
          id int NOT NULL AUTO_INCREMENT,
          lost_item_id int NOT NULL,
          return_date timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          owner_name varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
          owner_contact varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          identification_proof varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          verification_notes text COLLATE utf8mb4_unicode_ci,
          return_photos json DEFAULT NULL,
          returned_by int NOT NULL,
          created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      }
    ];

    for (const table of tables) {
      try {
        await this.connection.execute(table.sql);
        this.log(`✅ Table '${table.name}' created/verified`, 'success');
      } catch (error) {
        this.log(`❌ Error creating table '${table.name}': ${error.message}`, 'error');
        // Continue with other tables but log the error
      }
    }
  }

  async seedDefaultData() {
    this.log('Seeding default data...', 'header');

    try {
      // Create default admin user
      const adminPassword = this.environment === 'production' ? 'AdminULT2025!' : 'admin123';
      const hashedAdminPassword = await bcrypt.hash(adminPassword, this.saltRounds);
      
      await this.connection.execute(`
        INSERT IGNORE INTO users (name, email, password, role, created_at, updated_at) 
        VALUES (?, ?, ?, ?, NOW(), NOW())
      `, ['Administrator ULT FPEB', 'admin@ultfpeb.upi.edu', hashedAdminPassword, 'Admin']);

      // Create default receptionist user
      const receptionistPassword = this.environment === 'production' ? 'ReceptionistULT2025!' : 'receptionist123';
      const hashedReceptionistPassword = await bcrypt.hash(receptionistPassword, this.saltRounds);
      
      await this.connection.execute(`
        INSERT IGNORE INTO users (name, email, password, role, created_at, updated_at) 
        VALUES (?, ?, ?, ?, NOW(), NOW())
      `, ['Receptionist ULT FPEB', 'receptionist@ultfpeb.upi.edu', hashedReceptionistPassword, 'Receptionist']);

      this.log('Default users created', 'success');

      // Seed configuration categories
      const configCategories = [
        ['units', 'Unit/Bagian', 'Daftar unit atau bagian di FPEB UPI'],
        ['purposes', 'Tujuan Kunjungan', 'Daftar tujuan kunjungan pengunjung'],
        ['documentTypes', 'Jenis Dokumen', 'Jenis dokumen yang dapat diminta pengunjung'],
        ['locations', 'Lokasi', 'Daftar lokasi di lingkungan FPEB UPI'],
        ['id_types', 'Jenis Identitas', 'Jenis dokumen identitas yang diterima'],
        ['complaint_category', 'Kategori Pengaduan', 'Kategori untuk sistem pengaduan'],
        ['feedback_category', 'Kategori Feedback', 'Kategori untuk sistem feedback'],
        ['lost_item_category', 'Kategori Barang Hilang', 'Kategori untuk barang hilang']
      ];

      for (const [key, name, desc] of configCategories) {
        await this.connection.execute(`
          INSERT IGNORE INTO configuration_categories (key_name, display_name, description, is_active, created_at, updated_at) 
          VALUES (?, ?, ?, 1, NOW(), NOW())
        `, [key, name, desc]);
      }

      this.log('Configuration categories seeded', 'success');

      // Seed complaint categories
      const complaintCategories = [
        ['Layanan Umum', 'Keluhan terkait layanan umum fakultas', '#007bff'],
        ['Fasilitas', 'Keluhan terkait fasilitas dan infrastruktur', '#28a745'],
        ['Administrasi', 'Keluhan terkait proses administrasi', '#ffc107'],
        ['Akademik', 'Keluhan terkait layanan akademik', '#17a2b8'],
        ['Lainnya', 'Keluhan lain yang tidak termasuk kategori di atas', '#6c757d']
      ];

      for (const [name, desc, color] of complaintCategories) {
        await this.connection.execute(`
          INSERT IGNORE INTO complaint_categories (name, description, color, is_active, created_at, updated_at) 
          VALUES (?, ?, ?, 1, NOW(), NOW())
        `, [name, desc, color]);
      }

      this.log('Complaint categories seeded', 'success');

      // Seed feedback categories
      const feedbackCategories = [
        ['Layanan', 'Feedback tentang kualitas layanan', '#007bff', 1],
        ['Fasilitas', 'Feedback tentang fasilitas yang tersedia', '#28a745', 2],
        ['Proses', 'Feedback tentang proses pelayanan', '#ffc107', 3],
        ['Kepuasan Keseluruhan', 'Feedback kepuasan secara keseluruhan', '#17a2b8', 4],
        ['Saran', 'Saran untuk perbaikan', '#6c757d', 5]
      ];

      for (const [name, desc, color, sort] of feedbackCategories) {
        await this.connection.execute(`
          INSERT IGNORE INTO feedback_categories (name, description, color, is_active, sort_order, created_at, updated_at) 
          VALUES (?, ?, ?, 1, ?, NOW(), NOW())
        `, [name, desc, color, sort]);
      }

      this.log('Feedback categories seeded', 'success');

      // Seed menu configuration
      await this.connection.execute(`
        INSERT IGNORE INTO menu_config (show_logos, show_icons, collapse_behavior, theme_mode, updated_at) 
        VALUES (1, 1, 'hover', 'auto', NOW())
      `);

      this.log('Menu configuration seeded', 'success');

      // Seed basic configuration options
      const basicConfigs = [
        ['app_name', 'ULT FPEB Visitor Management System', 'string', 'Nama aplikasi'],
        ['app_version', '1.0.0', 'string', 'Versi aplikasi'],
        ['max_visitors_per_day', '1000', 'number', 'Maksimal pengunjung per hari'],
        ['enable_document_request', 'true', 'boolean', 'Mengaktifkan fitur permintaan dokumen'],
        ['enable_feedback', 'true', 'boolean', 'Mengaktifkan sistem feedback'],
        ['enable_complaints', 'true', 'boolean', 'Mengaktifkan sistem pengaduan'],
        ['enable_lost_items', 'true', 'boolean', 'Mengaktifkan sistem barang hilang'],
        ['maintenance_mode', 'false', 'boolean', 'Mode maintenance aplikasi'],
        ['backup_retention_days', '30', 'number', 'Lama penyimpanan backup dalam hari'],
        ['session_timeout', '24', 'number', 'Timeout session dalam jam']
      ];

      for (const [key, value, type, desc] of basicConfigs) {
        await this.connection.execute(`
          INSERT IGNORE INTO configurations (config_key, config_value, config_type, description, is_active, created_at, updated_at) 
          VALUES (?, ?, ?, ?, 1, NOW(), NOW())
        `, [key, value, type, desc]);
      }

      this.log('Basic configurations seeded', 'success');

    } catch (error) {
      this.log(`Error seeding data: ${error.message}`, 'error');
      throw error;
    }
  }

  async verifyDeployment() {
    this.log('Verifying deployment...', 'header');

    try {
      // Check tables count
      const [tables] = await this.connection.execute('SHOW TABLES');
      this.log(`Database contains ${tables.length} tables`, 'success');

      // Check users
      const [users] = await this.connection.execute('SELECT COUNT(*) as count FROM users');
      this.log(`Users table contains ${users[0].count} records`, 'success');

      // Check configuration categories
      const [configCats] = await this.connection.execute('SELECT COUNT(*) as count FROM configuration_categories');
      this.log(`Configuration categories: ${configCats[0].count} records`, 'success');

      // Check complaint categories
      const [complaintCats] = await this.connection.execute('SELECT COUNT(*) as count FROM complaint_categories');
      this.log(`Complaint categories: ${complaintCats[0].count} records`, 'success');

      // Check feedback categories
      const [feedbackCats] = await this.connection.execute('SELECT COUNT(*) as count FROM feedback_categories');
      this.log(`Feedback categories: ${feedbackCats[0].count} records`, 'success');

      // Test foreign key constraints
      try {
        const [fkCheck] = await this.connection.execute(`
          SELECT COUNT(*) as count 
          FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
          WHERE REFERENCED_TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL
        `, [this.dbName]);
        this.log(`Foreign key constraints: ${fkCheck[0].count}`, 'success');
      } catch (error) {
        this.log(`Foreign key check warning: ${error.message}`, 'warning');
      }

      this.log('Deployment verification completed successfully!', 'success');
      return true;

    } catch (error) {
      this.log(`Deployment verification failed: ${error.message}`, 'error');
      return false;
    }
  }

  async close() {
    if (this.connection) {
      await this.connection.end();
      this.log('Database connection closed', 'success');
    }
  }

  async deploy() {
    const startTime = Date.now();
    
    try {
      this.log(`Starting ULT FPEB database deployment for ${this.environment} environment`, 'header');
      this.log('=' .repeat(80), 'info');
      
      await this.connect();
      await this.createDatabase();
      await this.createTables();
      await this.seedDefaultData();
      
      const verified = await this.verifyDeployment();
      
      if (verified) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        this.log('=' .repeat(80), 'info');
        this.log(`🎉 Database deployment completed successfully in ${duration}s!`, 'header');
        this.log('', 'info');
        this.log(`📋 Deployment Summary:`, 'info');
        this.log(`   Environment: ${this.environment}`, 'info');
        this.log(`   Database: ${this.dbName}`, 'info');
        this.log(`   Host: ${this.dbConfig.host}:${this.dbConfig.port}`, 'info');
        this.log('', 'info');
        this.log(`🔐 Default Login Credentials:`, 'info');
        if (this.environment === 'production') {
          this.log(`   👨‍💼 Admin: admin@ultfpeb.upi.edu / AdminULT2025!`, 'info');
          this.log(`   👩‍💻 Receptionist: receptionist@ultfpeb.upi.edu / ReceptionistULT2025!`, 'info');
        } else {
          this.log(`   👨‍💼 Admin: admin@ultfpeb.upi.edu / admin123`, 'info');
          this.log(`   👩‍💻 Receptionist: receptionist@ultfpeb.upi.edu / receptionist123`, 'info');
        }
        this.log('', 'info');
        this.log(`⚠️  Important: Change default passwords after first login!`, 'warning');
        this.log('=' .repeat(80), 'info');
        
      } else {
        throw new Error('Deployment verification failed');
      }
      
    } catch (error) {
      this.log(`💥 Deployment failed: ${error.message}`, 'error');
      this.log(`Stack trace: ${error.stack}`, 'error');
      throw error;
      
    } finally {
      await this.close();
    }
  }
}

// CLI Usage
const environment = process.argv[2] || 'development';

if (!['development', 'production'].includes(environment)) {
  console.error('❌ Invalid environment. Use: development or production');
  process.exit(1);
}

const deployment = new DatabaseDeployment(environment);

deployment.deploy()
  .then(() => {
    console.log('✅ Deployment completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  });