-- =====================================================
-- MYSQL COMPATIBLE DATABASE FIX
-- Compatible dengan MySQL versi lama (tidak perlu IF NOT EXISTS)
-- =====================================================

-- Add checkout_by_name column (ignore error if exists)
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'visitors' 
     AND COLUMN_NAME = 'checkout_by_name') = 0,
    'ALTER TABLE visitors ADD COLUMN checkout_by_name VARCHAR(255) NULL COMMENT "Name of checkout operator"',
    'SELECT "Column checkout_by_name already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add checkout_by_role column (ignore error if exists)  
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'visitors' 
     AND COLUMN_NAME = 'checkout_by_role') = 0,
    'ALTER TABLE visitors ADD COLUMN checkout_by_role VARCHAR(50) NULL COMMENT "Role of checkout operator"',
    'SELECT "Column checkout_by_role already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add checkout_by_avatar column (ignore error if exists)
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'visitors' 
     AND COLUMN_NAME = 'checkout_by_avatar') = 0,
    'ALTER TABLE visitors ADD COLUMN checkout_by_avatar VARCHAR(255) NULL COMMENT "Avatar URL of checkout operator"',
    'SELECT "Column checkout_by_avatar already exists" as message'
));  
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add checkout_by_user_id column (ignore error if exists)
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'visitors' 
     AND COLUMN_NAME = 'checkout_by_user_id') = 0,
    'ALTER TABLE visitors ADD COLUMN checkout_by_user_id INT NULL COMMENT "User ID of checkout operator"',
    'SELECT "Column checkout_by_user_id already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add checkout_by_email column (ignore error if exists)
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'visitors' 
     AND COLUMN_NAME = 'checkout_by_email') = 0,
    'ALTER TABLE visitors ADD COLUMN checkout_by_email VARCHAR(255) NULL COMMENT "Email of checkout operator"',
    'SELECT "Column checkout_by_email already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create visitor_edit_history table (ignore error if exists)
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'visitor_edit_history') = 0,
    'CREATE TABLE visitor_edit_history (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT="Visitor edit history tracking"',
    'SELECT "Table visitor_edit_history already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify fixes
SELECT 'Database fixes completed successfully!' as status;

SELECT CONCAT('Found ', COUNT(*), ' checkout columns') as checkout_columns_status
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'visitors' 
AND COLUMN_NAME IN ('checkout_by_name', 'checkout_by_role', 'checkout_by_avatar', 'checkout_by_user_id', 'checkout_by_email');

SELECT CASE 
    WHEN COUNT(*) > 0 THEN 'visitor_edit_history table EXISTS' 
    ELSE 'visitor_edit_history table MISSING' 
END as edit_history_status
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'visitor_edit_history';