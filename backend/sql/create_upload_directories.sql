-- =====================================================
-- CREATE UPLOAD DIRECTORIES - SQL SCRIPT
-- Script untuk memastikan referensi upload directories dalam database
-- =====================================================

SELECT 'Creating upload directories reference in database...' AS status;

-- =====================================================
-- 1. CREATE UPLOAD_SETTINGS TABLE
-- =====================================================

-- Table untuk menyimpan konfigurasi upload system
CREATE TABLE IF NOT EXISTS upload_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(255) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Upload system configuration';

-- Insert default upload settings
INSERT INTO upload_settings (setting_key, setting_value, description) VALUES
('upload_base_path', '/uploads', 'Base path for all uploaded files'),
('max_file_size', '10485760', 'Maximum file size in bytes (10MB)'),
('allowed_image_types', 'jpg,jpeg,png,gif,webp', 'Allowed image file extensions'),
('profile_image_path', '/uploads/profiles', 'Path for user profile images'),
('visitor_photo_path', '/uploads/photos', 'Path for visitor photos'),
('signature_path', '/uploads/signatures', 'Path for visitor signatures'),
('complaint_photo_path', '/uploads/complaints', 'Path for complaint photos'),
('document_path', '/uploads/document_requests', 'Path for document request files'),
('report_path', '/uploads/reports', 'Path for generated reports'),
('lost_item_path', '/uploads/lost-items', 'Path for lost item files')
ON DUPLICATE KEY UPDATE 
setting_value = VALUES(setting_value), 
description = VALUES(description);

SELECT 'Upload settings configured' AS status;

-- =====================================================
-- 2. CREATE FILE_UPLOADS TABLE
-- =====================================================

-- Table untuk tracking semua file yang diupload
CREATE TABLE IF NOT EXISTS file_uploads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT NOT NULL DEFAULT 0,
    mime_type VARCHAR(100) NULL,
    upload_type ENUM('profile', 'photo', 'signature', 'complaint', 'document', 'report', 'lost_item') NOT NULL,
    uploaded_by INT NULL,
    related_id INT NULL COMMENT 'ID of related record (visitor_id, user_id, etc)',
    status ENUM('active', 'deleted', 'archived') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_stored_filename (stored_filename),
    INDEX idx_upload_type (upload_type),
    INDEX idx_uploaded_by (uploaded_by),
    INDEX idx_related_id (related_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='File upload tracking';

SELECT 'File uploads tracking table created' AS status;

-- =====================================================
-- 3. UPDATE USERS TABLE WITH PROPER AVATAR FIELDS
-- =====================================================

-- Ensure users table has proper avatar fields
-- Add avatar_url column if not exists
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'users' 
    AND COLUMN_NAME = 'avatar_url'
);

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500) NULL COMMENT "URL to user avatar image"',
    'SELECT "avatar_url column already exists in users table" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add photo_url column if not exists
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'users' 
    AND COLUMN_NAME = 'photo_url'
);

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE users ADD COLUMN photo_url VARCHAR(500) NULL COMMENT "URL to user photo"',
    'SELECT "photo_url column already exists in users table" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Users table avatar fields verified' AS status;

-- =====================================================
-- 4. CLEANUP ORPHANED FILE REFERENCES
-- =====================================================

-- Create stored procedure to cleanup orphaned files
DROP PROCEDURE IF EXISTS CleanupOrphanedFiles;

DELIMITER //
CREATE PROCEDURE CleanupOrphanedFiles()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE file_path VARCHAR(500);
    
    -- Cursor untuk files yang tidak ada record terkait
    DECLARE orphan_cursor CURSOR FOR 
        SELECT file_path FROM file_uploads 
        WHERE status = 'active' 
        AND (
            (upload_type = 'profile' AND uploaded_by NOT IN (SELECT id FROM users))
            OR (upload_type = 'photo' AND related_id NOT IN (SELECT id FROM visitors))
            OR (upload_type = 'signature' AND related_id NOT IN (SELECT id FROM visitors))
        );
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN orphan_cursor;
    
    read_loop: LOOP
        FETCH orphan_cursor INTO file_path;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- Mark orphaned files as deleted
        UPDATE file_uploads 
        SET status = 'deleted', updated_at = NOW() 
        WHERE file_path = file_path AND status = 'active';
        
    END LOOP;
    
    CLOSE orphan_cursor;
    
    SELECT CONCAT('Cleanup completed. Marked orphaned files as deleted.') as result;
END //
DELIMITER ;

SELECT 'File cleanup procedure created' AS status;

-- =====================================================
-- 5. CREATE INDEXES FOR BETTER PERFORMANCE
-- =====================================================

-- Add indexes to visitors table for file-related queries
ALTER TABLE visitors ADD INDEX IF NOT EXISTS idx_photo_url (photo_url(100));
ALTER TABLE visitors ADD INDEX IF NOT EXISTS idx_signature_url (signature_url(100));

-- Add indexes to users table for avatar queries
ALTER TABLE users ADD INDEX IF NOT EXISTS idx_avatar_url (avatar_url(100));
ALTER TABLE users ADD INDEX IF NOT EXISTS idx_photo_url (photo_url(100));

SELECT 'Performance indexes added' AS status;

-- =====================================================
-- 6. VERIFICATION QUERIES
-- =====================================================

-- Show upload settings
SELECT 'Current upload settings:' AS info;
SELECT setting_key, setting_value, description 
FROM upload_settings 
ORDER BY setting_key;

-- Show file upload statistics
SELECT 'File upload statistics:' AS info;
SELECT 
    upload_type,
    status,
    COUNT(*) as file_count,
    SUM(file_size) as total_size_bytes,
    ROUND(SUM(file_size) / 1024 / 1024, 2) as total_size_mb
FROM file_uploads 
GROUP BY upload_type, status
ORDER BY upload_type, status;

-- Check for users with avatars
SELECT 'Users with avatar files:' AS info;
SELECT 
    COUNT(*) as users_with_avatars
FROM users 
WHERE avatar_url IS NOT NULL OR photo_url IS NOT NULL;

-- Check for visitors with photos
SELECT 'Visitors with photo files:' AS info;
SELECT 
    COUNT(*) as visitors_with_photos
FROM visitors 
WHERE photo_url IS NOT NULL OR signature_url IS NOT NULL;

SELECT '✅ UPLOAD DIRECTORIES AND DATABASE SETUP COMPLETED!' AS final_status;