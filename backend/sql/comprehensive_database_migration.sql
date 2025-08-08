-- =====================================================
-- COMPREHENSIVE DATABASE MIGRATION SCRIPT
-- Sync Development Database with Production Structure
-- =====================================================

-- Set SQL modes for compatibility
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';
SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;
SET TIME_ZONE = '+00:00';

SELECT '🚀 Starting Comprehensive Database Migration...' as status;

-- =====================================================
-- 1. CREATE MISSING TABLES
-- =====================================================

SELECT '📋 Creating missing tables...' as status;

-- Deletion Audit Logs Table (Missing in development)
CREATE TABLE IF NOT EXISTS `deletion_audit_logs` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `deletion_request_id` int unsigned NOT NULL,
  `action` enum('created','approved','rejected','deleted') NOT NULL,
  `performed_by` int unsigned NOT NULL,
  `action_details` json DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_deletion_request_id` (`deletion_request_id`),
  KEY `idx_performed_by` (`performed_by`),
  KEY `idx_action` (`action`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Enhanced Deletion Requests Table
CREATE TABLE IF NOT EXISTS `deletion_requests` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `visitor_id` int unsigned NOT NULL,
  `requested_by` int unsigned NOT NULL,
  `reason` text NOT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `approved_by` int unsigned DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `rejected_by` int unsigned DEFAULT NULL,
  `rejected_at` timestamp NULL DEFAULT NULL,
  `rejection_reason` text,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_visitor_id` (`visitor_id`),
  KEY `idx_requested_by` (`requested_by`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Configuration Groups Table (Missing link between categories and options)
CREATE TABLE IF NOT EXISTS `configuration_groups` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `category_id` int unsigned NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_category_id` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Menu Configuration Table (Dynamic menu management)
CREATE TABLE IF NOT EXISTS `menu_config` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `role` varchar(50) NOT NULL,
  `menu_items` json NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_role_unique` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Menu Items Table (Individual menu items)
CREATE TABLE IF NOT EXISTS `menu_items` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `path` varchar(255) DEFAULT NULL,
  `icon` varchar(100) DEFAULT NULL,
  `parent_id` int unsigned DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `required_permissions` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT '✅ Missing tables created successfully!' as status;

-- =====================================================
-- 2. ADD MISSING COLUMNS TO EXISTING TABLES
-- =====================================================

SELECT '🔧 Adding missing columns to existing tables...' as status;

-- Add missing columns to visitors table
ALTER TABLE `visitors` 
ADD COLUMN IF NOT EXISTS `checkout_by_user_id` int unsigned DEFAULT NULL COMMENT 'User ID who performed checkout',
ADD COLUMN IF NOT EXISTS `checkout_by_name` varchar(255) DEFAULT NULL COMMENT 'Name of checkout operator',
ADD COLUMN IF NOT EXISTS `checkout_by_role` varchar(50) DEFAULT NULL COMMENT 'Role of checkout operator',
ADD COLUMN IF NOT EXISTS `checkout_by_avatar` varchar(255) DEFAULT NULL COMMENT 'Avatar of checkout operator',
ADD COLUMN IF NOT EXISTS `checkout_by_email` varchar(255) DEFAULT NULL COMMENT 'Email of checkout operator',
ADD COLUMN IF NOT EXISTS `deleted_by` int unsigned DEFAULT NULL COMMENT 'User who marked as deleted',
ADD COLUMN IF NOT EXISTS `document_details` json DEFAULT NULL COMMENT 'Additional document information',
ADD COLUMN IF NOT EXISTS `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp';

-- Add missing columns to lost_items table (upgrade data types)
ALTER TABLE `lost_items` 
MODIFY COLUMN `handover_photo_url` longtext COMMENT 'Handover photo URL (upgraded to longtext)',
MODIFY COLUMN `handover_signature_data` longtext COMMENT 'Handover signature data (upgraded to longtext)',
MODIFY COLUMN `return_photo_url` longtext COMMENT 'Return photo URL (upgraded to longtext)',
MODIFY COLUMN `return_signature_data` longtext COMMENT 'Return signature data (upgraded to longtext)';

-- Add missing columns to users table for enhanced profiles
ALTER TABLE `users`
ADD COLUMN IF NOT EXISTS `avatar_url` varchar(500) DEFAULT NULL COMMENT 'User avatar image URL',
ADD COLUMN IF NOT EXISTS `phone` varchar(20) DEFAULT NULL COMMENT 'User phone number',
ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) DEFAULT '1' COMMENT 'User active status',
ADD COLUMN IF NOT EXISTS `last_login_at` timestamp NULL DEFAULT NULL COMMENT 'Last login timestamp';

-- Add missing columns to complaints table for better tracking
ALTER TABLE `complaints`
ADD COLUMN IF NOT EXISTS `priority` enum('low','medium','high','urgent') DEFAULT 'medium' COMMENT 'Complaint priority level',
ADD COLUMN IF NOT EXISTS `assigned_to` int unsigned DEFAULT NULL COMMENT 'User assigned to handle complaint',
ADD COLUMN IF NOT EXISTS `resolved_at` timestamp NULL DEFAULT NULL COMMENT 'Resolution timestamp',
ADD COLUMN IF NOT EXISTS `resolution_notes` text DEFAULT NULL COMMENT 'Resolution details';

-- Enhance complaint_fields with more field types
ALTER TABLE `complaint_fields`
MODIFY COLUMN `field_type` enum('text','textarea','select','radio','checkbox','email','phone','tel','number','date','file','location','url','color','range') NOT NULL COMMENT 'Extended field types';

SELECT '✅ Missing columns added successfully!' as status;

-- =====================================================
-- 3. ADD MISSING INDEXES FOR PERFORMANCE
-- =====================================================

SELECT '📈 Adding performance indexes...' as status;

-- Add indexes to visitors table
CREATE INDEX IF NOT EXISTS `idx_visitors_checkout_by_user` ON `visitors` (`checkout_by_user_id`);
CREATE INDEX IF NOT EXISTS `idx_visitors_deleted_by` ON `visitors` (`deleted_by`);
CREATE INDEX IF NOT EXISTS `idx_visitors_updated_at` ON `visitors` (`updated_at`);
CREATE INDEX IF NOT EXISTS `idx_visitors_composite` ON `visitors` (`deleted_at`, `check_in_time`);

-- Add indexes to complaints table
CREATE INDEX IF NOT EXISTS `idx_complaints_status` ON `complaints` (`status`);
CREATE INDEX IF NOT EXISTS `idx_complaints_priority` ON `complaints` (`priority`);
CREATE INDEX IF NOT EXISTS `idx_complaints_assigned_to` ON `complaints` (`assigned_to`);
CREATE INDEX IF NOT EXISTS `idx_complaints_created_at` ON `complaints` (`created_at`);
CREATE INDEX IF NOT EXISTS `idx_complaints_resolved_at` ON `complaints` (`resolved_at`);

-- Add indexes to feedbacks table
CREATE INDEX IF NOT EXISTS `idx_feedbacks_rating` ON `feedbacks` (`rating`);
CREATE INDEX IF NOT EXISTS `idx_feedbacks_created_at` ON `feedbacks` (`created_at`);

-- Add indexes to lost_items table
CREATE INDEX IF NOT EXISTS `idx_lost_items_status` ON `lost_items` (`status`);
CREATE INDEX IF NOT EXISTS `idx_lost_items_found_date` ON `lost_items` (`found_date`);
CREATE INDEX IF NOT EXISTS `idx_lost_items_reported_by` ON `lost_items` (`reported_by`);

-- Add indexes to configuration tables
CREATE INDEX IF NOT EXISTS `idx_config_categories_key` ON `configuration_categories` (`key_name`);
CREATE INDEX IF NOT EXISTS `idx_config_options_category` ON `configuration_options` (`category_id`);
CREATE INDEX IF NOT EXISTS `idx_config_options_sort` ON `configuration_options` (`sort_order`);

SELECT '✅ Performance indexes added successfully!' as status;

-- =====================================================
-- 4. ADD MISSING FOREIGN KEY CONSTRAINTS
-- =====================================================

SELECT '🔗 Adding foreign key constraints...' as status;

-- Add foreign keys to visitors table (if not exists)
SET @fk_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'visitors'
    AND CONSTRAINT_NAME = 'fk_visitors_checkout_by_user'
);

SET @sql_fk_checkout = IF(
    @fk_exists = 0,
    'ALTER TABLE `visitors` ADD CONSTRAINT `fk_visitors_checkout_by_user` FOREIGN KEY (`checkout_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL',
    'SELECT "FK fk_visitors_checkout_by_user already exists" as message'
);
PREPARE stmt FROM @sql_fk_checkout;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key for deleted_by
SET @fk_deleted_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'visitors'
    AND CONSTRAINT_NAME = 'fk_visitors_deleted_by'
);

SET @sql_fk_deleted = IF(
    @fk_deleted_exists = 0,
    'ALTER TABLE `visitors` ADD CONSTRAINT `fk_visitors_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL',
    'SELECT "FK fk_visitors_deleted_by already exists" as message'
);
PREPARE stmt FROM @sql_fk_deleted;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign keys to complaints table
SET @fk_assigned_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'complaints'
    AND CONSTRAINT_NAME = 'fk_complaints_assigned_to'
);

SET @sql_fk_assigned = IF(
    @fk_assigned_exists = 0,
    'ALTER TABLE `complaints` ADD CONSTRAINT `fk_complaints_assigned_to` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL',
    'SELECT "FK fk_complaints_assigned_to already exists" as message'
);
PREPARE stmt FROM @sql_fk_assigned;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign keys to deletion_requests table
SET @fk_del_visitor_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'deletion_requests'
    AND CONSTRAINT_NAME = 'fk_deletion_requests_visitor'
);

SET @sql_fk_del_visitor = IF(
    @fk_del_visitor_exists = 0,
    'ALTER TABLE `deletion_requests` ADD CONSTRAINT `fk_deletion_requests_visitor` FOREIGN KEY (`visitor_id`) REFERENCES `visitors` (`id`) ON DELETE CASCADE',
    'SELECT "FK fk_deletion_requests_visitor already exists" as message'
);
PREPARE stmt FROM @sql_fk_del_visitor;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign keys to deletion_audit_logs table
SET @fk_audit_del_req_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'deletion_audit_logs'
    AND CONSTRAINT_NAME = 'fk_audit_logs_deletion_request'
);

SET @sql_fk_audit_del_req = IF(
    @fk_audit_del_req_exists = 0,
    'ALTER TABLE `deletion_audit_logs` ADD CONSTRAINT `fk_audit_logs_deletion_request` FOREIGN KEY (`deletion_request_id`) REFERENCES `deletion_requests` (`id`) ON DELETE CASCADE',
    'SELECT "FK fk_audit_logs_deletion_request already exists" as message'
);
PREPARE stmt FROM @sql_fk_audit_del_req;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '✅ Foreign key constraints added successfully!' as status;

-- =====================================================
-- 5. CREATE ENHANCED VIEWS
-- =====================================================

SELECT '👁️ Creating enhanced views...' as status;

-- Enhanced Visitor Management View
CREATE OR REPLACE VIEW `visitor_management_view` AS
SELECT 
  v.*,
  u.name as input_by_name,
  u.role as input_by_role,
  u.email as input_by_email,
  u.avatar_url as input_by_avatar,
  checkout_u.name as checkout_by_name,
  checkout_u.role as checkout_by_role,
  checkout_u.email as checkout_by_email,
  deleted_u.name as deleted_by_name,
  
  -- Latest deletion request info
  dr.id as deletion_request_id,
  dr.status as deletion_status,
  dr.reason as deletion_reason,
  dr.created_at as deletion_requested_at,
  dr_req.name as deletion_requested_by_name,
  dr_req.role as deletion_requested_by_role,
  
  -- Computed status for easy filtering
  CASE 
    WHEN v.deleted_at IS NOT NULL THEN 'deleted'
    WHEN dr.status = 'pending' THEN 'pending_delete'
    WHEN v.checkout_time IS NULL THEN 'checked_in'
    ELSE 'checked_out'
  END as computed_status,
  
  -- Priority for admin sorting
  CASE 
    WHEN dr.status = 'pending' THEN 1
    WHEN v.checkout_time IS NULL THEN 2
    WHEN v.deleted_at IS NULL THEN 3
    ELSE 4
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
LEFT JOIN users dr_req ON dr.requested_by = dr_req.id;

-- Visitor Management Statistics View
CREATE OR REPLACE VIEW `visitor_management_stats` AS
SELECT 
  (SELECT COUNT(*) FROM visitors) as total_visitors,
  (SELECT COUNT(*) FROM visitors WHERE deleted_at IS NULL) as active_visitors,
  (SELECT COUNT(*) FROM visitors WHERE deleted_at IS NOT NULL) as deleted_visitors,
  (SELECT COUNT(*) FROM deletion_requests WHERE status = 'pending') as pending_deletion_requests,
  (SELECT COUNT(*) FROM visitors WHERE DATE(check_in_time) = CURDATE()) as today_visitors,
  (SELECT COUNT(*) FROM visitors WHERE checkout_time IS NULL AND deleted_at IS NULL) as currently_checked_in,
  (SELECT COUNT(*) FROM complaints WHERE status = 'open') as open_complaints,
  (SELECT COUNT(*) FROM lost_items WHERE status IN ('lost', 'found')) as active_lost_items;

-- Comprehensive Dashboard View
CREATE OR REPLACE VIEW `dashboard_overview` AS
SELECT 
  -- Visitor stats
  (SELECT COUNT(*) FROM visitors WHERE DATE(check_in_time) = CURDATE()) as today_visitors,
  (SELECT COUNT(*) FROM visitors WHERE checkout_time IS NULL AND deleted_at IS NULL) as currently_checked_in,
  (SELECT COUNT(*) FROM visitors WHERE DATE(check_in_time) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)) as week_visitors,
  
  -- Complaint stats
  (SELECT COUNT(*) FROM complaints WHERE status = 'open') as open_complaints,
  (SELECT COUNT(*) FROM complaints WHERE DATE(created_at) = CURDATE()) as today_complaints,
  
  -- Lost items stats
  (SELECT COUNT(*) FROM lost_items WHERE status = 'lost') as lost_items,
  (SELECT COUNT(*) FROM lost_items WHERE status = 'found') as found_items,
  (SELECT COUNT(*) FROM lost_items WHERE DATE(created_at) = CURDATE()) as today_lost_items,
  
  -- System stats
  (SELECT COUNT(*) FROM deletion_requests WHERE status = 'pending') as pending_deletions,
  (SELECT COUNT(*) FROM users WHERE is_active = 1) as active_users;

SELECT '✅ Enhanced views created successfully!' as status;

-- =====================================================
-- 6. INSERT DEFAULT DATA
-- =====================================================

SELECT '📝 Inserting default configuration data...' as status;

-- Insert default menu items for different roles
INSERT IGNORE INTO `menu_config` (`role`, `menu_items`) VALUES
('Admin', JSON_ARRAY(
    JSON_OBJECT('name', 'Dashboard', 'path', '/app/dashboard', 'icon', 'dashboard'),
    JSON_OBJECT('name', 'Visitors', 'path', '/app/visitors', 'icon', 'people'),
    JSON_OBJECT('name', 'User Management', 'path', '/app/user-management', 'icon', 'user-gear'),
    JSON_OBJECT('name', 'Complaints', 'path', '/app/complaint-management', 'icon', 'exclamation-triangle'),
    JSON_OBJECT('name', 'Lost Items', 'path', '/app/lost-items', 'icon', 'box'),
    JSON_OBJECT('name', 'Configuration', 'path', '/app/configuration-management', 'icon', 'cog'),
    JSON_OBJECT('name', 'Reports', 'path', '/app/reports', 'icon', 'chart-bar')
)),
('Manager', JSON_ARRAY(
    JSON_OBJECT('name', 'Dashboard', 'path', '/app/dashboard', 'icon', 'dashboard'),
    JSON_OBJECT('name', 'Visitors', 'path', '/app/visitors', 'icon', 'people'),
    JSON_OBJECT('name', 'Complaints', 'path', '/app/complaint-management', 'icon', 'exclamation-triangle'),
    JSON_OBJECT('name', 'Lost Items', 'path', '/app/lost-items', 'icon', 'box'),
    JSON_OBJECT('name', 'Reports', 'path', '/app/reports', 'icon', 'chart-bar')
)),
('Receptionist', JSON_ARRAY(
    JSON_OBJECT('name', 'Dashboard', 'path', '/app/dashboard', 'icon', 'dashboard'),
    JSON_OBJECT('name', 'Check In', 'path', '/app/check-in', 'icon', 'sign-in-alt'),
    JSON_OBJECT('name', 'Visitors', 'path', '/app/visitors', 'icon', 'people'),
    JSON_OBJECT('name', 'Lost Items', 'path', '/app/lost-items', 'icon', 'box')
));

-- Update user roles to match production
UPDATE `users` SET `role` = 'Admin' WHERE `role` = 'admin';
UPDATE `users` SET `role` = 'Manager' WHERE `role` = 'manager';  
UPDATE `users` SET `role` = 'Receptionist' WHERE `role` = 'receptionist';

-- Ensure admin user exists
INSERT IGNORE INTO `users` (`id`, `name`, `email`, `password`, `role`, `is_active`, `created_at`)
VALUES (1, 'System Admin', 'admin@ult-fpeb.upi.edu', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 1, NOW())
ON DUPLICATE KEY UPDATE `role` = 'Admin', `is_active` = 1;

SELECT '✅ Default configuration data inserted!' as status;

-- =====================================================
-- 7. DATA CONSISTENCY UPDATES
-- =====================================================

SELECT '🔄 Updating data consistency...' as status;

-- Update existing visitor records with proper timestamps
UPDATE `visitors` 
SET `updated_at` = COALESCE(`updated_at`, `created_at`, `check_in_time`, NOW()) 
WHERE `updated_at` IS NULL;

-- Update users with active status
UPDATE `users` 
SET `is_active` = 1 
WHERE `is_active` IS NULL;

-- Convert character sets to utf8mb4 for emoji support
ALTER TABLE `visitors` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `users` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `complaints` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `feedbacks` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `lost_items` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SELECT '✅ Data consistency updated!' as status;

-- =====================================================
-- 8. FINAL VERIFICATION
-- =====================================================

SELECT '🔍 Running final verification...' as status;

-- Verify all critical tables exist
SELECT 
    CASE 
        WHEN COUNT(*) >= 15 THEN '✅ All critical tables exist'
        ELSE CONCAT('❌ Missing tables: ', (15 - COUNT(*)), ' tables missing')
    END as table_verification
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME IN (
    'users', 'visitors', 'complaints', 'feedbacks', 'lost_items',
    'deletion_requests', 'deletion_audit_logs', 'configuration_categories',
    'configuration_options', 'configuration_groups', 'complaint_categories',
    'complaint_fields', 'complaint_responses', 'menu_config', 'menu_items'
);

-- Verify critical columns exist in visitors table
SELECT 
    CASE 
        WHEN COUNT(*) >= 5 THEN '✅ All critical visitor columns exist'
        ELSE CONCAT('❌ Missing visitor columns: ', (5 - COUNT(*)), ' columns missing')
    END as visitor_columns_verification
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'visitors'
AND COLUMN_NAME IN ('checkout_by_user_id', 'checkout_by_name', 'deleted_by', 'document_details', 'updated_at');

-- Verify indexes exist
SELECT 
    CASE 
        WHEN COUNT(*) >= 5 THEN '✅ Performance indexes created'
        ELSE CONCAT('⚠️ Only ', COUNT(*), ' performance indexes found')
    END as index_verification
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
AND INDEX_NAME IN ('idx_visitors_checkout_by_user', 'idx_complaints_status', 'idx_feedbacks_rating', 'idx_config_categories_key', 'idx_lost_items_status');

-- Verify views exist
SELECT 
    CASE 
        WHEN COUNT(*) >= 3 THEN '✅ All enhanced views created'
        ELSE CONCAT('❌ Missing views: ', (3 - COUNT(*)), ' views missing')
    END as view_verification
FROM INFORMATION_SCHEMA.VIEWS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME IN ('visitor_management_view', 'visitor_management_stats', 'dashboard_overview');

-- Final status summary
SELECT '🎉 COMPREHENSIVE DATABASE MIGRATION COMPLETED!' as status;
SELECT 
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()) as total_tables,
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.VIEWS WHERE TABLE_SCHEMA = DATABASE()) as total_views,
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE()) as total_indexes,
    NOW() as migration_completed_at;

SELECT '📋 Next Steps:' as instructions;
SELECT '1. Restart your Node.js application' as step1;
SELECT '2. Test all functionality thoroughly' as step2;
SELECT '3. Monitor application logs for any errors' as step3;
SELECT '4. Verify upload files are accessible' as step4;
SELECT '5. Test visitor management, complaints, and lost items features' as step5;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

SELECT '✨ Database is now synchronized with production structure!' as final_message;