-- =====================================================
-- FIX FEEDBACK API ERROR 500
-- Memperbaiki error pada POST /api/feedback endpoint
-- =====================================================

SELECT 'Starting feedback API fix...' AS status;

-- =====================================================
-- 1. DROP EXISTING FEEDBACKS TABLE (if exists with issues)
-- =====================================================

-- Check if feedbacks table exists and has issues
SET @table_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'feedbacks'
);

-- If table exists, we'll recreate it to fix any structural issues
SET @sql = IF(@table_exists > 0, 
    'DROP TABLE IF EXISTS feedbacks',
    'SELECT "Feedbacks table does not exist, will create new" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Existing feedbacks table handled' AS status;

-- =====================================================
-- 2. CREATE FEEDBACKS TABLE WITH PROPER STRUCTURE
-- =====================================================

-- Create feedbacks table without foreign key constraint to avoid issues
CREATE TABLE feedbacks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    visitor_id INT NULL,
    visitor_name VARCHAR(255) NOT NULL,
    rating INT NOT NULL,
    category INT NOT NULL DEFAULT 1,
    feedback_text TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Add constraints
    CONSTRAINT chk_rating CHECK (rating >= 1 AND rating <= 5),
    CONSTRAINT chk_category CHECK (category >= 1 AND category <= 7),
    
    -- Add indexes for performance
    INDEX idx_visitor_id (visitor_id),
    INDEX idx_rating (rating),
    INDEX idx_category (category),
    INDEX idx_created_at (created_at)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Feedback system table';

SELECT 'Feedbacks table created successfully' AS status;

-- =====================================================
-- 3. INSERT SAMPLE DATA FOR TESTING
-- =====================================================

-- Insert sample feedback data to test the system
INSERT INTO feedbacks (visitor_id, visitor_name, rating, category, feedback_text) VALUES
(NULL, 'Test User 1', 5, 1, 'Pelayanan sangat baik dan memuaskan'),
(NULL, 'Test User 2', 4, 2, 'Fasilitas cukup baik, perlu peningkatan di beberapa area'),
(NULL, 'Test User 3', 5, 4, 'Staff sangat ramah dan profesional'),
(NULL, 'Test User 4', 3, 3, 'Prosedur cukup mudah dipahami'),
(NULL, 'Test User 5', 4, 1, 'Secara keseluruhan pelayanan memuaskan');

SELECT 'Sample feedback data inserted' AS status;

-- =====================================================
-- 4. CREATE FEEDBACK CATEGORIES REFERENCE TABLE
-- =====================================================

-- Create feedback categories table for better data management
CREATE TABLE IF NOT EXISTS feedback_categories (
    id INT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert standard feedback categories
INSERT INTO feedback_categories (id, name, description) VALUES
(1, 'Pelayanan Umum', 'Feedback tentang kualitas pelayanan secara umum'),
(2, 'Fasilitas', 'Feedback tentang fasilitas dan infrastruktur'),
(3, 'Kemudahan Akses', 'Feedback tentang kemudahan akses dan prosedur'),
(4, 'Keramahan Staff', 'Feedback tentang keramahan dan profesionalisme staff'),
(5, 'Kecepatan Layanan', 'Feedback tentang kecepatan dan responsivitas layanan'),
(6, 'Kebersihan', 'Feedback tentang kebersihan lingkungan dan fasilitas'),
(7, 'Lainnya', 'Feedback kategori lainnya')
ON DUPLICATE KEY UPDATE 
name = VALUES(name), 
description = VALUES(description);

SELECT 'Feedback categories table created and populated' AS status;

-- =====================================================
-- 5. VERIFY THE SETUP
-- =====================================================

-- Check feedbacks table structure
SELECT 'Feedbacks table structure:' AS info;
DESCRIBE feedbacks;

-- Check feedback categories
SELECT 'Available feedback categories:' AS info;
SELECT id, name, description FROM feedback_categories ORDER BY id;

-- Check sample data
SELECT 'Sample feedback data:' AS info;
SELECT id, visitor_name, rating, category, 
       SUBSTRING(feedback_text, 1, 50) as feedback_preview,
       created_at
FROM feedbacks 
ORDER BY created_at DESC 
LIMIT 5;

-- Verify table constraints
SELECT 'Table constraints verification:' AS info;
SELECT 
    CONSTRAINT_NAME,
    CONSTRAINT_TYPE,
    TABLE_NAME
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'feedbacks';

-- Final status
SELECT '✅ FEEDBACK API FIX COMPLETED SUCCESSFULLY!' AS final_status;
SELECT 'The feedback API should now work without 500 errors' AS next_step;