-- ================================================================
-- Create Visitor Edit History Table
-- ================================================================
-- 
-- This migration creates a table to store visitor edit history
-- for tracking all changes made to visitor data.
-- 
-- Usage:
-- SOURCE /path/to/visitor_edit_history.sql;
-- 
-- ================================================================

USE ult_fpeb_db;

-- Create visitor_edit_history table
CREATE TABLE IF NOT EXISTS visitor_edit_history (
  id int unsigned NOT NULL AUTO_INCREMENT,
  visitor_id int unsigned NOT NULL COMMENT 'ID of the visitor being edited',
  user_id int unsigned NULL COMMENT 'ID of user who made the edit',
  user varchar(255) NOT NULL COMMENT 'Name of user who made the edit',
  timestamp datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When the edit was made',
  changes json NOT NULL COMMENT 'JSON object containing the new values',
  original json NOT NULL COMMENT 'JSON object containing the original values',
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_visitor_edit_history_visitor_id (visitor_id),
  KEY idx_visitor_edit_history_user_id (user_id),
  KEY idx_visitor_edit_history_timestamp (timestamp),
  CONSTRAINT fk_visitor_edit_history_visitor 
    FOREIGN KEY (visitor_id) REFERENCES visitors(id) ON DELETE CASCADE,
  CONSTRAINT fk_visitor_edit_history_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Stores history of visitor data edits';

-- Add indexes for better performance
CREATE INDEX idx_visitor_edit_history_composite ON visitor_edit_history(visitor_id, timestamp DESC);

-- Display the created table structure
DESCRIBE visitor_edit_history;

SELECT 'Migration completed successfully: Created visitor_edit_history table' as status;