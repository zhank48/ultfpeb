-- =====================================================
-- DIRECT DATABASE FIX - Super Simple
-- Jalankan manual satu per satu jika ada error
-- =====================================================

-- Coba tambahkan kolom checkout_by_name (abaikan error jika sudah ada)
ALTER TABLE visitors ADD COLUMN checkout_by_name VARCHAR(255) NULL COMMENT 'Name of checkout operator';

-- Coba tambahkan kolom checkout_by_role (abaikan error jika sudah ada)
ALTER TABLE visitors ADD COLUMN checkout_by_role VARCHAR(50) NULL COMMENT 'Role of checkout operator';

-- Coba tambahkan kolom checkout_by_avatar (abaikan error jika sudah ada)  
ALTER TABLE visitors ADD COLUMN checkout_by_avatar VARCHAR(255) NULL COMMENT 'Avatar URL of checkout operator';

-- Coba tambahkan kolom checkout_by_user_id (abaikan error jika sudah ada)
ALTER TABLE visitors ADD COLUMN checkout_by_user_id INT NULL COMMENT 'User ID of checkout operator';

-- Coba tambahkan kolom checkout_by_email (abaikan error jika sudah ada)
ALTER TABLE visitors ADD COLUMN checkout_by_email VARCHAR(255) NULL COMMENT 'Email of checkout operator';

-- Coba buat tabel visitor_edit_history (abaikan error jika sudah ada)
CREATE TABLE visitor_edit_history (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Visitor edit history tracking';

-- Verifikasi hasilnya
SELECT 'Database fix completed!' as status;

-- Lihat kolom checkout yang berhasil ditambahkan
SHOW COLUMNS FROM visitors LIKE '%checkout%';

-- Lihat struktur tabel visitor_edit_history
DESCRIBE visitor_edit_history;