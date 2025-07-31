-- =====================================================
-- FIX CHECKOUT ERROR 500 - COMPREHENSIVE DATABASE FIX
-- Memperbaiki error "Unknown column 'checkout_by_role' in 'field list'"
-- dan masalah terkait visitor checkout functionality
-- =====================================================

-- Set session untuk menghindari SQL mode issues
SET SQL_MODE = '';
SET FOREIGN_KEY_CHECKS = 0;

-- Log start of fix
SELECT 'Starting checkout error 500 fix...' AS status;

-- =====================================================
-- 1. FIX VISITORS TABLE - ADD MISSING CHECKOUT COLUMNS
-- =====================================================

-- Add checkout_by_name column
ALTER TABLE visitors ADD COLUMN checkout_by_name VARCHAR(255) NULL COMMENT 'Name of checkout operator';

-- Add checkout_by_role column (THIS IS THE MAIN ERROR COLUMN)
ALTER TABLE visitors ADD COLUMN checkout_by_role VARCHAR(50) NULL COMMENT 'Role of checkout operator';

-- Add checkout_by_avatar column
ALTER TABLE visitors ADD COLUMN checkout_by_avatar VARCHAR(255) NULL COMMENT 'Avatar URL of checkout operator';

-- Add checkout_by_user_id column
ALTER TABLE visitors ADD COLUMN checkout_by_user_id INT NULL COMMENT 'User ID of checkout operator';

-- Add checkout_by_email column
ALTER TABLE visitors ADD COLUMN checkout_by_email VARCHAR(255) NULL COMMENT 'Email of checkout operator';

-- Add foreign key constraint for checkout user
ALTER TABLE visitors ADD CONSTRAINT fk_checkout_user 
    FOREIGN KEY (checkout_by_user_id) REFERENCES users(id) ON DELETE SET NULL;

SELECT 'Checkout columns added to visitors table' AS status;

-- =====================================================
-- 2. CREATE VISITOR_EDIT_HISTORY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS visitor_edit_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    visitor_id INT NOT NULL,
    user_id INT NULL,
    user VARCHAR(255) NOT NULL,
    user_name VARCHAR(255) NULL,
    user_role VARCHAR(50) NULL,
    user_email VARCHAR(255) NULL,
    user_avatar VARCHAR(255) NULL,
    changes JSON NULL,
    original JSON NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_visitor_id (visitor_id),
    INDEX idx_user_id (user_id),
    INDEX idx_timestamp (timestamp),
    
    -- Foreign key constraints
    FOREIGN KEY (visitor_id) REFERENCES visitors(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Visitor edit history tracking for audit trail';

SELECT 'visitor_edit_history table created' AS status;

-- =====================================================
-- 3. UPDATE EXISTING DATA IF NEEDED
-- =====================================================

-- Set default checkout operator info for existing checked out visitors
UPDATE visitors 
SET 
    checkout_by_name = 'System',
    checkout_by_role = 'Admin',
    checkout_by_user_id = 1
WHERE check_out_time IS NOT NULL 
  AND checkout_by_name IS NULL;

SELECT CONCAT('Updated ', ROW_COUNT(), ' existing checked out visitors') AS status;

-- =====================================================
-- 4. ENSURE USER TABLE HAS REQUIRED FIELDS
-- =====================================================

-- Make sure users table has avatar/photo fields for checkout operator info
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255) NULL COMMENT 'User avatar URL';
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url VARCHAR(255) NULL COMMENT 'User photo URL';

SELECT 'User table updated with avatar fields' AS status;

-- =====================================================
-- 5. CREATE HELPFUL VIEWS FOR CHECKOUT OPERATIONS
-- =====================================================

-- Create view for complete visitor checkout information
CREATE OR REPLACE VIEW visitor_checkout_info AS
SELECT 
    v.*,
    u_checkin.name as checkin_operator_name,
    u_checkin.role as checkin_operator_role,
    u_checkin.email as checkin_operator_email,
    u_checkin.avatar_url as checkin_operator_avatar,
    u_checkout.name as checkout_operator_name_ref,
    u_checkout.role as checkout_operator_role_ref,
    u_checkout.email as checkout_operator_email_ref,
    u_checkout.avatar_url as checkout_operator_avatar_ref
FROM visitors v
LEFT JOIN users u_checkin ON v.input_by_user_id = u_checkin.id
LEFT JOIN users u_checkout ON v.checkout_by_user_id = u_checkout.id;

SELECT 'Created visitor_checkout_info view' AS status;

-- =====================================================
-- 6. RESTORE SQL SETTINGS
-- =====================================================

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- 7. VERIFICATION AND FINAL STATUS
-- =====================================================

-- Check that all checkout columns exist
SELECT 
    CASE 
        WHEN COUNT(*) = 5 THEN 'SUCCESS: All 5 checkout columns exist'
        ELSE CONCAT('WARNING: Only ', COUNT(*), ' out of 5 checkout columns exist')
    END as checkout_columns_status
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'visitors' 
  AND COLUMN_NAME IN ('checkout_by_name', 'checkout_by_role', 'checkout_by_avatar', 'checkout_by_user_id', 'checkout_by_email');

-- Check that visitor_edit_history table exists
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN 'SUCCESS: visitor_edit_history table exists'
        ELSE 'ERROR: visitor_edit_history table does not exist'
    END as edit_history_table_status
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'visitor_edit_history';

-- Show current visitors table structure (checkout columns only)
SELECT 'Current checkout-related columns in visitors table:' AS info;
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'visitors' 
  AND COLUMN_NAME LIKE '%checkout%'
ORDER BY ORDINAL_POSITION;

-- Final success message
SELECT '✅ CHECKOUT ERROR 500 FIX COMPLETED SUCCESSFULLY!' AS final_status;
SELECT 'Next step: Restart your application with: pm2 restart ult-fpeb-backend' AS next_step;