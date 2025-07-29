-- Feedback table for storing visitor feedback
CREATE TABLE IF NOT EXISTS feedbacks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  visitor_id INT,
  visitor_name VARCHAR(255) NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  category ENUM('service', 'facility', 'process', 'overall', 'suggestion') DEFAULT 'service',
  feedback_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (visitor_id) REFERENCES visitors(id) ON DELETE SET NULL
);

-- Insert sample feedback data
INSERT INTO feedbacks (visitor_id, visitor_name, rating, category, feedback_text) VALUES
(1, 'John Doe', 5, 'service', 'Pelayanan sangat baik dan ramah. Staff sangat membantu dalam proses kunjungan.'),
(2, 'Jane Smith', 4, 'facility', 'Fasilitas cukup lengkap, namun bisa ditingkatkan lagi untuk kenyamanan pengunjung.'),
(3, 'Bob Johnson', 5, 'overall', 'Secara keseluruhan sangat puas dengan layanan ULT FPEB. Proses cepat dan efisien.'),
(NULL, 'Anonymous Visitor', 3, 'process', 'Proses check-in agak lama, mungkin bisa dipercepat dengan sistem yang lebih baik.'),
(NULL, 'Maria Garcia', 5, 'service', 'Excellent service! Very professional and helpful staff.');
