-- ================================================================
-- Add Checkout Operator Fields to Visitors Table
-- ================================================================
-- 
-- This migration adds fields to track the operator who performs 
-- visitor checkout operations, similar to the existing check-in
-- operator fields.
-- 
-- Usage:
-- SOURCE /path/to/add_checkout_operator_fields.sql;
-- 
-- ================================================================

USE ult_fpeb_db;

-- Add checkout operator fields to visitors table
ALTER TABLE visitors 
ADD COLUMN checkout_by_user_id int unsigned NULL COMMENT 'ID of user who performed checkout' AFTER input_by_role,
ADD COLUMN checkout_by_name varchar(255) NULL COMMENT 'Name of operator who performed checkout' AFTER checkout_by_user_id,
ADD COLUMN checkout_by_role varchar(100) NULL COMMENT 'Role of operator who performed checkout' AFTER checkout_by_name;

-- Add foreign key constraint for checkout operator
ALTER TABLE visitors 
ADD CONSTRAINT fk_visitors_checkout_user 
FOREIGN KEY (checkout_by_user_id) REFERENCES users(id) ON UPDATE CASCADE;

-- Add index for better performance on checkout operator queries
CREATE INDEX idx_visitors_checkout_by_user ON visitors(checkout_by_user_id);
CREATE INDEX idx_visitors_checkout_by_name ON visitors(checkout_by_name);

-- Display the updated table structure
DESCRIBE visitors;

SELECT 'Migration completed successfully: Added checkout operator fields to visitors table' as status;
