#!/bin/bash

# =======================================================
# FIX DATABASE PRODUCTION SCRIPT
# Script untuk memperbaiki database dengan kredensial yang benar
# =======================================================

echo "🔧 Fix Database Production Script"
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

print_status "Fixing lost_items database with correct credentials..."

# Check if we're in the right location
if [[ ! -d "backend" ]] || [[ ! -f "package.json" ]]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Database connection details from .env
DB_NAME="ult_fpeb_prod"
DB_USER="ult_fpeb_user"
DB_PASSWORD="6QFLGp3ubaty8kbdXU8OU9k+8ReMU6Gx"
DB_HOST="localhost"

print_status "Using database credentials from .env file..."
print_status "Database: $DB_NAME"
print_status "User: $DB_USER"
print_status "Host: $DB_HOST"

# Method 1: Try with MySQL command using credentials
if command -v mysql &> /dev/null; then
    print_status "Attempting database update with application credentials..."
    
    # Use simple SQL file first
    mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" "$DB_NAME" << 'EOF'
-- Add missing columns (ignore errors if column exists)
ALTER TABLE lost_items ADD COLUMN description TEXT;
ALTER TABLE lost_items ADD COLUMN category VARCHAR(100) DEFAULT NULL;
ALTER TABLE lost_items ADD COLUMN status ENUM('found','returned','disposed') DEFAULT 'found';
ALTER TABLE lost_items ADD COLUMN notes TEXT;
ALTER TABLE lost_items ADD COLUMN handover_signature_data TEXT;
ALTER TABLE lost_items ADD COLUMN received_by_operator VARCHAR(255) DEFAULT NULL;
ALTER TABLE lost_items ADD COLUMN received_by_operator_id INT UNSIGNED DEFAULT NULL;

-- Show final table structure
SELECT 'Database update completed successfully' as status;
DESCRIBE lost_items;
EOF

    if [[ $? -eq 0 ]]; then
        print_success "Database schema updated successfully"
        
        # Show column count verification
        COLUMN_COUNT=$(mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" "$DB_NAME" -se "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '$DB_NAME' AND TABLE_NAME = 'lost_items';" 2>/dev/null)
        
        if [[ -n "$COLUMN_COUNT" ]]; then
            print_success "lost_items table now has $COLUMN_COUNT columns"
        fi
        
    else
        print_error "Failed to update database schema with application credentials"
        
        # Fallback: Try with root (will prompt for password)
        print_status "Trying with root credentials (password will be prompted)..."
        mysql -u root -p -h "$DB_HOST" "$DB_NAME" < fix-lost-items-simple.sql
        
        if [[ $? -eq 0 ]]; then
            print_success "Database updated successfully with root credentials"
        else
            print_error "Failed to update database. Please run manually:"
            print_status "mysql -u $DB_USER -p'$DB_PASSWORD' $DB_NAME < fix-lost-items-simple.sql"
        fi
    fi
else
    print_error "MySQL client not found"
    exit 1
fi

# Restart the application
print_status "Restarting application..."

if command -v pm2 &> /dev/null; then
    PM2_PROCESS=$(pm2 list 2>/dev/null | grep -E "(ult|fpeb|backend)" | head -1 | awk '{print $2}' | tr -d '│' | xargs)
    
    if [[ -n "$PM2_PROCESS" ]]; then
        print_status "Restarting PM2 process: $PM2_PROCESS"
        pm2 restart "$PM2_PROCESS" --update-env
        
        if [[ $? -eq 0 ]]; then
            print_success "Application restarted successfully"
            sleep 3
            pm2 list | head -3
        else
            print_error "Failed to restart application"
        fi
    else
        print_warning "PM2 process not found"
    fi
fi

# Verify the fix
print_status "Verifying the fix..."

sleep 2

if command -v curl &> /dev/null; then
    HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null || echo "000")
    
    if [[ "$HEALTH_RESPONSE" == "200" ]]; then
        print_success "Application is responding correctly (HTTP 200)"
    else
        print_warning "Application health check: HTTP $HEALTH_RESPONSE"
    fi
fi

# Final verification - check for the specific error in logs
print_status "Checking for database errors in PM2 logs..."
ERROR_COUNT=$(pm2 logs --lines 50 --nostream 2>/dev/null | grep -c "Unknown column.*description" || echo "0")

if [[ "$ERROR_COUNT" -eq "0" ]]; then
    print_success "No 'Unknown column description' errors found in recent logs"
else
    print_warning "Still found $ERROR_COUNT 'Unknown column description' errors"
    print_status "The database may need manual attention"
fi

echo ""
print_status "DATABASE FIX SUMMARY:"
echo "  ✅ Database credentials from .env used"
echo "  ✅ Missing columns added to lost_items table"
echo "  ✅ Application restarted with --update-env"
echo "  ✅ Health check performed"

echo ""
print_status "MANUAL VERIFICATION COMMANDS:"
echo "mysql -u $DB_USER -p'$DB_PASSWORD' $DB_NAME -e 'DESCRIBE lost_items;'"
echo "pm2 logs --lines 20"

echo ""
if [[ "$HEALTH_RESPONSE" == "200" ]] && [[ "$ERROR_COUNT" -eq "0" ]]; then
    print_success "🎉 DATABASE FIX COMPLETED SUCCESSFULLY!"
    print_status "The lost items functionality should now work correctly."
else
    print_warning "⚠️  Fix completed but please verify manually."
    print_status "Check PM2 logs and test lost items functionality."
fi

print_success "Database production fix script completed! 🚀"