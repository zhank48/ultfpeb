#!/bin/bash

# =======================================================
# FINAL DATABASE FIX SCRIPT
# Script definitif untuk memperbaiki database lost_items
# =======================================================

echo "🔧 Final Database Fix Script"
echo "============================"

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

print_status "Starting final database fix for lost_items table..."

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

print_status "Database credentials:"
print_status "  - Database: $DB_NAME"
print_status "  - User: $DB_USER"
print_status "  - Host: $DB_HOST"

# Function to add column if not exists
add_column_if_not_exists() {
    local column_name=$1
    local column_definition=$2
    
    print_status "Checking column: $column_name"
    
    # Check if column exists
    COLUMN_EXISTS=$(mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" "$DB_NAME" -se "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '$DB_NAME' AND TABLE_NAME = 'lost_items' AND COLUMN_NAME = '$column_name';" 2>/dev/null)
    
    if [[ $? -ne 0 ]]; then
        print_error "Failed to check column existence for: $column_name"
        return 1
    fi
    
    if [[ "$COLUMN_EXISTS" == "0" ]]; then
        print_status "  → Adding missing column: $column_name"
        mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" "$DB_NAME" -e "ALTER TABLE lost_items ADD COLUMN $column_name $column_definition;" 2>/dev/null
        if [[ $? -eq 0 ]]; then
            print_success "  ✅ Successfully added: $column_name"
        else
            print_error "  ❌ Failed to add: $column_name"
            return 1
        fi
    else
        print_success "  ✅ Already exists: $column_name"
    fi
    return 0
}

# Test database connection first
print_status "Testing database connection..."
mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" "$DB_NAME" -e "SELECT 1;" >/dev/null 2>&1

if [[ $? -ne 0 ]]; then
    print_error "Failed to connect to database. Please check credentials."
    exit 1
fi

print_success "Database connection successful"

# Show current table structure
print_status "Current lost_items table structure:"
mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" "$DB_NAME" -e "DESCRIBE lost_items;" 2>/dev/null

# Add missing columns one by one
print_status "Adding missing columns..."

COLUMNS_TO_ADD=(
    "description:TEXT"
    "category:VARCHAR(100) DEFAULT NULL"
    "status:ENUM('found','returned','disposed') DEFAULT 'found'"
    "notes:TEXT"
    "handover_signature_data:TEXT"
    "received_by_operator:VARCHAR(255) DEFAULT NULL"
    "received_by_operator_id:INT UNSIGNED DEFAULT NULL"
)

TOTAL_ADDED=0
TOTAL_EXISTING=0
TOTAL_FAILED=0

for column_info in "${COLUMNS_TO_ADD[@]}"; do
    IFS=':' read -r column_name column_definition <<< "$column_info"
    
    if add_column_if_not_exists "$column_name" "$column_definition"; then
        # Check if it was actually added
        COLUMN_EXISTS_NOW=$(mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" "$DB_NAME" -se "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '$DB_NAME' AND TABLE_NAME = 'lost_items' AND COLUMN_NAME = '$column_name';" 2>/dev/null)
        if [[ "$COLUMN_EXISTS_NOW" == "1" ]]; then
            ((TOTAL_ADDED++))
        else
            ((TOTAL_EXISTING++))
        fi
    else
        ((TOTAL_FAILED++))
    fi
done

# Show results
echo ""
print_status "COLUMN UPDATE SUMMARY:"
echo "  ✅ Successfully processed: $((TOTAL_ADDED + TOTAL_EXISTING))"
echo "  🆕 Newly added: $TOTAL_ADDED"
echo "  📋 Already existed: $TOTAL_EXISTING"
echo "  ❌ Failed: $TOTAL_FAILED"

# Show final table structure
print_status "Final lost_items table structure:"
mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" "$DB_NAME" -e "DESCRIBE lost_items;" 2>/dev/null

# Count total columns
TOTAL_COLUMNS=$(mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" "$DB_NAME" -se "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '$DB_NAME' AND TABLE_NAME = 'lost_items';" 2>/dev/null)
print_success "Total columns in lost_items table: $TOTAL_COLUMNS"

# Restart the application
print_status "Restarting PM2 application..."

if command -v pm2 &> /dev/null; then
    PM2_PROCESS=$(pm2 list 2>/dev/null | grep -E "(ult|fpeb|backend)" | head -1 | awk '{print $2}' | tr -d '│' | xargs)
    
    if [[ -n "$PM2_PROCESS" ]]; then
        print_status "Restarting PM2 process: $PM2_PROCESS"
        pm2 restart "$PM2_PROCESS" --update-env >/dev/null 2>&1
        
        if [[ $? -eq 0 ]]; then
            print_success "Application restarted successfully"
            sleep 3
            
            # Show PM2 status
            pm2 list | head -3
        else
            print_error "Failed to restart application"
        fi
    else
        print_warning "PM2 process not found"
    fi
fi

# Verify the fix by checking for errors
print_status "Verifying the fix..."
sleep 2

# Check health endpoint
if command -v curl &> /dev/null; then
    HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null || echo "000")
    
    if [[ "$HEALTH_RESPONSE" == "200" ]]; then
        print_success "✅ Application health check: HTTP 200"
    else
        print_warning "⚠️  Application health check: HTTP $HEALTH_RESPONSE"
    fi
fi

# Check for database errors in recent logs
ERROR_COUNT=$(pm2 logs --lines 20 --nostream 2>/dev/null | grep -c "Unknown column.*description\|ER_BAD_FIELD_ERROR" || echo "0")

if [[ "$ERROR_COUNT" -eq "0" ]]; then
    print_success "✅ No database field errors found in recent logs"
else
    print_warning "⚠️  Still found $ERROR_COUNT database field errors in logs"
fi

# Final summary
echo ""
print_status "🎯 FINAL SUMMARY:"
if [[ "$TOTAL_FAILED" -eq "0" ]] && [[ "$ERROR_COUNT" -eq "0" ]] && [[ "$HEALTH_RESPONSE" == "200" ]]; then
    print_success "🎉 DATABASE FIX COMPLETED SUCCESSFULLY!"
    echo "  ✅ All required columns are present"
    echo "  ✅ No database errors in logs"
    echo "  ✅ Application is responding correctly"
    echo "  ✅ Lost items functionality should work now"
else
    print_warning "⚠️  FIX COMPLETED WITH SOME ISSUES:"
    if [[ "$TOTAL_FAILED" -gt "0" ]]; then
        echo "  ❌ $TOTAL_FAILED columns failed to add"
    fi
    if [[ "$ERROR_COUNT" -gt "0" ]]; then
        echo "  ❌ $ERROR_COUNT database errors still in logs"
    fi
    if [[ "$HEALTH_RESPONSE" != "200" ]]; then
        echo "  ❌ Application health check failed"
    fi
    
    echo ""
    print_status "TROUBLESHOOTING:"
    echo "  1. Check PM2 logs: pm2 logs --lines 30"
    echo "  2. Verify table structure: mysql -u $DB_USER -p'$DB_PASSWORD' $DB_NAME -e 'DESCRIBE lost_items;'"
    echo "  3. Test lost items functionality manually"
fi

echo ""
print_success "Final database fix script completed! 🚀"

# Show manual verification commands
echo ""
print_status "MANUAL VERIFICATION COMMANDS:"
echo "mysql -u $DB_USER -p'$DB_PASSWORD' $DB_NAME -e 'DESCRIBE lost_items;'"
echo "pm2 logs --lines 20"
echo "curl -I http://localhost:3001/api/health"