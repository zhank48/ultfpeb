#!/bin/bash

# =======================================================
# QUICK CHECKOUT FIX - Minimal Script for Fast Resolution
# Super simple script for immediate checkout error fix
# =======================================================

echo "⚡ Quick Checkout Error 500 Fix"
echo "==============================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "This script will fix the checkout error 500 by adding missing database columns."
echo "Choose your preferred method:"
echo ""
echo "1. Use MySQL root user (recommended)"
echo "2. Use application database user"
echo "3. Manual SQL commands only"
echo ""

read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo ""
        print_status "Using MySQL root user..."
        echo "You will be prompted for the MySQL root password."
        echo ""
        
        # Method 1: MySQL Root User
mysql -u root -p << 'EOF'
-- Switch to the correct database
USE ult_fpeb_prod;

-- Add missing checkout columns (ignore errors if they already exist)
ALTER TABLE visitors ADD COLUMN checkout_by_name VARCHAR(255) NULL COMMENT 'Name of checkout operator';
ALTER TABLE visitors ADD COLUMN checkout_by_role VARCHAR(50) NULL COMMENT 'Role of checkout operator';
ALTER TABLE visitors ADD COLUMN checkout_by_avatar VARCHAR(255) NULL COMMENT 'Avatar URL of checkout operator';
ALTER TABLE visitors ADD COLUMN checkout_by_user_id INT NULL COMMENT 'User ID of checkout operator';
ALTER TABLE visitors ADD COLUMN checkout_by_email VARCHAR(255) NULL COMMENT 'Email of checkout operator';

-- Create visitor_edit_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS visitor_edit_history (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Visitor edit history tracking';

-- Verify the changes
SELECT 'Fix completed! Verifying results...' as status;

-- Check checkout columns
SELECT CONCAT('Found ', COUNT(*), ' checkout columns') as result
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'ult_fpeb_prod' 
AND TABLE_NAME = 'visitors' 
AND COLUMN_NAME LIKE '%checkout%';

-- Check edit history table
SELECT CASE 
    WHEN COUNT(*) > 0 THEN 'visitor_edit_history table exists ✅' 
    ELSE 'visitor_edit_history table missing ❌' 
END as result
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'ult_fpeb_prod' 
AND TABLE_NAME = 'visitor_edit_history';

SELECT '🎉 Database fix completed! Now restart your application with: pm2 restart ult-fpeb-backend' as final_message;
EOF
        ;;
        
    2)
        echo ""
        print_status "Using application database user..."
        echo "Using credentials: ult_fpeb_user@localhost/ult_fpeb_prod"
        echo ""
        
        # Method 2: Application User
mysql -h localhost -u ult_fpeb_user -p ult_fpeb_prod << 'EOF'
-- Add missing checkout columns
ALTER TABLE visitors ADD COLUMN checkout_by_name VARCHAR(255) NULL;
ALTER TABLE visitors ADD COLUMN checkout_by_role VARCHAR(50) NULL;
ALTER TABLE visitors ADD COLUMN checkout_by_avatar VARCHAR(255) NULL;
ALTER TABLE visitors ADD COLUMN checkout_by_user_id INT NULL;
ALTER TABLE visitors ADD COLUMN checkout_by_email VARCHAR(255) NULL;

-- Create visitor_edit_history table
CREATE TABLE IF NOT EXISTS visitor_edit_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    visitor_id INT NOT NULL,
    user_id INT NULL,
    user VARCHAR(255) NOT NULL,
    changes JSON NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SELECT 'Database fix completed!' as status;
SHOW COLUMNS FROM visitors LIKE '%checkout%';
EOF
        ;;
        
    3)
        echo ""
        print_status "Manual SQL Commands"
        echo "Copy and paste these commands into your MySQL client:"
        echo ""
        echo "-- Connect to database first:"
        echo "mysql -u root -p"
        echo "USE ult_fpeb_prod;"
        echo ""
        echo "-- Then run these commands:"
        echo "ALTER TABLE visitors ADD COLUMN checkout_by_name VARCHAR(255) NULL;"
        echo "ALTER TABLE visitors ADD COLUMN checkout_by_role VARCHAR(50) NULL;"
        echo "ALTER TABLE visitors ADD COLUMN checkout_by_avatar VARCHAR(255) NULL;"
        echo "ALTER TABLE visitors ADD COLUMN checkout_by_user_id INT NULL;"
        echo "ALTER TABLE visitors ADD COLUMN checkout_by_email VARCHAR(255) NULL;"
        echo ""
        echo "CREATE TABLE IF NOT EXISTS visitor_edit_history ("
        echo "    id INT AUTO_INCREMENT PRIMARY KEY,"
        echo "    visitor_id INT NOT NULL,"
        echo "    user_id INT NULL,"
        echo "    user VARCHAR(255) NOT NULL,"
        echo "    changes JSON NULL,"
        echo "    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
        echo ");"
        echo ""
        echo "-- Verify the fix:"
        echo "SHOW COLUMNS FROM visitors LIKE '%checkout%';"
        echo "DESCRIBE visitor_edit_history;"
        echo ""
        exit 0
        ;;
        
    *)
        print_error "Invalid choice. Please run the script again and choose 1, 2, or 3."
        exit 1
        ;;
esac

# Check if MySQL commands were successful
if [[ $? -eq 0 ]]; then
    print_success "✅ Database fix completed successfully!"
    echo ""
    print_status "Next steps:"
    echo "1. Restart your application:"
    echo "   pm2 restart ult-fpeb-backend"
    echo ""
    echo "2. Test visitor checkout functionality"
    echo ""
    echo "3. If you still get errors, run the diagnostic script:"
    echo "   ./diagnose-db.sh"
    
    # Auto-restart if PM2 is available
    if command -v pm2 &> /dev/null; then
        echo ""
        read -p "Would you like to restart the application now? (y/N): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_status "Restarting application..."
            
            # Find the correct PM2 process
            PM2_PROCESS=$(pm2 list 2>/dev/null | grep -E "(ult|fpeb|backend)" | head -1 | awk '{print $2}' | tr -d '│')
            
            if [[ -n "$PM2_PROCESS" ]]; then
                if pm2 restart "$PM2_PROCESS"; then
                    print_success "Application restarted successfully!"
                    pm2 list | head -10
                else
                    print_error "Failed to restart. Try manually: pm2 restart $PM2_PROCESS"
                fi
            else
                print_error "PM2 process not found. Available processes:"
                pm2 list
            fi
        fi
    fi
    
else
    print_error "❌ Database fix failed!"
    echo ""
    print_status "Troubleshooting steps:"
    echo "1. Check if MySQL is running: systemctl status mysql"
    echo "2. Check database credentials in backend/.env"
    echo "3. Try connecting manually: mysql -u root -p"
    echo "4. Run diagnostic script: ./diagnose-db.sh"
    
    exit 1
fi

print_success "🎉 Quick checkout fix completed!"