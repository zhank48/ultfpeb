-- =====================================================
-- SIMPLE PRODUCTION DATABASE FIX
-- Script sederhana tanpa prepared statements dinamis
-- =====================================================

-- Add missing checkout columns to visitors table
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS checkout_by_name VARCHAR(255) NULL COMMENT 'Name of checkout operator';
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS checkout_by_role VARCHAR(50) NULL COMMENT 'Role of checkout operator';  
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS checkout_by_avatar VARCHAR(255) NULL COMMENT 'Avatar URL of checkout operator';
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS checkout_by_user_id INT NULL COMMENT 'User ID of checkout operator';
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS checkout_by_email VARCHAR(255) NULL COMMENT 'Email of checkout operator';

-- Create visitor_edit_history table
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
    INDEX idx_visitor_id (visitor_id),
    INDEX idx_user_id (user_id),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Visitor edit history tracking';

-- Verify the fixes
SELECT 'Database fix completed!' as status;
SHOW COLUMNS FROM visitors LIKE '%checkout%';
DESCRIBE visitor_edit_history;