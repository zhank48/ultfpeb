-- Add missing columns to deletion_requests table

-- Check if columns exist and add them if they don't
SET @dbname = DATABASE();

-- Add rejected_by column if it doesn't exist
SET @sql = CONCAT('SELECT COUNT(*) INTO @col_exists FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = ''', @dbname, ''' 
    AND TABLE_NAME = ''deletion_requests'' 
    AND COLUMN_NAME = ''rejected_by''');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE deletion_requests ADD COLUMN rejected_by INT NULL AFTER approved_at',
    'SELECT ''Column rejected_by already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add rejected_at column if it doesn't exist
SET @sql = CONCAT('SELECT COUNT(*) INTO @col_exists FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = ''', @dbname, ''' 
    AND TABLE_NAME = ''deletion_requests'' 
    AND COLUMN_NAME = ''rejected_at''');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE deletion_requests ADD COLUMN rejected_at TIMESTAMP NULL AFTER rejected_by',
    'SELECT ''Column rejected_at already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add deleted_at column if it doesn't exist
SET @sql = CONCAT('SELECT COUNT(*) INTO @col_exists FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = ''', @dbname, ''' 
    AND TABLE_NAME = ''deletion_requests'' 
    AND COLUMN_NAME = ''deleted_at''');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE deletion_requests ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER updated_at',
    'SELECT ''Column deleted_at already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key for rejected_by if it doesn't exist
SET @sql = CONCAT('SELECT COUNT(*) INTO @fk_exists FROM information_schema.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = ''', @dbname, ''' 
    AND TABLE_NAME = ''deletion_requests'' 
    AND CONSTRAINT_NAME = ''deletion_requests_ibfk_4''');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(@fk_exists = 0, 
    'ALTER TABLE deletion_requests ADD CONSTRAINT deletion_requests_ibfk_4 FOREIGN KEY (rejected_by) REFERENCES users(id) ON DELETE SET NULL',
    'SELECT ''Foreign key for rejected_by already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index for deleted_at if it doesn't exist
SET @sql = CONCAT('SELECT COUNT(*) INTO @idx_exists FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = ''', @dbname, ''' 
    AND TABLE_NAME = ''deletion_requests'' 
    AND INDEX_NAME = ''idx_deleted_at''');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(@idx_exists = 0, 
    'ALTER TABLE deletion_requests ADD INDEX idx_deleted_at (deleted_at)',
    'SELECT ''Index idx_deleted_at already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Deletion requests table migration completed successfully!' AS result;