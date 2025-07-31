-- =====================================================
-- PRODUCTION DATABASE FIX SCRIPT
-- Script konsolidasi untuk memperbaiki semua masalah database
-- yang menyebabkan error 500, 401, dan 403
-- =====================================================

-- Set SQL mode untuk kompatibilitas
SET SQL_MODE = 'ALLOW_INVALID_DATES';

SELECT '🔧 Starting Production Database Fix...' as status;

-- =====================================================
-- 1. FIX VISITORS TABLE - CHECKOUT FIELDS
-- =====================================================

SELECT '📝 Fixing visitors table checkout fields...' as status;

-- Tambahkan kolom checkout_by_name jika belum ada
SET @exist_checkout_name = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'visitors'
    AND COLUMN_NAME = 'checkout_by_name'
);

SET @sql_checkout_name = IF(
    @exist_checkout_name = 0,
    'ALTER TABLE visitors ADD COLUMN checkout_by_name VARCHAR(255) NULL COMMENT "Name of checkout operator"',
    'SELECT "✅ Column checkout_by_name already exists" as message'
);
PREPARE stmt FROM @sql_checkout_name;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Tambahkan kolom checkout_by_role jika belum ada
SET @exist_checkout_role = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'visitors'
    AND COLUMN_NAME = 'checkout_by_role'
);

SET @sql_checkout_role = IF(
    @exist_checkout_role = 0,
    'ALTER TABLE visitors ADD COLUMN checkout_by_role VARCHAR(50) NULL COMMENT "Role of checkout operator"',
    'SELECT "✅ Column checkout_by_role already exists" as message'
);
PREPARE stmt FROM @sql_checkout_role;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Tambahkan kolom checkout_by_avatar jika belum ada
SET @exist_checkout_avatar = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'visitors'
    AND COLUMN_NAME = 'checkout_by_avatar'
);

SET @sql_checkout_avatar = IF(
    @exist_checkout_avatar = 0,
    'ALTER TABLE visitors ADD COLUMN checkout_by_avatar VARCHAR(255) NULL COMMENT "Avatar URL of checkout operator"',
    'SELECT "✅ Column checkout_by_avatar already exists" as message'
);
PREPARE stmt FROM @sql_checkout_avatar;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Tambahkan kolom checkout_by_user_id jika belum ada
SET @exist_checkout_user_id = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'visitors'
    AND COLUMN_NAME = 'checkout_by_user_id'
);

SET @sql_checkout_user_id = IF(
    @exist_checkout_user_id = 0,
    'ALTER TABLE visitors ADD COLUMN checkout_by_user_id INT NULL COMMENT "User ID of checkout operator"',
    'SELECT "✅ Column checkout_by_user_id already exists" as message'
);
PREPARE stmt FROM @sql_checkout_user_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Tambahkan kolom checkout_by_email jika belum ada
SET @exist_checkout_email = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'visitors'
    AND COLUMN_NAME = 'checkout_by_email'
);

SET @sql_checkout_email = IF(
    @exist_checkout_email = 0,
    'ALTER TABLE visitors ADD COLUMN checkout_by_email VARCHAR(255) NULL COMMENT "Email of checkout operator"',
    'SELECT "✅ Column checkout_by_email already exists" as message'
);
PREPARE stmt FROM @sql_checkout_email;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '✅ Visitors table checkout fields fixed!' as status;

-- =====================================================
-- 2. CREATE VISITOR_EDIT_HISTORY TABLE
-- =====================================================

SELECT '📋 Creating visitor_edit_history table...' as status;

-- Cek apakah tabel visitor_edit_history sudah ada
SET @table_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'visitor_edit_history'
);

-- Buat tabel visitor_edit_history jika belum ada
SET @sql_create_table = IF(
    @table_exists = 0,
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT="Visitor edit history tracking"',
    'SELECT "✅ Table visitor_edit_history already exists" as message'
);

PREPARE stmt FROM @sql_create_table;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '✅ Visitor edit history table created!' as status;

-- =====================================================
-- 3. VERIFY ALL NECESSARY COLUMNS EXIST
-- =====================================================

SELECT '🔍 Verifying all necessary columns exist...' as status;

-- Verifikasi kolom-kolom penting di tabel visitors
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ checkout_by_name exists'
        ELSE '❌ checkout_by_name missing'
    END as checkout_name_status
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'visitors'
AND COLUMN_NAME = 'checkout_by_name';

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ checkout_by_role exists'
        ELSE '❌ checkout_by_role missing'
    END as checkout_role_status
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'visitors'
AND COLUMN_NAME = 'checkout_by_role';

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ checkout_by_avatar exists'
        ELSE '❌ checkout_by_avatar missing'
    END as checkout_avatar_status
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'visitors'
AND COLUMN_NAME = 'checkout_by_avatar';

-- Verifikasi tabel visitor_edit_history
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ visitor_edit_history table exists'
        ELSE '❌ visitor_edit_history table missing'
    END as edit_history_status
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'visitor_edit_history';

-- =====================================================
-- 4. FINAL STATUS
-- =====================================================

SELECT '🎉 Production Database Fix Completed!' as status;
SELECT 'Next Steps:' as instructions;
SELECT '1. Restart your Node.js application' as step1;
SELECT '2. Test visitor checkout functionality' as step2;
SELECT '3. Test login and password change functionality' as step3;
SELECT '4. Monitor error logs for any remaining issues' as step4;

-- Tampilkan ringkasan struktur tabel visitors
SELECT '📊 Current visitors table structure:' as info;
SHOW COLUMNS FROM visitors LIKE '%checkout%';

-- Tampilkan ringkasan tabel visitor_edit_history
SELECT '📊 Visitor edit history table structure:' as info;
DESCRIBE visitor_edit_history;