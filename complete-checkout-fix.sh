#!/bin/bash

# =======================================================
# COMPLETE CHECKOUT FIX - Finish Remaining Database Changes
# Script untuk menyelesaikan perubahan database yang tersisa
# =======================================================

echo "🔧 Complete Checkout Fix Script"
echo "==============================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Extract credentials from .env file (we know this works from previous script)
if [[ -f "backend/.env" ]]; then
    DB_HOST=$(grep "^DB_HOST=" backend/.env 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    DB_NAME=$(grep "^DB_NAME=" backend/.env 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    DB_USER=$(grep "^DB_USER=" backend/.env 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    DB_PASSWORD=$(grep "^DB_PASSWORD=" backend/.env 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    
    DB_HOST=${DB_HOST:-localhost}
    DB_NAME=${DB_NAME:-ult_fpeb_prod}
    
    print_status "Using working credentials: ${DB_USER}@${DB_HOST}/${DB_NAME}"
else
    print_error "backend/.env file not found!"
    exit 1
fi

# Test connection first
print_status "Testing database connection..."
if mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" "$DB_NAME" >/dev/null 2>&1; then
    print_success "✅ Database connection successful!"
else
    print_error "❌ Database connection failed!"
    exit 1
fi

print_status "Checking current database state..."

# Check which checkout columns already exist
EXISTING_COLUMNS=$(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -sN -e "
SELECT GROUP_CONCAT(COLUMN_NAME)
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = '$DB_NAME' 
AND TABLE_NAME = 'visitors' 
AND COLUMN_NAME LIKE '%checkout%';
")

print_status "Existing checkout columns: $EXISTING_COLUMNS"

# Check if visitor_edit_history table exists
TABLE_EXISTS=$(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -sN -e "
SELECT COUNT(*) 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = '$DB_NAME' 
AND TABLE_NAME = 'visitor_edit_history';
")

print_status "visitor_edit_history table exists: $([ "$TABLE_EXISTS" -gt 0 ] && echo "YES" || echo "NO")"

print_status "Completing remaining database fixes..."

# Complete the missing columns and table creation
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" << 'EOF'

-- Ensure all 5 checkout columns exist
-- Use IF NOT EXISTS logic with prepared statements

-- Check and add checkout_by_name
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'visitors' 
    AND COLUMN_NAME = 'checkout_by_name'
);

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE visitors ADD COLUMN checkout_by_name VARCHAR(255) NULL COMMENT "Name of checkout operator"',
    'SELECT "checkout_by_name already exists" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add checkout_by_role
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'visitors' 
    AND COLUMN_NAME = 'checkout_by_role'
);

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE visitors ADD COLUMN checkout_by_role VARCHAR(50) NULL COMMENT "Role of checkout operator"',
    'SELECT "checkout_by_role already exists" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add checkout_by_avatar
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'visitors' 
    AND COLUMN_NAME = 'checkout_by_avatar'
);

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE visitors ADD COLUMN checkout_by_avatar VARCHAR(255) NULL COMMENT "Avatar URL of checkout operator"',
    'SELECT "checkout_by_avatar already exists" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add checkout_by_user_id
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'visitors' 
    AND COLUMN_NAME = 'checkout_by_user_id'
);

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE visitors ADD COLUMN checkout_by_user_id INT NULL COMMENT "User ID of checkout operator"',
    'SELECT "checkout_by_user_id already exists" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add checkout_by_email
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'visitors' 
    AND COLUMN_NAME = 'checkout_by_email'
);

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE visitors ADD COLUMN checkout_by_email VARCHAR(255) NULL COMMENT "Email of checkout operator"',
    'SELECT "checkout_by_email already exists" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create visitor_edit_history table if it doesn't exist
SET @table_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'visitor_edit_history'
);

SET @sql = IF(@table_exists = 0, 
    'CREATE TABLE visitor_edit_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        visitor_id INT NOT NULL,
        user_id INT NULL,
        user VARCHAR(255) NOT NULL,
        user_name VARCHAR(255) NULL,
        user_role VARCHAR(50) NULL,
        user_email VARCHAR(255) NULL,
        user_avatar VARCHAR(255) NULL,
        changes JSON NULL,
        original JSON NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_visitor_id (visitor_id),
        INDEX idx_user_id (user_id),
        INDEX idx_timestamp (timestamp)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT="Visitor edit history tracking"',
    'SELECT "visitor_edit_history table already exists" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Final verification
SELECT '=== VERIFICATION RESULTS ===' as status;

SELECT CONCAT('Checkout columns: ', COUNT(*), '/5') as result
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'visitors' 
AND COLUMN_NAME IN ('checkout_by_name', 'checkout_by_role', 'checkout_by_avatar', 'checkout_by_user_id', 'checkout_by_email');

SELECT CASE 
    WHEN COUNT(*) > 0 THEN 'visitor_edit_history: EXISTS ✅' 
    ELSE 'visitor_edit_history: MISSING ❌' 
END as result
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'visitor_edit_history';

-- Show all checkout columns
SELECT 'Current checkout columns:' as info;
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'visitors' 
AND COLUMN_NAME LIKE '%checkout%'
ORDER BY ORDINAL_POSITION;

SELECT '🎉 COMPLETE CHECKOUT FIX FINISHED!' as final_status;

EOF

# Check if the SQL execution was successful
if [[ $? -eq 0 ]]; then
    print_success "✅ Database fixes completed successfully!"
    
    # Final verification
    print_status "Running final verification..."
    
    FINAL_COUNT=$(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -sN -e "
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = '$DB_NAME' 
    AND TABLE_NAME = 'visitors' 
    AND COLUMN_NAME IN ('checkout_by_name', 'checkout_by_role', 'checkout_by_avatar', 'checkout_by_user_id', 'checkout_by_email');
    ")
    
    FINAL_TABLE=$(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -sN -e "
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = '$DB_NAME' 
    AND TABLE_NAME = 'visitor_edit_history';
    ")
    
    echo ""
    print_status "FINAL VERIFICATION RESULTS:"
    echo "  - Checkout columns: ${FINAL_COUNT}/5"
    echo "  - visitor_edit_history table: $([ "$FINAL_TABLE" -gt 0 ] && echo "EXISTS" || echo "MISSING")"
    
    if [[ "$FINAL_COUNT" -eq 5 ]] && [[ "$FINAL_TABLE" -gt 0 ]]; then
        print_success "🎉 ALL DATABASE FIXES COMPLETED SUCCESSFULLY!"
        
        # Restart application
        print_status "Restarting application..."
        if command -v pm2 &> /dev/null; then
            pm2 restart ult-fpeb-backend
            print_success "✅ Application restarted!"
        fi
        
        echo ""
        print_success "✅ CHECKOUT ERROR 500 SHOULD NOW BE FIXED!"
        echo ""
        print_status "Please test visitor checkout functionality in your application."
        
    else
        print_warning "⚠️  Some fixes may still be incomplete. Check the verification results above."
    fi
    
else
    print_error "❌ Database fix execution failed!"
    exit 1
fi

print_success "Complete checkout fix script finished! 🚀"