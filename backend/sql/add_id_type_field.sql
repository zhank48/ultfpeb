-- Add id_type field to visitors table for identity type information
-- This field stores the type of identity document (e.g., KTP, SIM, Passport, etc.)

ALTER TABLE visitors 
ADD COLUMN id_type VARCHAR(50) DEFAULT NULL COMMENT 'Type of identity document (KTP, SIM, Passport, etc.)' 
AFTER id_number;

-- Add index for better query performance
CREATE INDEX idx_id_type ON visitors(id_type);

-- Display confirmation
SELECT 'id_type field added successfully to visitors table' as status;