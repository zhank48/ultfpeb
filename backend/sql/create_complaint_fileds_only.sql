-- Create complaint_fields table for dynamic form configuration
CREATE TABLE IF NOT EXISTS complaint_fields (
  id INT AUTO_INCREMENT PRIMARY KEY,
  field_name VARCHAR(100) NOT NULL UNIQUE,
  field_label VARCHAR(255) NOT NULL,
  field_type ENUM('text', 'textarea', 'select', 'radio', 'checkbox', 'date', 'time', 'email', 'phone', 'number', 'url', 'file') NOT NULL DEFAULT 'text',
  field_options JSON DEFAULT NULL,
  is_required BOOLEAN DEFAULT FALSE,
  field_order INT DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  placeholder VARCHAR(255) DEFAULT NULL,
  help_text TEXT DEFAULT NULL,
  validation_rules JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_field_name (field_name),
  INDEX idx_field_order (field_order),
  INDEX idx_is_active (is_active)
);