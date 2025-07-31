-- =====================================================
-- Fix Production Database Checkout Fields
-- Menambahkan kolom yang hilang untuk checkout operator
-- =====================================================

-- Cek dan tambahkan kolom checkout_by_role jika belum ada
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
    'SELECT "Column checkout_by_role already exists" as message'
);
PREPARE stmt FROM @sql_checkout_role;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Cek dan tambahkan kolom checkout_by_avatar jika belum ada
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
    'SELECT "Column checkout_by_avatar already exists" as message'
);
PREPARE stmt FROM @sql_checkout_avatar;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Pastikan kolom checkout_by_name ada juga
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
    'SELECT "Column checkout_by_name already exists" as message'
);
PREPARE stmt FROM @sql_checkout_name;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Pastikan kolom checkout_by_user_id ada juga
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
    'SELECT "Column checkout_by_user_id already exists" as message'
);
PREPARE stmt FROM @sql_checkout_user_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Tampilkan struktur tabel visitors untuk verifikasi
SELECT 'Checkout fields added successfully. Current visitors table structure:' as status;
DESCRIBE visitors;