-- =======================================================
-- FIX LOST ITEMS DATABASE SCHEMA (Simple Version)
-- Script sederhana untuk menambahkan kolom yang hilang
-- =======================================================

USE ult_fpeb_prod;

-- Add missing columns (ignore errors if column exists)
ALTER TABLE lost_items ADD COLUMN description TEXT;
ALTER TABLE lost_items ADD COLUMN category VARCHAR(100) DEFAULT NULL;
ALTER TABLE lost_items ADD COLUMN status ENUM('found','returned','disposed') DEFAULT 'found';
ALTER TABLE lost_items ADD COLUMN notes TEXT;
ALTER TABLE lost_items ADD COLUMN handover_signature_data TEXT;
ALTER TABLE lost_items ADD COLUMN received_by_operator VARCHAR(255) DEFAULT NULL;
ALTER TABLE lost_items ADD COLUMN received_by_operator_id INT UNSIGNED DEFAULT NULL;

-- Show final table structure
DESCRIBE lost_items;