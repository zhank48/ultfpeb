-- =====================================================
-- Create Visitor Edit History Table for Production
-- Membuat tabel visitor_edit_history jika belum ada
-- =====================================================

-- Cek apakah tabel visitor_edit_history sudah ada
SET @table_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'visitor_edit_history'
);

-- Jika tabel belum ada, buat tabel baru
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
        INDEX idx_timestamp (timestamp),
        FOREIGN KEY (visitor_id) REFERENCES visitors(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT="Visitor edit history tracking"',
    'SELECT "Table visitor_edit_history already exists" as message'
);

PREPARE stmt FROM @sql_create_table;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Jika tabel sudah ada, pastikan semua kolom yang diperlukan ada
SET @add_user_name = IF(
    @table_exists > 0 AND NOT EXISTS(
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'visitor_edit_history'
        AND COLUMN_NAME = 'user_name'
    ),
    'ALTER TABLE visitor_edit_history ADD COLUMN user_name VARCHAR(255) NULL COMMENT "Name of user who made the edit"',
    'SELECT "Column user_name already exists or table is new" as message'
);

PREPARE stmt FROM @add_user_name;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_user_role = IF(
    @table_exists > 0 AND NOT EXISTS(
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'visitor_edit_history'
        AND COLUMN_NAME = 'user_role'
    ),
    'ALTER TABLE visitor_edit_history ADD COLUMN user_role VARCHAR(50) NULL COMMENT "Role of user who made the edit"',
    'SELECT "Column user_role already exists or table is new" as message'
);

PREPARE stmt FROM @add_user_role;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_user_email = IF(
    @table_exists > 0 AND NOT EXISTS(
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'visitor_edit_history'
        AND COLUMN_NAME = 'user_email'
    ),
    'ALTER TABLE visitor_edit_history ADD COLUMN user_email VARCHAR(255) NULL COMMENT "Email of user who made the edit"',
    'SELECT "Column user_email already exists or table is new" as message'
);

PREPARE stmt FROM @add_user_email;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_user_avatar = IF(
    @table_exists > 0 AND NOT EXISTS(
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'visitor_edit_history'
        AND COLUMN_NAME = 'user_avatar'
    ),
    'ALTER TABLE visitor_edit_history ADD COLUMN user_avatar VARCHAR(255) NULL COMMENT "Avatar of user who made the edit"',
    'SELECT "Column user_avatar already exists or table is new" as message'
);

PREPARE stmt FROM @add_user_avatar;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Tampilkan struktur tabel untuk verifikasi
SELECT 'Visitor edit history table created/updated successfully. Table structure:' as status;
DESCRIBE visitor_edit_history;