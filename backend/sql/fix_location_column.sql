-- Fix location column issue - convert from generated column to regular column
-- This fixes the "The value specified for generated column 'location' is not allowed" error
-- Database: ult_fpeb_prod

USE ult_fpeb_prod;

-- Check current location column definition
-- DESCRIBE visitors;

-- Method 1: Try to backup data first (if there are existing records)
CREATE TEMPORARY TABLE temp_visitor_locations AS 
SELECT id, 
       COALESCE(CONCAT(COALESCE(institution, ''), ' - ', COALESCE(person_to_meet, '')), 'Unknown') as computed_location 
FROM visitors;

-- Method 2: Drop the generated column and recreate as regular column
-- This is the only way to change a generated column in MySQL
ALTER TABLE visitors DROP COLUMN location;

-- Add location back as a regular VARCHAR column
ALTER TABLE visitors ADD COLUMN location VARCHAR(255) DEFAULT NULL;

-- Update location values from our temporary backup
UPDATE visitors v 
JOIN temp_visitor_locations t ON v.id = t.id 
SET v.location = t.computed_location;

-- Clean up location values that are just " - "
UPDATE visitors 
SET location = institution
WHERE location = ' - ' AND institution IS NOT NULL AND institution != '';

-- Set location to 'Unknown' for records where both institution and person_to_meet are empty
UPDATE visitors 
SET location = 'Unknown'
WHERE (location IS NULL OR location = '' OR location = ' - ') 
  AND (institution IS NULL OR institution = '') 
  AND (person_to_meet IS NULL OR person_to_meet = '');

-- Clean up temporary table
DROP TEMPORARY TABLE temp_visitor_locations;

-- Verify the changes
SELECT COUNT(*) as total_visitors, 
       COUNT(location) as visitors_with_location,
       COUNT(*) - COUNT(location) as visitors_without_location
FROM visitors;

-- Show sample of updated locations
SELECT id, institution, person_to_meet, location 
FROM visitors 
ORDER BY id DESC 
LIMIT 10;

-- Confirm the column is now a regular column (not generated)
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'ult_fpeb_prod' AND TABLE_NAME = 'visitors' AND COLUMN_NAME = 'location';