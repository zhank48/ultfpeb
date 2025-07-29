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

-- Insert some sample dynamic fields
INSERT INTO complaint_fields (field_name, field_label, field_type, field_options, is_required, field_order, placeholder, help_text) VALUES
('incident_location', 'Lokasi Kejadian', 'text', NULL, false, 1, 'Masukkan lokasi detail kejadian', 'Sebutkan ruangan, lantai, atau area spesifik'),
('incident_time', 'Waktu Kejadian', 'time', NULL, false, 2, NULL, 'Perkiraan waktu ketika masalah terjadi'),
('urgency_level', 'Tingkat Urgensi', 'select', '["Rendah", "Sedang", "Tinggi", "Kritis"]', false, 3, NULL, 'Pilih seberapa mendesak masalah ini'),
('witness_present', 'Ada Saksi?', 'radio', '["Ya", "Tidak"]', false, 4, NULL, 'Apakah ada saksi yang melihat kejadian'),
('affected_services', 'Layanan Terdampak', 'checkbox', '["Pendaftaran", "Konsultasi", "Administrasi", "Pelayanan Umum"]', false, 5, NULL, 'Centang semua layanan yang terdampak'),
('follow_up_needed', 'Perlu Tindak Lanjut', 'radio', '["Ya", "Tidak", "Tidak Yakin"]', false, 6, NULL, 'Apakah aduan ini memerlukan tindak lanjut khusus'),
('contact_preference', 'Preferensi Kontak', 'select', '["Email", "Telepon", "WhatsApp", "Tidak Perlu"]', false, 7, NULL, 'Bagaimana kami sebaiknya menghubungi Anda')
ON DUPLICATE KEY UPDATE 
  field_label = VALUES(field_label),
  field_type = VALUES(field_type),
  field_options = VALUES(field_options),
  updated_at = CURRENT_TIMESTAMP;