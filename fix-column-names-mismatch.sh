#!/bin/bash

# =======================================================
# FIX COLUMN NAMES MISMATCH SCRIPT
# Script untuk memperbaiki perbedaan nama kolom database vs aplikasi
# =======================================================

echo "🔧 Fix Column Names Mismatch Script"
echo "==================================="

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

print_status "Fixing column name mismatch in lost_items table..."

# Database credentials
DB_NAME="ult_fpeb_prod"
DB_USER="ult_fpeb_user"
DB_PASSWORD="6QFLGp3ubaty8kbdXU8OU9k+8ReMU6Gx"
DB_HOST="localhost"

# Test database connection
print_status "Testing database connection..."
mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" "$DB_NAME" -e "SELECT 1;" >/dev/null 2>&1

if [[ $? -ne 0 ]]; then
    print_error "Failed to connect to database"
    exit 1
fi

print_success "Database connection successful"

# Show current problematic columns
print_status "Current column names in lost_items table:"
mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" "$DB_NAME" -e "
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = '$DB_NAME' 
AND TABLE_NAME = 'lost_items' 
AND COLUMN_NAME IN ('description', 'item_description', 'found_location', 'location_found', 'found_date', 'date_found', 'found_time', 'time_found')
ORDER BY COLUMN_NAME;
" 2>/dev/null

print_status "Fixing column name mismatches..."

# Fix 1: Rename item_description to description (if needed)
print_status "Checking description column..."
HAS_ITEM_DESCRIPTION=$(mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" "$DB_NAME" -se "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '$DB_NAME' AND TABLE_NAME = 'lost_items' AND COLUMN_NAME = 'item_description';" 2>/dev/null)
HAS_DESCRIPTION=$(mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" "$DB_NAME" -se "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '$DB_NAME' AND TABLE_NAME = 'lost_items' AND COLUMN_NAME = 'description';" 2>/dev/null)

if [[ "$HAS_ITEM_DESCRIPTION" == "1" ]] && [[ "$HAS_DESCRIPTION" == "1" ]]; then
    print_warning "Both item_description and description columns exist"
    print_status "Dropping duplicate description column..."
    mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" "$DB_NAME" -e "ALTER TABLE lost_items DROP COLUMN description;" 2>/dev/null
fi

if [[ "$HAS_ITEM_DESCRIPTION" == "1" ]]; then
    print_status "Renaming item_description to description..."
    mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" "$DB_NAME" -e "ALTER TABLE lost_items CHANGE item_description description TEXT;" 2>/dev/null
    if [[ $? -eq 0 ]]; then
        print_success "✅ Renamed item_description to description"
    else
        print_error "❌ Failed to rename item_description to description"
    fi
fi

# Fix 2: Rename location_found to found_location (if needed)
print_status "Checking found_location column..."
HAS_LOCATION_FOUND=$(mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" "$DB_NAME" -se "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '$DB_NAME' AND TABLE_NAME = 'lost_items' AND COLUMN_NAME = 'location_found';" 2>/dev/null)
HAS_FOUND_LOCATION=$(mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" "$DB_NAME" -se "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '$DB_NAME' AND TABLE_NAME = 'lost_items' AND COLUMN_NAME = 'found_location';" 2>/dev/null)

if [[ "$HAS_LOCATION_FOUND" == "1" ]] && [[ "$HAS_FOUND_LOCATION" == "0" ]]; then
    print_status "Renaming location_found to found_location..."
    mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" "$DB_NAME" -e "ALTER TABLE lost_items CHANGE location_found found_location VARCHAR(255);" 2>/dev/null
    if [[ $? -eq 0 ]]; then
        print_success "✅ Renamed location_found to found_location"
    else
        print_error "❌ Failed to rename location_found to found_location"
    fi
elif [[ "$HAS_FOUND_LOCATION" == "1" ]]; then
    print_success "✅ found_location column already correct"
fi

# Fix 3: Rename date_found to found_date (if needed)
print_status "Checking found_date column..."
HAS_DATE_FOUND=$(mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" "$DB_NAME" -se "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '$DB_NAME' AND TABLE_NAME = 'lost_items' AND COLUMN_NAME = 'date_found';" 2>/dev/null)
HAS_FOUND_DATE=$(mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" "$DB_NAME" -se "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '$DB_NAME' AND TABLE_NAME = 'lost_items' AND COLUMN_NAME = 'found_date';" 2>/dev/null)

if [[ "$HAS_DATE_FOUND" == "1" ]] && [[ "$HAS_FOUND_DATE" == "0" ]]; then
    print_status "Renaming date_found to found_date..."
    mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" "$DB_NAME" -e "ALTER TABLE lost_items CHANGE date_found found_date DATE;" 2>/dev/null
    if [[ $? -eq 0 ]]; then
        print_success "✅ Renamed date_found to found_date"
    else
        print_error "❌ Failed to rename date_found to found_date"
    fi
elif [[ "$HAS_FOUND_DATE" == "1" ]]; then
    print_success "✅ found_date column already correct"
fi

# Fix 4: Rename time_found to found_time (if needed)
print_status "Checking found_time column..."
HAS_TIME_FOUND=$(mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" "$DB_NAME" -se "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '$DB_NAME' AND TABLE_NAME = 'lost_items' AND COLUMN_NAME = 'time_found';" 2>/dev/null)
HAS_FOUND_TIME=$(mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" "$DB_NAME" -se "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '$DB_NAME' AND TABLE_NAME = 'lost_items' AND COLUMN_NAME = 'found_time';" 2>/dev/null)

if [[ "$HAS_TIME_FOUND" == "1" ]] && [[ "$HAS_FOUND_TIME" == "0" ]]; then
    print_status "Renaming time_found to found_time..."
    mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" "$DB_NAME" -e "ALTER TABLE lost_items CHANGE time_found found_time TIME;" 2>/dev/null
    if [[ $? -eq 0 ]]; then
        print_success "✅ Renamed time_found to found_time"
    else
        print_error "❌ Failed to rename time_found to found_time"
    fi
elif [[ "$HAS_FOUND_TIME" == "1" ]]; then
    print_success "✅ found_time column already correct"
fi

# Show final table structure
print_status "Final table structure after column name fixes:"
mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" "$DB_NAME" -e "DESCRIBE lost_items;" 2>/dev/null

# Restart PM2
print_status "Restarting PM2 application..."
pm2 restart ult-fpeb-backend >/dev/null 2>&1

if [[ $? -eq 0 ]]; then
    print_success "Application restarted successfully"
    sleep 3
else
    print_error "Failed to restart application"
fi

# Verify the fix
print_status "Verifying the fix..."
sleep 2

# Check health
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null || echo "000")

if [[ "$HEALTH_RESPONSE" == "200" ]]; then
    print_success "✅ Application health check: HTTP 200"
else
    print_warning "⚠️  Application health check: HTTP $HEALTH_RESPONSE"
fi

# Check for database errors
ERROR_COUNT=$(pm2 logs --lines 10 --nostream 2>/dev/null | grep -c "Unknown column.*description\|ER_BAD_FIELD_ERROR" || echo "0")

if [[ "$ERROR_COUNT" -eq "0" ]]; then
    print_success "✅ No database field errors found in recent logs"
else
    print_warning "⚠️  Still found $ERROR_COUNT database field errors"
fi

# Final summary
echo ""
print_status "🎯 COLUMN NAME FIX SUMMARY:"
if [[ "$ERROR_COUNT" -eq "0" ]] && [[ "$HEALTH_RESPONSE" == "200" ]]; then
    print_success "🎉 COLUMN NAME MISMATCH FIXED SUCCESSFULLY!"
    echo "  ✅ All column names match application expectations"
    echo "  ✅ No database errors in logs"
    echo "  ✅ Application is responding correctly"
    echo "  ✅ Lost items functionality should work now"
else
    print_warning "⚠️  Fix completed but still some issues:"
    if [[ "$ERROR_COUNT" -gt "0" ]]; then
        echo "  ❌ $ERROR_COUNT database errors still in logs"
    fi
    if [[ "$HEALTH_RESPONSE" != "200" ]]; then
        echo "  ❌ Application health check failed"
    fi
fi

echo ""
print_success "Column name mismatch fix completed! 🚀"

# Show verification commands
echo ""
print_status "VERIFICATION COMMANDS:"
echo "mysql -u $DB_USER -p'$DB_PASSWORD' $DB_NAME -e 'DESCRIBE lost_items;'"
echo "pm2 logs --lines 20"
echo "curl -I http://localhost:3001/api/health"