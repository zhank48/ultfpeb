-- Add missing columns to complaint_fields table
ALTER TABLE complaint_fields 
ADD COLUMN IF NOT EXISTS placeholder VARCHAR(255) DEFAULT NULL AFTER is_active;

ALTER TABLE complaint_fields 
ADD COLUMN IF NOT EXISTS help_text TEXT DEFAULT NULL AFTER placeholder;

ALTER TABLE complaint_fields 
ADD COLUMN IF NOT EXISTS validation_rules JSON DEFAULT NULL AFTER help_text;