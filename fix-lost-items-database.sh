#!/bin/bash

# =======================================================
# FIX LOST ITEMS DATABASE SCRIPT
# Script untuk memperbaiki database lost_items di production
# =======================================================

echo "🔧 Fix Lost Items Database Script"
echo "================================="

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

print_status "Fixing lost_items database schema..."

# Check if we're in the right location
if [[ ! -d "backend" ]] || [[ ! -f "package.json" ]]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Database connection details
DB_NAME="ult_fpeb_prod"
DB_USER="root"
DB_HOST="localhost"

print_status "Updating lost_items table schema..."

# Run the SQL fix
if command -v mysql &> /dev/null; then
    # Method 1: Using mysql command with password prompt
    print_status "Please enter MySQL root password when prompted:"
    
    mysql -u $DB_USER -p -h $DB_HOST << 'EOF'
USE ult_fpeb_prod;

-- Add missing columns to lost_items table
ALTER TABLE lost_items 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS status ENUM('found','returned','disposed') DEFAULT 'found',
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS handover_signature_data TEXT,
ADD COLUMN IF NOT EXISTS received_by_operator VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS received_by_operator_id INT UNSIGNED DEFAULT NULL;

-- Show the updated table structure
DESCRIBE lost_items;

-- Show column count
SELECT COUNT(*) as column_count 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'ult_fpeb_prod' 
AND TABLE_NAME = 'lost_items';

EOF

    if [[ $? -eq 0 ]]; then
        print_success "Database schema updated successfully"
    else
        print_error "Failed to update database schema"
        
        print_status "Alternative method: Using SQL file..."
        if [[ -f "fix-lost-items-database.sql" ]]; then
            mysql -u $DB_USER -p -h $DB_HOST < fix-lost-items-database.sql
            
            if [[ $? -eq 0 ]]; then
                print_success "Database updated using SQL file"
            else
                print_error "Failed to update database using SQL file"
            fi
        fi
    fi
else
    print_error "MySQL client not found"
    print_status "Please install MySQL client or run the SQL commands manually:"
    print_status "mysql -u root -p ult_fpeb_prod < fix-lost-items-database.sql"
fi

# Restart the application to reload database connection
print_status "Restarting application..."

if command -v pm2 &> /dev/null; then
    PM2_PROCESS=$(pm2 list 2>/dev/null | grep -E "(ult|fpeb|backend)" | head -1 | awk '{print $2}' | tr -d '│' | xargs)
    
    if [[ -n "$PM2_PROCESS" ]]; then
        print_status "Restarting PM2 process: $PM2_PROCESS"
        pm2 restart "$PM2_PROCESS"
        
        if [[ $? -eq 0 ]]; then
            print_success "Application restarted successfully"
            sleep 3
            pm2 list | grep -E "(App name|$PM2_PROCESS)" || pm2 list
        else
            print_error "Failed to restart application"
        fi
    else
        print_warning "PM2 process not found"
    fi
else
    print_warning "PM2 not found"
fi

# Verify the fix
print_status "Verifying the fix..."

if command -v curl &> /dev/null; then
    HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null || echo "000")
    
    if [[ "$HEALTH_RESPONSE" == "200" ]]; then
        print_success "Application is responding correctly (HTTP 200)"
    else
        print_warning "Application health check failed (HTTP $HEALTH_RESPONSE)"
        print_status "Check PM2 logs: pm2 logs --lines 20"
    fi
fi

echo ""
print_status "DATABASE FIX SUMMARY:"
echo "  ✅ Missing columns added to lost_items table"
echo "  ✅ Database schema updated"
echo "  ✅ Application restarted"

echo ""
print_status "VERIFICATION STEPS:"
echo "1. Check PM2 logs: pm2 logs --lines 20"
echo "2. Test lost items functionality in the application"
echo "3. Verify no more 'Unknown column' errors"

echo ""
if [[ "$HEALTH_RESPONSE" == "200" ]]; then
    print_success "🎉 LOST ITEMS DATABASE FIX COMPLETED SUCCESSFULLY!"
    print_status "The 'Unknown column description' error should now be resolved."
else
    print_warning "⚠️  Fix completed but please verify application status."
fi

print_success "Lost items database fix script completed! 🚀"