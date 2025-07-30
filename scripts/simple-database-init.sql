-- ================================================
-- ULT FPEB Simple Database Initialization (MySQL 8.0 Compatible)
-- ================================================

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('Admin', 'Receptionist', 'Manager') NOT NULL DEFAULT 'Receptionist',
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP NULL,
  login_attempts INT DEFAULT 0,
  locked_until TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Visitors table
CREATE TABLE IF NOT EXISTS visitors (
  id INT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  institution VARCHAR(255) NOT NULL,
  id_type VARCHAR(50),
  id_number VARCHAR(100),
  address TEXT,
  purpose TEXT NOT NULL,
  unit VARCHAR(255) NOT NULL,
  person_to_meet VARCHAR(255) NOT NULL,
  location VARCHAR(500) GENERATED ALWAYS AS (
    CASE 
      WHEN person_to_meet LIKE '%Dekan%' THEN 'Dekan FPEB'
      WHEN person_to_meet LIKE '%Wakil Dekan%' OR person_to_meet LIKE '%WD%' THEN 'Wakil Dekan FPEB'
      WHEN person_to_meet LIKE '%Staff ULT%' THEN 'Unit Layanan Terpadu (ULT) FPEB'
      WHEN person_to_meet LIKE '%Staff Akademik%' THEN 'Bagian Akademik FPEB'
      WHEN person_to_meet LIKE '%Staff Keuangan%' THEN 'Bagian Keuangan FPEB'
      ELSE CONCAT(unit, ' - ', person_to_meet)
    END
  ) STORED,
  request_document BOOLEAN DEFAULT FALSE,
  document_type VARCHAR(255),
  document_name VARCHAR(255),
  document_number VARCHAR(100),
  photo LONGTEXT,
  signature LONGTEXT,
  photo_url VARCHAR(500),
  signature_url VARCHAR(500),
  check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  check_out_time TIMESTAMP NULL,
  status ENUM('checked_in', 'checked_out') DEFAULT 'checked_in',
  input_by_user_id INT,
  checkout_by_user_id INT,
  deleted_at TIMESTAMP NULL,
  deleted_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Configurations table
CREATE TABLE IF NOT EXISTS configurations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  type ENUM('purpose', 'unit', 'person_to_meet') NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default users (passwords: admin123, receptionist123)
INSERT IGNORE INTO users (id, name, email, password, role) VALUES 
(1, 'System Administrator', 'admin@ultfpeb.upi.edu', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeKYr6.YX4TGqDxaW', 'Admin'),
(2, 'Receptionist', 'receptionist@ultfpeb.upi.edu', '$2a$12$2kKGGPpHXrXlbHq4PhLVPOzEyXpG9O7C0xA1PdFHlcPx8vSfPYNSW', 'Receptionist');

-- Insert basic configurations
INSERT IGNORE INTO configurations (type, name, is_active, sort_order) VALUES
('purpose', 'Konsultasi Akademik', TRUE, 1),
('purpose', 'Pendaftaran Mahasiswa Baru', TRUE, 2),
('purpose', 'Pengambilan Dokumen', TRUE, 3),
('purpose', 'Pembayaran SPP', TRUE, 4),
('purpose', 'Lainnya', TRUE, 99),
('unit', 'Dekanat FPEB', TRUE, 1),
('unit', 'Unit Layanan Terpadu (ULT)', TRUE, 2),
('unit', 'Bagian Akademik', TRUE, 3),
('unit', 'Bagian Keuangan', TRUE, 4),
('unit', 'Lainnya', TRUE, 99),
('person_to_meet', 'Dekan FPEB', TRUE, 1),
('person_to_meet', 'Staff Akademik', TRUE, 2),
('person_to_meet', 'Staff Keuangan', TRUE, 3),
('person_to_meet', 'Staff ULT', TRUE, 4),
('person_to_meet', 'Lainnya', TRUE, 99);

-- Show results
SELECT 'Simple database initialized!' as status,
  (SELECT COUNT(*) FROM users) as users_count,
  (SELECT COUNT(*) FROM configurations) as configs_count;