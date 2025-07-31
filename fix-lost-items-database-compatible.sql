-- =======================================================
-- FIX LOST ITEMS DATABASE SCHEMA (MySQL Compatible)
-- Script untuk menambahkan kolom yang hilang di production
-- Compatible dengan MySQL versi lama
-- =======================================================

USE ult_fpeb_prod;

-- Check existing columns first
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'ult_fpeb_prod' 
AND TABLE_NAME = 'lost_items'
ORDER BY ORDINAL_POSITION;

-- Add missing columns one by one with error handling
-- Add description column
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = 'ult_fpeb_prod' 
     AND TABLE_NAME = 'lost_items' 
     AND COLUMN_NAME = 'description') = 0,
    'ALTER TABLE lost_items ADD COLUMN description TEXT',
    'SELECT "Column description already exists" as result'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add category column
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = 'ult_fpeb_prod' 
     AND TABLE_NAME = 'lost_items' 
     AND COLUMN_NAME = 'category') = 0,
    'ALTER TABLE lost_items ADD COLUMN category VARCHAR(100) DEFAULT NULL',
    'SELECT "Column category already exists" as result'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add status column
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = 'ult_fpeb_prod' 
     AND TABLE_NAME = 'lost_items' 
     AND COLUMN_NAME = 'status') = 0,
    'ALTER TABLE lost_items ADD COLUMN status ENUM(''found'',''returned'',''disposed'') DEFAULT ''found''',
    'SELECT "Column status already exists" as result'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add notes column
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = 'ult_fpeb_prod' 
     AND TABLE_NAME = 'lost_items' 
     AND COLUMN_NAME = 'notes') = 0,
    'ALTER TABLE lost_items ADD COLUMN notes TEXT',
    'SELECT "Column notes already exists" as result'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add handover_signature_data column
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = 'ult_fpeb_prod' 
     AND TABLE_NAME = 'lost_items' 
     AND COLUMN_NAME = 'handover_signature_data') = 0,
    'ALTER TABLE lost_items ADD COLUMN handover_signature_data TEXT',
    'SELECT "Column handover_signature_data already exists" as result'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add received_by_operator column
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = 'ult_fpeb_prod' 
     AND TABLE_NAME = 'lost_items' 
     AND COLUMN_NAME = 'received_by_operator') = 0,
    'ALTER TABLE lost_items ADD COLUMN received_by_operator VARCHAR(255) DEFAULT NULL',
    'SELECT "Column received_by_operator already exists" as result'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add received_by_operator_id column
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = 'ult_fpeb_prod' 
     AND TABLE_NAME = 'lost_items' 
     AND COLUMN_NAME = 'received_by_operator_id') = 0,
    'ALTER TABLE lost_items ADD COLUMN received_by_operator_id INT UNSIGNED DEFAULT NULL',
    'SELECT "Column received_by_operator_id already exists" as result'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Final verification
SELECT 'Database update completed' as status;

-- Show the updated table structure
DESCRIBE lost_items;

-- Show column count
SELECT COUNT(*) as total_columns 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'ult_fpeb_prod' 
AND TABLE_NAME = 'lost_items';