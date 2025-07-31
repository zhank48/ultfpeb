-- Fix location column issue - convert from generated column to regular column
-- This fixes the "The value specified for generated column 'location' is not allowed" error

-- Check current location column definition
-- DESCRIBE visitors;

-- Convert location from generated column to regular VARCHAR column
ALTER TABLE visitors MODIFY COLUMN location VARCHAR(255) DEFAULT NULL;

-- Update existing records where location is NULL or empty
UPDATE visitors 
SET location = CONCAT(COALESCE(institution, ''), ' - ', COALESCE(person_to_meet, ''))
WHERE location IS NULL OR location = '' OR location = ' - ';

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