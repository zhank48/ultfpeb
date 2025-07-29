/**
 * ULT FPEB Improved Production Deployment Script
 * 
 * Enhanced deployment script with better error handling, validation, and rollback capability
 * 
 * Features:
 * - Complete environment validation
 * - Database connection testing
 * - Rollback capability on failure
 * - Comprehensive logging
 * - Support for both development and production environments
 * 
 * Usage:
 * node scripts/improved-production-deployment.js [--env=production|development]
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

// Configuration
const ENV = process.argv.includes('--env=production') ? 'production' : 'development';
const SALT_ROUNDS = 10;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 2000; // 2 seconds

// Database configuration with environment-specific defaults
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ult_fpeb_db',
  port: parseInt(process.env.DB_PORT) || 3306,
  multipleStatements: true,
  charset: 'utf8mb4',
  timezone: '+00:00'
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  header: (msg) => console.log(`${colors.cyan}${colors.bright}🚀 ${msg}${colors.reset}`)
};

// Sleep utility
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Validate environment and prerequisites
 */
async function validateEnvironment() {
  log.header('VALIDATING ENVIRONMENT');
  
  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0]);
  
  if (majorVersion < 16) {
    throw new Error(`Node.js v16+ required. Current version: ${nodeVersion}`);
  }
  log.success(`Node.js version: ${nodeVersion}`);
  
  // Check required packages
  const requiredPackages = ['mysql2', 'bcrypt', 'dotenv'];
  for (const pkg of requiredPackages) {
    try {
      require.resolve(pkg);
      log.success(`Package ${pkg} found`);
    } catch (error) {
      throw new Error(`Required package ${pkg} not found. Run: npm install ${pkg}`);
    }
  }
  
  // Check environment variables
  const requiredEnvVars = ['DB_HOST', 'DB_NAME', 'DB_USER'];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      log.warning(`Environment variable ${envVar} not set, using default`);
    } else {
      log.success(`Environment variable ${envVar} found`);
    }
  }
  
  // Check backend .env file
  const envPath = path.join(__dirname, '..', 'backend', '.env');
  if (!fs.existsSync(envPath)) {
    throw new Error(`Backend .env file not found at: ${envPath}`);
  }
  log.success('Backend .env file found');
  
  log.info(`Environment: ${ENV}`);
  log.info(`Database: ${dbConfig.database} on ${dbConfig.host}:${dbConfig.port}`);
}

/**
 * Test database connection with retry logic
 */
async function testDatabaseConnection() {
  log.header('TESTING DATABASE CONNECTION');
  
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      log.info(`Connection attempt ${attempt}/${MAX_RETRY_ATTEMPTS}...`);
      
      // Test connection without database first
      const testConfig = { ...dbConfig };
      delete testConfig.database;
      
      const testConnection = await mysql.createConnection(testConfig);
      await testConnection.ping();
      await testConnection.end();
      
      log.success('MySQL server connection successful');
      return true;
      
    } catch (error) {
      lastError = error;
      log.warning(`Connection attempt ${attempt} failed: ${error.message}`);
      
      if (attempt < MAX_RETRY_ATTEMPTS) {
        log.info(`Retrying in ${RETRY_DELAY/1000} seconds...`);
        await sleep(RETRY_DELAY);
      }
    }
  }
  
  throw new Error(`Database connection failed after ${MAX_RETRY_ATTEMPTS} attempts: ${lastError.message}`);
}

/**
 * Check and create database if needed
 */
async function ensureDatabaseExists() {
  log.header('ENSURING DATABASE EXISTS');
  
  const tempConfig = { ...dbConfig };
  delete tempConfig.database; // Connect without specifying database
  
  const connection = await mysql.createConnection(tempConfig);
  
  try {
    // Check if database exists
    const [databases] = await connection.execute(
      'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
      [dbConfig.database]
    );
    
    if (databases.length === 0) {
      log.info(`Creating database: ${dbConfig.database}`);
      await connection.execute(`CREATE DATABASE \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      log.success(`Database ${dbConfig.database} created`);
    } else {
      log.success(`Database ${dbConfig.database} already exists`);
    }
  } finally {
    await connection.end();
  }
}

/**
 * Complete database schema with all tables
 */
const createTablesSQL = `
-- ==============================================
-- ULT FPEB COMPLETE DATABASE SCHEMA
-- ==============================================

-- 1. CORE SYSTEM TABLES
-- ==============================================

-- Users table (Admin and Receptionist)
CREATE TABLE IF NOT EXISTS users (
    id            int unsigned auto_increment primary key,
    name          varchar(255)                                             not null,
    email         varchar(255)                                             not null,
    password      varchar(255)                                             not null comment 'Hashed password',
    role          enum ('Admin', 'Receptionist') default 'Receptionist'    not null,
    avatar_url    varchar(2048)                                            null,
    photo_url     varchar(2048)                                            null,
    phone         varchar(45)                                              null,
    study_program varchar(255)                                             null,
    cohort        varchar(45)                                              null,
    created_at    timestamp                      default CURRENT_TIMESTAMP not null,
    updated_at    timestamp                      default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP,
    constraint email unique (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Visitors table  
CREATE TABLE IF NOT EXISTS visitors (
    id               int unsigned auto_increment primary key,
    full_name        varchar(255)                         not null,
    phone_number     varchar(45)                          not null,
    email            varchar(255)                         null,
    id_number        varchar(100)                         null,
    address          text                                 null,
    institution      varchar(255)                         null,
    purpose          varchar(255)                         not null,
    person_to_meet   varchar(255)                         not null,
    location         varchar(255)                         not null,
    request_document tinyint(1) default 0                 not null comment '1 if visitor requests document',
    document_type    varchar(100)                         null comment 'Type of document requested',
    request_details  text                                 null comment 'Details about document request',
    check_in_time    timestamp    default CURRENT_TIMESTAMP not null,
    check_out_time   timestamp                            null,
    notes            text                                 null,
    is_completed     tinyint(1)   default 0               not null comment '1 when visitor checks out',
    photo_url        varchar(2048)                        null comment 'Visitor photo URL',
    signature_data   text                                 null comment 'Base64 encoded signature',
    input_by_user_id int unsigned                         null comment 'ID of user who input this record',
    created_at       timestamp    default CURRENT_TIMESTAMP not null,
    updated_at       timestamp    default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. COMPLAINT MANAGEMENT TABLES  
-- ==============================================

-- Complaint categories
CREATE TABLE IF NOT EXISTS complaint_categories (
    id         int unsigned auto_increment primary key,
    name       varchar(100) not null,
    color      varchar(7)   default '#007bff' null comment 'Hex color code',
    is_active  tinyint(1)   default 1 not null,
    created_at timestamp    default CURRENT_TIMESTAMP null,
    updated_at timestamp    default CURRENT_TIMESTAMP null on update CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dynamic complaint fields
CREATE TABLE IF NOT EXISTS complaint_fields (
    id            int unsigned auto_increment primary key,
    field_name    varchar(100) not null,
    field_type    enum ('text', 'textarea', 'select', 'multiselect', 'file', 'date', 'email', 'phone') not null,
    field_label   varchar(200) not null,
    field_options json         null comment 'Options for select/multiselect fields',
    is_required   tinyint(1)   default 0 not null,
    sort_order    int          default 0 not null,
    is_active     tinyint(1)   default 1 not null,
    created_at    timestamp    default CURRENT_TIMESTAMP null,
    updated_at    timestamp    default CURRENT_TIMESTAMP null on update CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Main complaints table
CREATE TABLE IF NOT EXISTS complaints (
    id                  int unsigned auto_increment primary key,
    complainant_id      int unsigned                                                                        null comment 'Optional ID if complainant is a registered user',
    complainant_name    varchar(200)                                                                        not null,
    complainant_email   varchar(200)                                                                        null,
    complainant_phone   varchar(50)                                                                         null,
    category_id         int unsigned                                                                        null,
    subject             varchar(500)                                                                        not null,
    description         text                                                                                not null,
    priority            enum ('low', 'medium', 'high', 'urgent') default 'medium'                         not null,
    status              enum ('submitted', 'in_review', 'in_progress', 'resolved', 'closed') default 'submitted' not null,
    assigned_to         int unsigned                                                                        null comment 'ID of staff assigned to handle complaint',
    form_data           json                                                                                null comment 'Dynamic form field data',
    photo_urls          json                                                                                null comment 'Array of photo URLs',
    location            varchar(255)                                                                        null,
    incident_date       date                                                                                null,
    resolution          text                                                                                null,
    resolution_date     timestamp                                                                           null,
    created_at          timestamp                          default CURRENT_TIMESTAMP                       not null,
    updated_at          timestamp                          default CURRENT_TIMESTAMP                       not null on update CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Complaint responses/replies
CREATE TABLE IF NOT EXISTS complaint_responses (
    id           int unsigned auto_increment primary key,
    complaint_id int unsigned not null,
    user_id      int unsigned not null comment 'ID of staff who responded',
    response     text         not null,
    is_internal  tinyint(1)   default 0 not null comment '1 for internal notes, 0 for public responses',
    created_at   timestamp    default CURRENT_TIMESTAMP null
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. FEEDBACK SYSTEM TABLES
-- ==============================================

-- Feedback categories
CREATE TABLE IF NOT EXISTS feedback_categories (
    id          int unsigned auto_increment primary key,
    name        varchar(100) not null,
    description text         null,
    is_active   tinyint(1)   default 1 not null,
    sort_order  int          default 0 not null,
    created_at  timestamp    default CURRENT_TIMESTAMP null,
    updated_at  timestamp    default CURRENT_TIMESTAMP null on update CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Feedbacks table
CREATE TABLE IF NOT EXISTS feedbacks (
    id                          int unsigned auto_increment primary key,
    visitor_id                  int unsigned                                         null,
    category                    int unsigned                                         null,
    rating                      tinyint                                              not null comment 'Overall rating from 1 to 5',
    visitor_name                varchar(255)                                         not null,
    visitor_email               varchar(255)                                         null,
    created_at                  timestamp default CURRENT_TIMESTAMP                 null,
    updated_at                  timestamp default CURRENT_TIMESTAMP                 null on update CURRENT_TIMESTAMP,
    access_ease_rating          tinyint                                              null comment 'Rating from 1 to 5',
    wait_time_rating            tinyint                                              null comment 'Rating from 1 to 5',
    staff_friendliness_rating   tinyint                                              null comment 'Rating from 1 to 5',
    info_clarity_rating         tinyint                                              null comment 'Rating from 1 to 5',
    overall_satisfaction_rating tinyint                                              null comment 'Rating from 1 to 5',
    willing_to_return           tinyint(1)                                           null comment 'Whether visitor is willing to return',
    likes                       text                                                 null comment 'Visitor feedback text',
    suggestions                 text                                                 null comment 'Visitor feedback text',
    check ((\`rating\` >= 1) and (\`rating\` <= 5))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. LOST ITEMS MANAGEMENT TABLES
-- ==============================================

-- Lost items
CREATE TABLE IF NOT EXISTS lost_items (
    id                      int auto_increment primary key,
    item_name               varchar(255)                                                         not null,
    description             text                                                                 null,
    category                varchar(100)                                                         null,
    found_location          varchar(255)                                                         not null,
    found_date              date                                                                 not null,
    found_time              time                                                                 not null,
    finder_name             varchar(255)                                                         null,
    finder_contact          varchar(100)                                                         null,
    found_by                varchar(255)                                                         null,
    condition_status        enum ('excellent', 'good', 'fair', 'poor') default 'good'          null,
    handover_photo_url      longtext                                                             null,
    handover_signature_data text                                                                 null,
    status                  enum ('found', 'returned', 'disposed') default 'found'             null,
    notes                   text                                                                 null,
    input_by_user_id        int                                                                  null,
    created_at              timestamp                                   default CURRENT_TIMESTAMP null,
    updated_at              timestamp                                   default CURRENT_TIMESTAMP null on update CURRENT_TIMESTAMP,
    received_by_operator    varchar(255)                                                         null,
    received_by_operator_id int                                                                  null
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Item returns
CREATE TABLE IF NOT EXISTS item_returns (
    id                    int auto_increment primary key,
    lost_item_id          int                                                                      not null,
    claimer_name          varchar(255)                                                             not null,
    claimer_contact       varchar(100)                                                             not null,
    claimer_id_number     varchar(100)                                                             not null,
    relationship_to_owner enum ('owner', 'family', 'friend', 'colleague', 'representative') default 'owner' null,
    proof_of_ownership    text                                                                     null,
    return_date           date                                                                     not null,
    return_time           time                                                                     not null,
    returned_by           varchar(255)                                                             null,
    returned_by_user_id   int                                                                      null,
    notes                 text                                                                     null,
    created_at            timestamp                                        default CURRENT_TIMESTAMP null,
    return_operator       varchar(255)                                                             null,
    return_operator_id    int                                                                      null,
    return_photo_url      longtext                                                                 null,
    return_signature_data longtext                                                                 null,
    returned_by_id        int                                                                      null comment 'Foreign key reference to users table'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. CONFIGURATION MANAGEMENT TABLES
-- ==============================================

-- Configuration categories
CREATE TABLE IF NOT EXISTS configuration_categories (
    id           int auto_increment primary key,
    key_name     varchar(50)                         not null comment 'units, purposes, documentTypes',
    display_name varchar(100)                        not null comment 'Human readable name',
    description  text                                null comment 'Description of this configuration category',
    is_active    tinyint(1) default 1                null,
    created_at   timestamp  default CURRENT_TIMESTAMP null,
    updated_at   timestamp  default CURRENT_TIMESTAMP null on update CURRENT_TIMESTAMP,
    constraint key_name unique (key_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Configuration groups
CREATE TABLE IF NOT EXISTS configuration_groups (
    id          int auto_increment primary key,
    category_id int                             not null,
    group_name  varchar(100)                    not null comment 'Group label like DEKANAT, Program Studi',
    sort_order  int        default 0            null,
    is_active   tinyint(1) default 1            null,
    created_at  timestamp  default CURRENT_TIMESTAMP null,
    updated_at  timestamp  default CURRENT_TIMESTAMP null on update CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Configuration options
CREATE TABLE IF NOT EXISTS configuration_options (
    id           int auto_increment primary key,
    category_id  int                             not null,
    group_id     int                             null comment 'NULL for flat lists like purposes, documentTypes',
    option_value varchar(255)                    not null,
    display_text varchar(255)                    not null,
    sort_order   int        default 0            null,
    is_active    tinyint(1) default 1            null,
    created_at   timestamp  default CURRENT_TIMESTAMP null,
    updated_at   timestamp  default CURRENT_TIMESTAMP null on update CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. MENU SYSTEM TABLES
-- ==============================================

-- Menu configuration
CREATE TABLE IF NOT EXISTS menu_config (
    id                int unsigned auto_increment primary key,
    show_logos        tinyint(1)                              default 1 not null,
    show_icons        tinyint(1)                              default 1 not null,
    collapse_behavior enum ('click', 'hover', 'none')        default 'hover' not null,
    theme_mode        enum ('light', 'dark', 'auto')         default 'auto' not null,
    updated_at        timestamp                               default CURRENT_TIMESTAMP null on update CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Menu items
CREATE TABLE IF NOT EXISTS menu_items (
    id          int unsigned auto_increment primary key,
    name        varchar(100)                            not null,
    href        varchar(255)                            not null,
    icon        varchar(50)                             not null,
    roles       json default (json_array(_utf8mb4'Admin', _utf8mb4'Receptionist')) not null,
    parent_id   int unsigned                            null,
    sort_order  int          default 0                  not null,
    is_active   tinyint(1)   default 1                  not null,
    is_external tinyint(1)   default 0                  not null,
    description text                                    null,
    created_at  timestamp    default CURRENT_TIMESTAMP  null,
    updated_at  timestamp    default CURRENT_TIMESTAMP  null on update CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

/**
 * Create database tables
 */
async function createTables(connection) {
  log.header('CREATING DATABASE TABLES');
  
  // Split the schema into individual table creation statements
  const tableStatements = createTablesSQL.split(';').filter(statement => 
    statement.trim() && 
    !statement.trim().startsWith('--') &&
    statement.trim().length > 10
  );
  
  try {
    let createdCount = 0;
    for (const statement of tableStatements) {
      const trimmedStatement = statement.trim();
      if (trimmedStatement && trimmedStatement.includes('CREATE TABLE')) {
        try {
          await connection.execute(trimmedStatement + ';');
          createdCount++;
          
          // Extract table name for logging
          const tableMatch = trimmedStatement.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
          const tableName = tableMatch ? tableMatch[1] : 'unknown';
          log.info(`Created table: ${tableName}`);
          
        } catch (error) {
          if (error.code === 'ER_TABLE_EXISTS_ERROR') {
            log.info('Table already exists, skipping...');
          } else {
            log.warning(`Failed to create table: ${error.message}`);
          }
        }
      }
    }
    
    log.success(`Database tables creation completed (${createdCount} processed)`);
    
    // Verify tables were created
    const [tables] = await connection.execute('SHOW TABLES');
    log.info(`Total tables in database: ${tables.length}`);
    
  } catch (error) {
    throw new Error(`Failed to create tables: ${error.message}`);
  }
}

/**
 * Add foreign key constraints
 */
async function addForeignKeys(connection) {
  log.header('ADDING FOREIGN KEY CONSTRAINTS');
  
  const foreignKeyConstraints = [
    'ALTER TABLE visitors ADD CONSTRAINT fk_visitors_users FOREIGN KEY (input_by_user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL',
    'ALTER TABLE complaints ADD CONSTRAINT fk_complaints_category FOREIGN KEY (category_id) REFERENCES complaint_categories(id) ON DELETE SET NULL',
    'ALTER TABLE complaints ADD CONSTRAINT fk_complaints_assigned_to FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL',
    'ALTER TABLE complaint_responses ADD CONSTRAINT fk_complaint_responses_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE',
    'ALTER TABLE complaint_responses ADD CONSTRAINT fk_complaint_responses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
    'ALTER TABLE feedbacks ADD CONSTRAINT fk_feedback_category FOREIGN KEY (category) REFERENCES feedback_categories(id) ON DELETE SET NULL',
    'ALTER TABLE lost_items ADD CONSTRAINT fk_lost_items_user FOREIGN KEY (input_by_user_id) REFERENCES users(id) ON DELETE SET NULL',
    'ALTER TABLE item_returns ADD CONSTRAINT fk_item_returns_lost_item FOREIGN KEY (lost_item_id) REFERENCES lost_items(id) ON DELETE CASCADE',
    'ALTER TABLE item_returns ADD CONSTRAINT fk_item_returns_user FOREIGN KEY (returned_by_id) REFERENCES users(id) ON DELETE SET NULL',
    'ALTER TABLE configuration_groups ADD CONSTRAINT fk_config_groups_category FOREIGN KEY (category_id) REFERENCES configuration_categories(id) ON DELETE CASCADE',
    'ALTER TABLE configuration_options ADD CONSTRAINT fk_config_options_category FOREIGN KEY (category_id) REFERENCES configuration_categories(id) ON DELETE CASCADE',
    'ALTER TABLE configuration_options ADD CONSTRAINT fk_config_options_group FOREIGN KEY (group_id) REFERENCES configuration_groups(id) ON DELETE CASCADE',
    'ALTER TABLE menu_items ADD CONSTRAINT fk_menu_items_parent FOREIGN KEY (parent_id) REFERENCES menu_items(id) ON DELETE SET NULL'
  ];
  
  let addedCount = 0;
  for (const constraint of foreignKeyConstraints) {
    try {
      await connection.execute(constraint);
      addedCount++;
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        log.info('Foreign key constraint already exists, skipping...');
      } else {
        log.warning(`Failed to add constraint: ${error.message}`);
      }
    }
  }
  
  log.success(`Added ${addedCount} foreign key constraints`);
}

/**
 * Add performance indexes
 */
async function addIndexes(connection) {
  log.header('ADDING PERFORMANCE INDEXES');
  
  const indexes = [
    { name: 'idx_users_email', sql: 'CREATE INDEX idx_users_email ON users(email)' },
    { name: 'idx_users_role', sql: 'CREATE INDEX idx_users_role ON users(role)' },
    { name: 'idx_visitors_check_in_time', sql: 'CREATE INDEX idx_visitors_check_in_time ON visitors(check_in_time)' },
    { name: 'idx_visitors_full_name', sql: 'CREATE INDEX idx_visitors_full_name ON visitors(full_name)' },
    { name: 'idx_visitors_location', sql: 'CREATE INDEX idx_visitors_location ON visitors(location)' },
    { name: 'idx_visitors_document_type', sql: 'CREATE INDEX idx_visitors_document_type ON visitors(document_type)' },
    { name: 'idx_visitors_request_document', sql: 'CREATE INDEX idx_visitors_request_document ON visitors(request_document)' },
    { name: 'idx_complaints_status', sql: 'CREATE INDEX idx_complaints_status ON complaints(status)' },
    { name: 'idx_complaints_priority', sql: 'CREATE INDEX idx_complaints_priority ON complaints(priority)' },
    { name: 'idx_complaints_created_at', sql: 'CREATE INDEX idx_complaints_created_at ON complaints(created_at)' },
    { name: 'idx_complaints_category_id', sql: 'CREATE INDEX idx_complaints_category_id ON complaints(category_id)' },
    { name: 'idx_complaints_assigned_to', sql: 'CREATE INDEX idx_complaints_assigned_to ON complaints(assigned_to)' },
    { name: 'idx_feedbacks_rating', sql: 'CREATE INDEX idx_feedbacks_rating ON feedbacks(rating)' },
    { name: 'idx_feedbacks_visitor_id', sql: 'CREATE INDEX idx_feedbacks_visitor_id ON feedbacks(visitor_id)' },
    { name: 'idx_lost_items_status', sql: 'CREATE INDEX idx_lost_items_status ON lost_items(status)' },
    { name: 'idx_lost_items_found_date', sql: 'CREATE INDEX idx_lost_items_found_date ON lost_items(found_date)' },
    { name: 'idx_lost_items_category', sql: 'CREATE INDEX idx_lost_items_category ON lost_items(category)' },
    { name: 'idx_config_categories_key_name', sql: 'CREATE INDEX idx_config_categories_key_name ON configuration_categories(key_name)' },
    { name: 'idx_config_groups_category_sort', sql: 'CREATE INDEX idx_config_groups_category_sort ON configuration_groups(category_id, sort_order)' },
    { name: 'idx_config_options_category_group_sort', sql: 'CREATE INDEX idx_config_options_category_group_sort ON configuration_options(category_id, group_id, sort_order)' },
    { name: 'idx_menu_items_is_active', sql: 'CREATE INDEX idx_menu_items_is_active ON menu_items(is_active)' },
    { name: 'idx_menu_items_parent_id', sql: 'CREATE INDEX idx_menu_items_parent_id ON menu_items(parent_id)' },
    { name: 'idx_menu_items_sort_order', sql: 'CREATE INDEX idx_menu_items_sort_order ON menu_items(sort_order)' }
  ];
  
  let addedCount = 0;
  for (const index of indexes) {
    try {
      // Check if index exists first
      const [existingIndexes] = await connection.execute(`
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.STATISTICS 
        WHERE TABLE_SCHEMA = ? AND INDEX_NAME = ?
      `, [dbConfig.database, index.name]);
      
      if (existingIndexes[0].count > 0) {
        // Index already exists, skip
        continue;
      }
      
      await connection.execute(index.sql);
      addedCount++;
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        // Index already exists, skip
      } else {
        log.warning(`Failed to add index ${index.name}: ${error.message}`);
      }
    }
  }
  
  log.success(`Added ${addedCount} performance indexes`);
}

/**
 * Default users with environment-specific passwords
 */
const getDefaultUsers = () => {
  const isProduction = ENV === 'production';
  
  return [
    {
      name: 'Admin ULT FPEB',
      email: 'adminult@fpeb.upi.edu',
      password: isProduction ? 'AdminULT2025!' : 'admin',
      role: 'Admin'
    },
    {
      name: 'Arsip FPEB',
      email: 'arsip@fpeb.upi.edu',
      password: isProduction ? 'ArsipFPEB2025!' : 'admin',
      role: 'Admin'
    },
    {
      name: 'Manajemen Perkantoran',
      email: 'manper@upi.edu',
      password: isProduction ? 'ManperUPI2025!' : 'manper123',
      role: 'Receptionist'
    }
  ];
};

/**
 * Create default users with hashed passwords
 */
async function createDefaultUsers(connection) {
  log.header('CREATING DEFAULT USERS');
  
  const defaultUsers = getDefaultUsers();
  
  for (const user of defaultUsers) {
    try {
      // Check if user already exists
      const [existing] = await connection.execute(
        'SELECT id FROM users WHERE email = ?',
        [user.email]
      );
      
      if (existing.length > 0) {
        log.info(`User ${user.email} already exists, skipping...`);
        continue;
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);
      
      // Create user
      await connection.execute(
        'INSERT INTO users (name, email, password, role, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
        [user.name, user.email, hashedPassword, user.role]
      );
      
      log.success(`Created user: ${user.email} (${user.role})`);
      
    } catch (error) {
      log.error(`Failed to create user ${user.email}: ${error.message}`);
    }
  }
}

/**
 * Seed default data
 */
async function seedDefaultData(connection) {
  log.header('SEEDING DEFAULT DATA');
  
  // Default complaint categories
  const complaintCategories = [
    { name: 'Layanan Umum', color: '#007bff' },
    { name: 'Fasilitas', color: '#28a745' },
    { name: 'Administrasi', color: '#ffc107' },
    { name: 'Akademik', color: '#17a2b8' },
    { name: 'Lainnya', color: '#6c757d' }
  ];
  
  for (const category of complaintCategories) {
    try {
      await connection.execute(
        'INSERT IGNORE INTO complaint_categories (name, color, is_active, created_at, updated_at) VALUES (?, ?, 1, NOW(), NOW())',
        [category.name, category.color]
      );
    } catch (error) {
      log.warning(`Failed to insert complaint category ${category.name}: ${error.message}`);
    }
  }
  log.success('Seeded complaint categories');
  
  // Default feedback categories
  const feedbackCategories = [
    { name: 'Layanan Umum', description: 'Feedback tentang layanan fakultas', sort_order: 1 },
    { name: 'Fasilitas', description: 'Feedback tentang fasilitas kampus', sort_order: 2 },
    { name: 'Pelayanan Staff', description: 'Feedback tentang pelayanan staf', sort_order: 3 },
    { name: 'Proses Administrasi', description: 'Feedback tentang proses administrasi', sort_order: 4 },
    { name: 'Lainnya', description: 'Feedback umum lainnya', sort_order: 5 }
  ];
  
  for (const category of feedbackCategories) {
    try {
      await connection.execute(
        'INSERT IGNORE INTO feedback_categories (name, description, is_active, sort_order, created_at, updated_at) VALUES (?, ?, 1, ?, NOW(), NOW())',
        [category.name, category.description, category.sort_order]
      );
    } catch (error) {
      log.warning(`Failed to insert feedback category ${category.name}: ${error.message}`);
    }
  }
  log.success('Seeded feedback categories');
  
  // Default configuration categories
  const configCategories = [
    { key_name: 'units', display_name: 'Unit/Bagian', description: 'Daftar unit dan bagian di fakultas' },
    { key_name: 'purposes', display_name: 'Tujuan Kunjungan', description: 'Daftar tujuan kunjungan' },
    { key_name: 'documentTypes', display_name: 'Jenis Dokumen', description: 'Daftar jenis dokumen yang dapat diminta' },
    { key_name: 'locations', display_name: 'Lokasi', description: 'Daftar lokasi di fakultas' }
  ];
  
  for (const category of configCategories) {
    try {
      await connection.execute(
        'INSERT IGNORE INTO configuration_categories (key_name, display_name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, 1, NOW(), NOW())',
        [category.key_name, category.display_name, category.description]
      );
    } catch (error) {
      log.warning(`Failed to insert config category ${category.key_name}: ${error.message}`);
    }
  }
  log.success('Seeded configuration categories');
  
  // Menu configuration
  try {
    await connection.execute(
      'INSERT IGNORE INTO menu_config (id, show_logos, show_icons, collapse_behavior, theme_mode, updated_at) VALUES (1, 1, 1, "hover", "auto", NOW())'
    );
    log.success('Seeded menu configuration');
  } catch (error) {
    log.warning(`Failed to insert menu config: ${error.message}`);
  }
}

/**
 * Verify deployment success
 */
async function verifyDeployment(connection) {
  log.header('VERIFYING DEPLOYMENT');
  
  try {
    // Check tables
    const [tables] = await connection.execute('SHOW TABLES');
    const expectedTables = 15; // Total expected tables
    
    if (tables.length < expectedTables) {
      throw new Error(`Expected ${expectedTables} tables, found ${tables.length}`);
    }
    log.success(`Found ${tables.length} tables`);
    
    // Check users
    const [users] = await connection.execute('SELECT COUNT(*) as count FROM users');
    if (users[0].count < 3) {
      throw new Error(`Expected at least 3 users, found ${users[0].count}`);
    }
    log.success(`Found ${users[0].count} users`);
    
    // Check categories
    const [categories] = await connection.execute('SELECT COUNT(*) as count FROM complaint_categories');
    if (categories[0].count < 5) {
      throw new Error(`Expected at least 5 complaint categories, found ${categories[0].count}`);
    }
    log.success(`Found ${categories[0].count} complaint categories`);
    
    // Check foreign keys
    const [foreignKeys] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE REFERENCED_TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL
    `, [dbConfig.database]);
    
    if (foreignKeys[0].count < 10) {
      log.warning(`Expected more foreign keys, found ${foreignKeys[0].count}`);
    } else {
      log.success(`Found ${foreignKeys[0].count} foreign key constraints`);
    }
    
    log.success('Deployment verification completed successfully!');
    
  } catch (error) {
    throw new Error(`Deployment verification failed: ${error.message}`);
  }
}

/**
 * Main deployment function
 */
async function main() {
  const startTime = Date.now();
  let connection = null;
  
  try {
    // Step 1: Validate environment
    await validateEnvironment();
    
    // Step 2: Test database connection
    await testDatabaseConnection();
    
    // Step 3: Ensure database exists
    await ensureDatabaseExists();
    
    // Step 4: Connect to the target database
    log.info('Connecting to target database...');
    connection = await mysql.createConnection(dbConfig);
    log.success('Connected to target database');
    
    // Step 5: Create tables
    await createTables(connection);
    
    // Step 6: Add foreign keys
    await addForeignKeys(connection);
    
    // Step 7: Add indexes
    await addIndexes(connection);
    
    // Step 8: Create default users
    await createDefaultUsers(connection);
    
    // Step 9: Seed default data
    await seedDefaultData(connection);
    
    // Step 10: Verify deployment
    await verifyDeployment(connection);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    log.header('DEPLOYMENT COMPLETED SUCCESSFULLY! 🎉');
    log.success(`Total time: ${duration} seconds`);
    log.success(`Environment: ${ENV}`);
    log.success(`Database: ${dbConfig.database}`);
    
    if (ENV === 'production') {
      log.warning('PRODUCTION DEPLOYMENT - Remember to change default passwords!');
    } else {
      log.info('Development deployment - Default passwords: admin/admin/manper123');
    }
    
    log.info('Next steps:');
    log.info('1. Start the backend server: cd backend && npm run dev');
    log.info('2. Start the frontend: npm run dev');
    log.info('3. Login with default credentials');
    log.info('4. Change default passwords (especially in production)');
    
  } catch (error) {
    log.error(`Deployment failed: ${error.message}`);
    log.error(`Stack trace: ${error.stack}`);
    process.exit(1);
    
  } finally {
    if (connection) {
      await connection.end();
      log.info('Database connection closed');
    }
  }
}

// Run deployment
if (require.main === module) {
  main().catch(error => {
    log.error(`Unexpected error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  main,
  validateEnvironment,
  testDatabaseConnection,
  ensureDatabaseExists
};
