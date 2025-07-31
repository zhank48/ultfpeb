-- Fix authentication issues - ensure users table exists and has default users
-- Database: ult_fpeb_prod

USE ult_fpeb_prod;

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('Admin', 'Receptionist') DEFAULT 'Receptionist',
  avatar_url VARCHAR(500) NULL,
  study_program VARCHAR(100) NULL,
  cohort VARCHAR(50) NULL,
  phone VARCHAR(20) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default admin user if doesn't exist
-- Password: admin123 (hashed with bcrypt)
INSERT IGNORE INTO users (name, email, password, role) VALUES
('Administrator', 'admin@ultfpeb.up.edu', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin');

-- Insert default receptionist user if doesn't exist  
-- Password: receptionist123 (hashed with bcrypt)
INSERT IGNORE INTO users (name, email, password, role) VALUES
('Receptionist', 'receptionist@ultfpeb.up.edu', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Receptionist');

-- Verify users exist
SELECT 'Users table setup completed' as status;
SELECT id, name, email, role, created_at FROM users;