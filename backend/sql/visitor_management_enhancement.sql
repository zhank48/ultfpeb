-- ================================================
-- Visitor Management Enhancement Database Schema
-- ================================================

-- Add computed status support to visitors table
ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
ADD INDEX idx_deleted_at (deleted_at),
ADD INDEX idx_updated_at (updated_at),
ADD INDEX idx_check_in_time (check_in_time);

-- Ensure deletion_requests table exists with proper structure
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
);

-- Ensure visitor_actions table exists with proper structure
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
);

-- Enhanced deletion audit logs table
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
);

-- Create visitor management statistics view
CREATE OR REPLACE VIEW visitor_management_stats AS
SELECT 
  (SELECT COUNT(*) FROM visitors) as total_visitors,
  (SELECT COUNT(*) FROM visitors WHERE deleted_at IS NULL) as active_visitors,
  (SELECT COUNT(*) FROM visitors WHERE deleted_at IS NOT NULL) as deleted_visitors,
  (SELECT COUNT(*) FROM visitor_actions WHERE status = 'pending' AND action_type = 'edit') as pending_edit_requests,
  (SELECT COUNT(*) FROM deletion_requests WHERE status = 'pending') as pending_deletion_requests,
  (SELECT COUNT(*) FROM visitors WHERE DATE(check_in_time) = CURDATE()) as today_visitors,
  (
    SELECT 
      CASE 
        WHEN COUNT(*) = 0 THEN 0 
        ELSE ROUND(
          ((SELECT COUNT(*) FROM visitors WHERE check_in_time >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)) - 
           (SELECT COUNT(*) FROM visitors WHERE check_in_time >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) + 7 DAY) AND check_in_time < DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY))) / 
          (SELECT COUNT(*) FROM visitors WHERE check_in_time >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) + 7 DAY) AND check_in_time < DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)) * 100, 1
        )
      END
  ) as weekly_growth_percentage;

-- Create enhanced visitor management view
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

-- Insert or update initial admin user if not exists
INSERT IGNORE INTO users (id, name, email, password, role, created_at)
VALUES (1, 'System Admin', 'admin@ult-fpeb.upi.edu', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', NOW())
ON DUPLICATE KEY UPDATE role = 'Admin';

-- Create notification triggers for admin
DELIMITER //

-- Trigger for new deletion requests
CREATE TRIGGER IF NOT EXISTS notify_deletion_request_created
  AFTER INSERT ON deletion_requests
  FOR EACH ROW
BEGIN
  INSERT INTO deletion_audit_logs (deletion_request_id, action, performed_by, action_details, created_at)
  VALUES (NEW.id, 'created', NEW.requested_by, JSON_OBJECT('visitor_id', NEW.visitor_id, 'reason', NEW.reason), NOW());
END//

-- Trigger for deletion request status updates
CREATE TRIGGER IF NOT EXISTS notify_deletion_request_updated
  AFTER UPDATE ON deletion_requests
  FOR EACH ROW
BEGIN
  IF OLD.status != NEW.status THEN
    INSERT INTO deletion_audit_logs (deletion_request_id, action, performed_by, action_details, created_at)
    VALUES (NEW.id, NEW.status, COALESCE(NEW.approved_by, NEW.requested_by), 
           JSON_OBJECT('old_status', OLD.status, 'new_status', NEW.status, 'rejection_reason', NEW.rejection_reason), NOW());
  END IF;
END//

DELIMITER ;

-- Add performance optimization indexes
CREATE INDEX IF NOT EXISTS idx_visitors_composite ON visitors(deleted_at, check_in_time);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_composite ON deletion_requests(visitor_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_visitor_actions_composite ON visitor_actions(visitor_id, action_type, status, created_at);

-- Update any existing data to ensure consistency
UPDATE visitors SET updated_at = COALESCE(updated_at, created_at, NOW()) WHERE updated_at IS NULL;

-- Set proper charset and collation if needed
ALTER TABLE visitors CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE deletion_requests CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE visitor_actions CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE deletion_audit_logs CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Grant permissions for application user (adjust username as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ult_fpeb_db.visitors TO 'ult_fpeb_user'@'%';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ult_fpeb_db.deletion_requests TO 'ult_fpeb_user'@'%';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ult_fpeb_db.visitor_actions TO 'ult_fpeb_user'@'%';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ult_fpeb_db.deletion_audit_logs TO 'ult_fpeb_user'@'%';
-- GRANT SELECT ON ult_fpeb_db.visitor_management_stats TO 'ult_fpeb_user'@'%';
-- GRANT SELECT ON ult_fpeb_db.visitor_management_view TO 'ult_fpeb_user'@'%';

-- Create stored procedures for common operations
DELIMITER //

-- Procedure to get visitor management data with filters
CREATE PROCEDURE IF NOT EXISTS GetVisitorManagementData(
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
    SET where_clause = CONCAT(where_clause, ' AND location LIKE "%', p_location, '%"');
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

-- Final verification query
SELECT 
  'Database enhancement completed successfully!' as status,
  (SELECT COUNT(*) FROM visitors) as total_visitors,
  (SELECT COUNT(*) FROM deletion_requests) as total_deletion_requests,
  (SELECT COUNT(*) FROM visitor_actions) as total_visitor_actions,
  NOW() as completed_at;