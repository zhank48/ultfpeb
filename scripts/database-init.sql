-- ================================================
-- ULT FPEB Visitor Management Database Initialization
-- Complete database schema for production deployment
-- ================================================

-- Set database settings (compatible with MySQL 8.0+)
SET sql_mode = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create database if not exists (handled by deployment script)
-- CREATE DATABASE IF NOT EXISTS ult_fpeb_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE ult_fpeb_prod;

-- ================================================
-- Core Tables
-- ================================================

-- Users table for authentication and authorization
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('Admin', 'Receptionist', 'Manager') NOT NULL DEFAULT 'Receptionist',
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP NULL,
  login_attempts INT DEFAULT 0,
  locked_until TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_is_active (is_active),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Main visitors table
CREATE TABLE IF NOT EXISTS visitors (
  id INT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  institution VARCHAR(255) NOT NULL,
  id_type VARCHAR(50),
  id_number VARCHAR(100),
  address TEXT,
  
  -- Visit information
  purpose TEXT NOT NULL,
  unit VARCHAR(255) NOT NULL,
  person_to_meet VARCHAR(255) NOT NULL,
  
  -- Document request
  request_document BOOLEAN DEFAULT FALSE,
  document_type VARCHAR(255),
  document_name VARCHAR(255),
  document_number VARCHAR(100),
  
  -- Photo and signature
  photo LONGTEXT,
  signature LONGTEXT,
  
  -- Timestamps and status
  check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  check_out_time TIMESTAMP NULL,
  status ENUM('checked_in', 'checked_out') DEFAULT 'checked_in',
  
  -- Audit fields
  input_by_user_id INT,
  checkout_by_user_id INT,
  deleted_at TIMESTAMP NULL,
  deleted_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (input_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (checkout_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL,
  
  INDEX idx_full_name (full_name),
  INDEX idx_phone (phone),
  INDEX idx_email (email),
  INDEX idx_institution (institution),
  INDEX idx_check_in_time (check_in_time),
  INDEX idx_check_out_time (check_out_time),
  INDEX idx_status (status),
  INDEX idx_deleted_at (deleted_at),
  INDEX idx_input_by_user_id (input_by_user_id),
  INDEX idx_created_at (created_at),
  INDEX idx_composite_active (deleted_at, check_in_time),
  INDEX idx_composite_status (status, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- Configuration Tables
-- ================================================

-- Dynamic configurations for dropdown options
CREATE TABLE IF NOT EXISTS configurations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  type ENUM('purpose', 'unit', 'person_to_meet') NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_type_name (type, name),
  INDEX idx_type (type),
  INDEX idx_is_active (is_active),
  INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- Visitor Management Enhancement Tables
-- ================================================

-- Deletion requests for visitor records
CREATE TABLE IF NOT EXISTS deletion_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  visitor_id INT NOT NULL,
  requested_by INT NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  approved_by INT NULL,
  approved_at TIMESTAMP NULL,
  rejection_reason TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (visitor_id) REFERENCES visitors(id) ON DELETE CASCADE,
  FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE RESTRICT,
  
  INDEX idx_visitor_id (visitor_id),
  INDEX idx_requested_by (requested_by),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Visitor edit/delete action requests
CREATE TABLE IF NOT EXISTS visitor_actions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  visitor_id INT NOT NULL,
  action_type ENUM('edit', 'delete') NOT NULL,
  reason TEXT NOT NULL,
  original_data JSON NULL,
  proposed_data JSON NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  requested_by INT NOT NULL,
  requested_by_name VARCHAR(255) NOT NULL,
  requested_by_role VARCHAR(50) NOT NULL,
  processed_by INT NULL,
  processed_by_name VARCHAR(255) NULL,
  processed_at TIMESTAMP NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (visitor_id) REFERENCES visitors(id) ON DELETE CASCADE,
  FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE RESTRICT,
  
  INDEX idx_visitor_id (visitor_id),
  INDEX idx_action_type (action_type),
  INDEX idx_status (status),
  INDEX idx_requested_by (requested_by),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- Additional Feature Tables
-- ================================================

-- Complaints management
CREATE TABLE IF NOT EXISTS complaints (
  id INT PRIMARY KEY AUTO_INCREMENT,
  visitor_id INT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  complaint_type VARCHAR(100) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  assigned_to INT NULL,
  resolution TEXT NULL,
  resolved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (visitor_id) REFERENCES visitors(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  
  INDEX idx_visitor_id (visitor_id),
  INDEX idx_status (status),
  INDEX idx_priority (priority),
  INDEX idx_assigned_to (assigned_to),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Feedback management
CREATE TABLE IF NOT EXISTS feedback (
  id INT PRIMARY KEY AUTO_INCREMENT,
  visitor_id INT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  feedback_type ENUM('service_quality', 'facility', 'staff', 'process', 'suggestion', 'other') DEFAULT 'other',
  rating INT CHECK (rating >= 1 AND rating <= 5),
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT FALSE,
  status ENUM('new', 'reviewed', 'acknowledged') DEFAULT 'new',
  reviewed_by INT NULL,
  reviewed_at TIMESTAMP NULL,
  response TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (visitor_id) REFERENCES visitors(id) ON DELETE SET NULL,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  
  INDEX idx_visitor_id (visitor_id),
  INDEX idx_feedback_type (feedback_type),
  INDEX idx_rating (rating),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Lost and found items
CREATE TABLE IF NOT EXISTS lost_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  reporter_name VARCHAR(255) NOT NULL,
  reporter_phone VARCHAR(50),
  reporter_email VARCHAR(255),
  item_name VARCHAR(255) NOT NULL,
  description TEXT,
  location_lost VARCHAR(255),
  date_lost DATE,
  category VARCHAR(100),
  status ENUM('reported', 'found', 'returned', 'disposed') DEFAULT 'reported',
  found_by INT NULL,
  found_date DATE NULL,
  returned_to VARCHAR(255) NULL,
  returned_date DATE NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (found_by) REFERENCES users(id) ON DELETE SET NULL,
  
  INDEX idx_status (status),
  INDEX idx_category (category),
  INDEX idx_date_lost (date_lost),
  INDEX idx_found_date (found_date),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- Audit and Logging Tables
-- ================================================

-- Deletion audit logs
CREATE TABLE IF NOT EXISTS deletion_audit_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  deletion_request_id INT NOT NULL,
  action VARCHAR(50) NOT NULL,
  performed_by INT NOT NULL,
  action_details JSON NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (deletion_request_id) REFERENCES deletion_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE RESTRICT,
  
  INDEX idx_deletion_request_id (deletion_request_id),
  INDEX idx_performed_by (performed_by),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- System activity logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INT,
  details JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_entity_type (entity_type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- Views for Enhanced Data Access
-- ================================================

-- Visitor management statistics view
CREATE OR REPLACE VIEW visitor_management_stats AS
SELECT 
  (SELECT COUNT(*) FROM visitors) as total_visitors,
  (SELECT COUNT(*) FROM visitors WHERE deleted_at IS NULL) as active_visitors,
  (SELECT COUNT(*) FROM visitors WHERE deleted_at IS NOT NULL) as deleted_visitors,
  (SELECT COUNT(*) FROM visitor_actions WHERE status = 'pending' AND action_type = 'edit') as pending_edit_requests,
  (SELECT COUNT(*) FROM deletion_requests WHERE status = 'pending') as pending_deletion_requests,
  (SELECT COUNT(*) FROM visitors WHERE DATE(check_in_time) = CURDATE()) as today_visitors,
  (SELECT COUNT(*) FROM visitors WHERE DATE(check_in_time) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)) as week_visitors,
  (SELECT COUNT(*) FROM visitors WHERE DATE(check_in_time) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) as month_visitors,
  (SELECT COUNT(*) FROM complaints WHERE status IN ('open', 'in_progress')) as open_complaints,
  (SELECT COUNT(*) FROM feedback WHERE status = 'new') as new_feedback;

-- Enhanced visitor management view
CREATE OR REPLACE VIEW visitor_management_view AS
SELECT 
  v.*,
  u.name as input_by_name,
  u.role as input_by_role,
  u.email as input_by_email,
  checkout_u.name as checkout_by_name,
  deleted_u.name as deleted_by_name,
  
  -- Latest deletion request info
  dr.id as deletion_request_id,
  dr.status as deletion_status,
  dr.reason as deletion_reason,
  dr.created_at as deletion_requested_at,
  dr_req.name as deletion_requested_by_name,
  dr_req.role as deletion_requested_by_role,
  
  -- Latest edit request info  
  va.id as edit_request_id,
  va.status as edit_status,
  va.reason as edit_reason,
  va.created_at as edit_requested_at,
  va_req.name as edit_requested_by_name,
  va_req.role as edit_requested_by_role,
  
  -- Computed status for easy filtering
  CASE 
    WHEN v.deleted_at IS NOT NULL THEN 'deleted'
    WHEN dr.status = 'pending' THEN 'pending_delete'
    WHEN va.status = 'pending' AND va.action_type = 'edit' THEN 'pending_edit'
    ELSE 'active'
  END as computed_status,
  
  -- Priority for admin sorting
  CASE 
    WHEN dr.status = 'pending' THEN 1
    WHEN va.status = 'pending' AND va.action_type = 'edit' THEN 2
    WHEN v.deleted_at IS NULL THEN 3
    WHEN v.deleted_at IS NOT NULL THEN 4
    ELSE 5
  END as priority_order
  
FROM visitors v
LEFT JOIN users u ON v.input_by_user_id = u.id
LEFT JOIN users checkout_u ON v.checkout_by_user_id = checkout_u.id  
LEFT JOIN users deleted_u ON v.deleted_by = deleted_u.id

-- Latest deletion request per visitor
LEFT JOIN deletion_requests dr ON v.id = dr.visitor_id 
  AND dr.id = (
    SELECT MAX(id) FROM deletion_requests 
    WHERE visitor_id = v.id AND status = 'pending'
  )
LEFT JOIN users dr_req ON dr.requested_by = dr_req.id

-- Latest edit request per visitor
LEFT JOIN visitor_actions va ON v.id = va.visitor_id 
  AND va.action_type = 'edit'
  AND va.id = (
    SELECT MAX(id) FROM visitor_actions 
    WHERE visitor_id = v.id AND action_type = 'edit' AND status = 'pending'
  )
LEFT JOIN users va_req ON va.requested_by = va_req.id;

-- ================================================
-- Initial Data Insertion
-- ================================================

-- Insert default admin user
INSERT IGNORE INTO users (id, name, email, password, role, created_at) VALUES 
(1, 'System Administrator', 'admin@ultfpeb.upi.edu', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeKYr6.YX4TGqDxaW', 'Admin', NOW()),
(2, 'Receptionist', 'receptionist@ultfpeb.upi.edu', '$2a$12$2kKGGPpHXrXlbHq4PhLVPOzEyXpG9O7C0xA1PdFHlcPx8vSfPYNSW', 'Receptionist', NOW());

-- Insert default configuration data
INSERT IGNORE INTO configurations (type, name, is_active, sort_order) VALUES
-- Purposes
('purpose', 'Konsultasi Akademik', TRUE, 1),
('purpose', 'Pendaftaran Mahasiswa Baru', TRUE, 2),
('purpose', 'Pengambilan Dokumen', TRUE, 3),
('purpose', 'Pembayaran SPP', TRUE, 4),
('purpose', 'Konsultasi Skripsi/Thesis', TRUE, 5),
('purpose', 'Kegiatan Kemahasiswaan', TRUE, 6),
('purpose', 'Rapat/Meeting', TRUE, 7),
('purpose', 'Penelitian', TRUE, 8),
('purpose', 'Kerjasama Institusi', TRUE, 9),
('purpose', 'Lainnya', TRUE, 99),

-- Units
('unit', 'Dekanat FPEB', TRUE, 1),
('unit', 'Program Studi Pendidikan Ekonomi', TRUE, 2),
('unit', 'Program Studi Pendidikan Akuntansi', TRUE, 3),
('unit', 'Program Studi Pendidikan Bisnis', TRUE, 4),
('unit', 'Program Studi Pendidikan Manajemen Perkantoran', TRUE, 5),
('unit', 'Program Studi Ilmu Ekonomi dan Keuangan Islam', TRUE, 6),
('unit', 'Program Studi Ekonomi Pembangunan', TRUE, 7),
('unit', 'Program Studi Akuntansi', TRUE, 8),
('unit', 'Program Studi Manajemen', TRUE, 9),
('unit', 'Unit Layanan Terpadu (ULT)', TRUE, 10),
('unit', 'Perpustakaan FPEB', TRUE, 11),
('unit', 'Lab Komputer', TRUE, 12),
('unit', 'Bagian Akademik', TRUE, 13),
('unit', 'Bagian Keuangan', TRUE, 14),
('unit', 'Bagian Kemahasiswaan', TRUE, 15),
('unit', 'Lainnya', TRUE, 99),

-- Person to Meet
('person_to_meet', 'Dekan FPEB', TRUE, 1),
('person_to_meet', 'Wakil Dekan I (Akademik)', TRUE, 2),
('person_to_meet', 'Wakil Dekan II (Administrasi)', TRUE, 3),
('person_to_meet', 'Wakil Dekan III (Kemahasiswaan)', TRUE, 4),
('person_to_meet', 'Kepala Program Studi', TRUE, 10),
('person_to_meet', 'Dosen Pembimbing', TRUE, 11),
('person_to_meet', 'Staff Akademik', TRUE, 20),
('person_to_meet', 'Staff Keuangan', TRUE, 21),
('person_to_meet', 'Staff Kemahasiswaan', TRUE, 22),
('person_to_meet', 'Staff ULT', TRUE, 23),
('person_to_meet', 'Koordinator Skripsi', TRUE, 30),
('person_to_meet', 'Koordinator PKL', TRUE, 31),
('person_to_meet', 'Koordinator KKN', TRUE, 32),
('person_to_meet', 'Lainnya', TRUE, 99);

-- ================================================
-- Database Triggers
-- ================================================

DELIMITER //

-- Trigger for new deletion requests
DROP TRIGGER IF EXISTS notify_deletion_request_created//
CREATE TRIGGER notify_deletion_request_created
  AFTER INSERT ON deletion_requests
  FOR EACH ROW
BEGIN
  INSERT INTO deletion_audit_logs (deletion_request_id, action, performed_by, action_details, created_at)
  VALUES (NEW.id, 'created', NEW.requested_by, JSON_OBJECT('visitor_id', NEW.visitor_id, 'reason', NEW.reason), NOW());
END//

-- Trigger for deletion request status updates
DROP TRIGGER IF EXISTS notify_deletion_request_updated//
CREATE TRIGGER notify_deletion_request_updated
  AFTER UPDATE ON deletion_requests
  FOR EACH ROW
BEGIN
  IF OLD.status != NEW.status THEN
    INSERT INTO deletion_audit_logs (deletion_request_id, action, performed_by, action_details, created_at)
    VALUES (NEW.id, NEW.status, COALESCE(NEW.approved_by, NEW.requested_by), 
           JSON_OBJECT('old_status', OLD.status, 'new_status', NEW.status, 'rejection_reason', NEW.rejection_reason), NOW());
  END IF;
END//

-- Trigger for visitor activity logging
DROP TRIGGER IF EXISTS log_visitor_activity//
CREATE TRIGGER log_visitor_activity
  AFTER INSERT ON visitors
  FOR EACH ROW
BEGIN
  INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, created_at)
  VALUES (NEW.input_by_user_id, 'visitor_checkin', 'visitor', NEW.id, 
          JSON_OBJECT('name', NEW.full_name, 'institution', NEW.institution, 'purpose', NEW.purpose), NOW());
END//

DELIMITER ;

-- ================================================
-- Stored Procedures
-- ================================================

DELIMITER //

-- Procedure to get visitor management data with filters
DROP PROCEDURE IF EXISTS GetVisitorManagementData//
CREATE PROCEDURE GetVisitorManagementData(
  IN p_user_role VARCHAR(50),
  IN p_view_type VARCHAR(50),
  IN p_search VARCHAR(255),
  IN p_location VARCHAR(255),
  IN p_start_date DATE,
  IN p_end_date DATE,
  IN p_limit INT
)
BEGIN
  DECLARE sql_query TEXT;
  DECLARE where_clause TEXT DEFAULT '';
  
  SET sql_query = 'SELECT * FROM visitor_management_view';
  
  -- Build WHERE clause based on role and view type
  IF p_user_role = 'Receptionist' THEN
    IF p_view_type = 'active' THEN
      SET where_clause = ' WHERE computed_status = "active"';
    ELSEIF p_view_type = 'pending_requests' THEN
      SET where_clause = ' WHERE computed_status IN ("pending_edit", "pending_delete")';
    END IF;
  ELSEIF p_user_role IN ('Admin', 'Manager') THEN
    IF p_view_type = 'active' THEN
      SET where_clause = ' WHERE computed_status = "active"';
    ELSEIF p_view_type = 'pending_deletion' THEN
      SET where_clause = ' WHERE computed_status = "pending_delete"';
    ELSEIF p_view_type = 'pending_edit' THEN
      SET where_clause = ' WHERE computed_status = "pending_edit"';
    ELSEIF p_view_type = 'deleted' THEN
      SET where_clause = ' WHERE computed_status = "deleted"';
    ELSEIF p_view_type = 'all' THEN
      SET where_clause = ' WHERE 1=1';
    END IF;
  END IF;
  
  -- Add additional filters
  IF p_search IS NOT NULL AND p_search != '' THEN
    SET where_clause = CONCAT(where_clause, ' AND (full_name LIKE "%', p_search, '%" OR institution LIKE "%', p_search, '%" OR purpose LIKE "%', p_search, '%")');
  END IF;
  
  IF p_location IS NOT NULL AND p_location != '' THEN
    SET where_clause = CONCAT(where_clause, ' AND unit LIKE "%', p_location, '%"');
  END IF;
  
  IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL THEN
    SET where_clause = CONCAT(where_clause, ' AND DATE(check_in_time) BETWEEN "', p_start_date, '" AND "', p_end_date, '"');
  END IF;
  
  -- Complete query
  SET sql_query = CONCAT(sql_query, where_clause, ' ORDER BY priority_order, check_in_time DESC');
  
  IF p_limit IS NOT NULL AND p_limit > 0 THEN
    SET sql_query = CONCAT(sql_query, ' LIMIT ', p_limit);
  END IF;
  
  SET @sql = sql_query;
  PREPARE stmt FROM @sql;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;
END//

DELIMITER ;

-- ================================================
-- Performance Optimization Indexes
-- ================================================

-- Additional composite indexes for better performance (MySQL 8.0 compatible)
-- Note: Using stored procedure to create indexes safely
DELIMITER //

CREATE PROCEDURE CreateIndexIfNotExists(
    IN table_name VARCHAR(64),
    IN index_name VARCHAR(64), 
    IN index_definition TEXT
)
BEGIN
    DECLARE index_exists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO index_exists
    FROM information_schema.statistics 
    WHERE table_schema = DATABASE()
    AND table_name = table_name
    AND index_name = index_name;
    
    IF index_exists = 0 THEN
        SET @sql = CONCAT('CREATE INDEX ', index_name, ' ON ', table_name, ' ', index_definition);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END//

DELIMITER ;

-- Create indexes using the procedure
CALL CreateIndexIfNotExists('visitors', 'idx_visitors_composite', '(deleted_at, check_in_time)');

-- Drop the procedure after use
DROP PROCEDURE IF EXISTS CreateIndexIfNotExists;

-- ================================================
-- Final Status Check
-- ================================================

-- Verify database initialization
SELECT 
  'Database initialization completed successfully!' as status,
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM configurations) as total_configurations,
  (SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE') as tables_created,
  NOW() as completed_at;