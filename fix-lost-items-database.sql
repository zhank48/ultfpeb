-- =======================================================
-- FIX LOST ITEMS DATABASE SCHEMA
-- Script untuk menambahkan kolom yang hilang di production
-- =======================================================

USE ult_fpeb_prod;

-- Check and add missing columns to lost_items table
ALTER TABLE lost_items 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS status ENUM('found','returned','disposed') DEFAULT 'found',
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS handover_signature_data TEXT,
ADD COLUMN IF NOT EXISTS received_by_operator VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS received_by_operator_id INT UNSIGNED DEFAULT NULL;

-- Verify the table structure
DESCRIBE lost_items;

-- Show column names
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'ult_fpeb_prod' 
AND TABLE_NAME = 'lost_items'
ORDER BY ORDINAL_POSITION;