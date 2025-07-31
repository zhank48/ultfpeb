-- Create configuration tables if they don't exist
-- This fixes the configuration endpoint errors
-- Database: ult_fpeb_prod

USE ult_fpeb_prod;

-- Create configuration_categories table
CREATE TABLE IF NOT EXISTS configuration_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  key_name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create configuration_options table
CREATE TABLE IF NOT EXISTS configuration_options (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  option_value VARCHAR(255) NOT NULL,
  display_text VARCHAR(255) NOT NULL,
  group_id INT NULL,
  sort_order INT DEFAULT 0,
  metadata JSON NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES configuration_categories(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES configuration_options(id) ON DELETE SET NULL
);

-- Insert default categories if they don't exist
INSERT IGNORE INTO configuration_categories (key_name, display_name, description) VALUES
('purposes', 'Purposes', 'Available purposes for visitor check-in'),
('units', 'Units', 'Available units/departments for visit'),
('person_to_meet', 'Person to Meet', 'Available persons to meet during visit');

-- Insert default options if they don't exist
INSERT IGNORE INTO configuration_options (category_id, option_value, display_text, sort_order) 
SELECT 
  (SELECT id FROM configuration_categories WHERE key_name = 'purposes'),
  'meeting',
  'Meeting',
  1
WHERE NOT EXISTS (
  SELECT 1 FROM configuration_options co 
  JOIN configuration_categories cc ON co.category_id = cc.id 
  WHERE cc.key_name = 'purposes' AND co.option_value = 'meeting'
);

INSERT IGNORE INTO configuration_options (category_id, option_value, display_text, sort_order) 
SELECT 
  (SELECT id FROM configuration_categories WHERE key_name = 'purposes'),
  'consultation',
  'Consultation',
  2
WHERE NOT EXISTS (
  SELECT 1 FROM configuration_options co 
  JOIN configuration_categories cc ON co.category_id = cc.id 
  WHERE cc.key_name = 'purposes' AND co.option_value = 'consultation'
);

INSERT IGNORE INTO configuration_options (category_id, option_value, display_text, sort_order) 
SELECT 
  (SELECT id FROM configuration_categories WHERE key_name = 'purposes'),
  'document_request',
  'Document Request',
  3
WHERE NOT EXISTS (
  SELECT 1 FROM configuration_options co 
  JOIN configuration_categories cc ON co.category_id = cc.id 
  WHERE cc.key_name = 'purposes' AND co.option_value = 'document_request'
);

-- Insert default units
INSERT IGNORE INTO configuration_options (category_id, option_value, display_text, sort_order) 
SELECT 
  (SELECT id FROM configuration_categories WHERE key_name = 'units'),
  'dekan',
  'Dekan',
  1
WHERE NOT EXISTS (
  SELECT 1 FROM configuration_options co 
  JOIN configuration_categories cc ON co.category_id = cc.id 
  WHERE cc.key_name = 'units' AND co.option_value = 'dekan'
);

INSERT IGNORE INTO configuration_options (category_id, option_value, display_text, sort_order) 
SELECT 
  (SELECT id FROM configuration_categories WHERE key_name = 'units'),
  'wd1',
  'Wakil Dekan Bidang Akademik (WD 1)',
  2
WHERE NOT EXISTS (
  SELECT 1 FROM configuration_options co 
  JOIN configuration_categories cc ON co.category_id = cc.id 
  WHERE cc.key_name = 'units' AND co.option_value = 'wd1'
);

INSERT IGNORE INTO configuration_options (category_id, option_value, display_text, sort_order) 
SELECT 
  (SELECT id FROM configuration_categories WHERE key_name = 'units'),
  'wd2',
  'Wakil Dekan bidang Sumberdaya, Keuangan, dan Umum (WD 2)',
  3
WHERE NOT EXISTS (
  SELECT 1 FROM configuration_options co 
  JOIN configuration_categories cc ON co.category_id = cc.id 
  WHERE cc.key_name = 'units' AND co.option_value = 'wd2'
);

-- Verify the setup
SELECT 'Configuration setup completed' as status;
SELECT 
  cc.key_name, 
  cc.display_name, 
  COUNT(co.id) as option_count 
FROM configuration_categories cc 
LEFT JOIN configuration_options co ON cc.id = co.category_id AND co.is_active = true 
WHERE cc.is_active = true 
GROUP BY cc.id, cc.key_name, cc.display_name;