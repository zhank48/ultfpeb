#!/bin/bash

# ==============================================
# ULT FPEB Database Fix Script
# ==============================================
# 
# Fix database initialization issues
# Usage: sudo ./fix-database.sh
# ==============================================

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    error "This script must be run as root (use sudo)"
fi

# Load MySQL credentials
if [[ -f /root/.mysql_credentials ]]; then
    source /root/.mysql_credentials
    log "MySQL credentials loaded"
else
    error "MySQL credentials not found. Run main deployment script first."
fi

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log "Fixing database initialization..."

# Create fixed database initialization script
cat > /tmp/database-init-fixed.sql << 'EOF'
-- ================================================
-- ULT FPEB Visitor Management Database Initialization (MySQL 8.0 Compatible)
-- ================================================

-- Set database settings (compatible with MySQL 8.0+)
SET sql_mode = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ================================================
-- Core Tables
-- ================================================

-- Users table for authentication and authorization
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
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_is_active (is_active),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Main visitors table
CREATE TABLE IF NOT EXISTS visitors (
  id INT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  institution VARCHAR(255) NOT NULL,
  id_type VARCHAR(50),
  id_number VARCHAR(100),
  address TEXT,
  
  -- Visit information
  purpose TEXT NOT NULL,
  unit VARCHAR(255) NOT NULL,
  person_to_meet VARCHAR(255) NOT NULL,
  
  -- Document request
  request_document BOOLEAN DEFAULT FALSE,
  document_type VARCHAR(255),
  document_name VARCHAR(255),
  document_number VARCHAR(100),
  
  -- Photo and signature
  photo LONGTEXT,
  signature LONGTEXT,
  
  -- Timestamps and status
  check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  check_out_time TIMESTAMP NULL,
  status ENUM('checked_in', 'checked_out') DEFAULT 'checked_in',
  
  -- Audit fields
  input_by_user_id INT,
  checkout_by_user_id INT,
  deleted_at TIMESTAMP NULL,
  deleted_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (input_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (checkout_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL,
  
  INDEX idx_full_name (full_name),
  INDEX idx_phone (phone),
  INDEX idx_email (email),
  INDEX idx_institution (institution),
  INDEX idx_check_in_time (check_in_time),
  INDEX idx_check_out_time (check_out_time),
  INDEX idx_status (status),
  INDEX idx_deleted_at (deleted_at),
  INDEX idx_input_by_user_id (input_by_user_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dynamic configurations for dropdown options
CREATE TABLE IF NOT EXISTS configurations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  type ENUM('purpose', 'unit', 'person_to_meet') NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_type_name (type, name),
  INDEX idx_type (type),
  INDEX idx_is_active (is_active),
  INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default admin user (password: admin123)
INSERT IGNORE INTO users (id, name, email, password, role, created_at) VALUES 
(1, 'System Administrator', 'admin@ultfpeb.upi.edu', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeKYr6.YX4TGqDxaW', 'Admin', NOW()),
(2, 'Receptionist', 'receptionist@ultfpeb.upi.edu', '$2a$12$2kKGGPpHXrXlbHq4PhLVPOzEyXpG9O7C0xA1PdFHlcPx8vSfPYNSW', 'Receptionist', NOW());

-- Insert default configuration data
INSERT IGNORE INTO configurations (type, name, is_active, sort_order) VALUES
-- Purposes
('purpose', 'Konsultasi Akademik', TRUE, 1),
('purpose', 'Pendaftaran Mahasiswa Baru', TRUE, 2),
('purpose', 'Pengambilan Dokumen', TRUE, 3),
('purpose', 'Pembayaran SPP', TRUE, 4),
('purpose', 'Konsultasi Skripsi/Thesis', TRUE, 5),
('purpose', 'Kegiatan Kemahasiswaan', TRUE, 6),
('purpose', 'Rapat/Meeting', TRUE, 7),
('purpose', 'Penelitian', TRUE, 8),
('purpose', 'Kerjasama Institusi', TRUE, 9),
('purpose', 'Lainnya', TRUE, 99),

-- Units
('unit', 'Dekanat FPEB', TRUE, 1),
('unit', 'Program Studi Pendidikan Ekonomi', TRUE, 2),
('unit', 'Program Studi Pendidikan Akuntansi', TRUE, 3),
('unit', 'Program Studi Pendidikan Bisnis', TRUE, 4),
('unit', 'Program Studi Pendidikan Manajemen Perkantoran', TRUE, 5),
('unit', 'Program Studi Ilmu Ekonomi dan Keuangan Islam', TRUE, 6),
('unit', 'Program Studi Ekonomi Pembangunan', TRUE, 7),
('unit', 'Program Studi Akuntansi', TRUE, 8),
('unit', 'Program Studi Manajemen', TRUE, 9),
('unit', 'Unit Layanan Terpadu (ULT)', TRUE, 10),
('unit', 'Perpustakaan FPEB', TRUE, 11),
('unit', 'Lab Komputer', TRUE, 12),
('unit', 'Bagian Akademik', TRUE, 13),
('unit', 'Bagian Keuangan', TRUE, 14),
('unit', 'Bagian Kemahasiswaan', TRUE, 15),
('unit', 'Lainnya', TRUE, 99),

-- Person to Meet
('person_to_meet', 'Dekan FPEB', TRUE, 1),
('person_to_meet', 'Wakil Dekan I (Akademik)', TRUE, 2),
('person_to_meet', 'Wakil Dekan II (Administrasi)', TRUE, 3),
('person_to_meet', 'Wakil Dekan III (Kemahasiswaan)', TRUE, 4),
('person_to_meet', 'Kepala Program Studi', TRUE, 10),
('person_to_meet', 'Dosen Pembimbing', TRUE, 11),
('person_to_meet', 'Staff Akademik', TRUE, 20),
('person_to_meet', 'Staff Keuangan', TRUE, 21),
('person_to_meet', 'Staff Kemahasiswaan', TRUE, 22),
('person_to_meet', 'Staff ULT', TRUE, 23),
('person_to_meet', 'Koordinator Skripsi', TRUE, 30),
('person_to_meet', 'Koordinator PKL', TRUE, 31),
('person_to_meet', 'Koordinator KKN', TRUE, 32),
('person_to_meet', 'Lainnya', TRUE, 99);

-- Verify tables created
SELECT 'Database tables created successfully!' as status,
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM configurations) as total_configurations,
  NOW() as completed_at;
EOF

# Run the fixed database initialization
log "Running fixed database initialization..."
mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" < /tmp/database-init-fixed.sql

if [[ $? -eq 0 ]]; then
    log "Database initialization completed successfully!"
else
    error "Database initialization failed"
fi

# Clean up temporary file
rm -f /tmp/database-init-fixed.sql

log "Database fix completed. You can now continue with the deployment."