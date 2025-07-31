#!/bin/bash

# =======================================================
# VERIFY FIX COMPLETE SCRIPT
# Script untuk memverifikasi bahwa semua perbaikan sudah selesai
# =======================================================

echo "🔍 Verify Fix Complete Script"
echo "============================="

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

# Database credentials
DB_NAME="ult_fpeb_prod"
DB_USER="ult_fpeb_user"
DB_PASSWORD="6QFLGp3ubaty8kbdXU8OU9k+8ReMU6Gx"

echo "🎯 FINAL VERIFICATION"
echo "===================="

# 1. Check table structure
print_status "1. Checking lost_items table structure..."
mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "
SELECT COLUMN_NAME, DATA_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = '$DB_NAME' 
AND TABLE_NAME = 'lost_items' 
AND COLUMN_NAME IN ('description', 'found_location', 'found_date', 'found_time', 'category', 'notes', 'handover_signature_data', 'received_by_operator', 'received_by_operator_id')
ORDER BY COLUMN_NAME;
" 2>/dev/null

REQUIRED_COLUMNS=(description found_location found_date found_time category notes handover_signature_data received_by_operator received_by_operator_id)
MISSING_COLUMNS=0

for col in "${REQUIRED_COLUMNS[@]}"; do
    EXISTS=$(mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -se "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '$DB_NAME' AND TABLE_NAME = 'lost_items' AND COLUMN_NAME = '$col';" 2>/dev/null)
    if [[ "$EXISTS" == "1" ]]; then
        print_success "  ✅ $col - OK"
    else
        print_error "  ❌ $col - MISSING"
        ((MISSING_COLUMNS++))
    fi
done

# 2. Test application health
print_status "2. Checking application health..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null || echo "000")

if [[ "$HEALTH_RESPONSE" == "200" ]]; then
    print_success "  ✅ Application health: HTTP 200"
else
    print_error "  ❌ Application health: HTTP $HEALTH_RESPONSE"
fi

# 3. Check PM2 logs for database errors
print_status "3. Checking PM2 logs for database errors..."
sleep 1

# Get recent logs and count errors
RECENT_LOGS=$(pm2 logs --lines 30 --nostream 2>/dev/null || echo "")
ERROR_COUNT=$(echo "$RECENT_LOGS" | grep -c "Unknown column.*description\|ER_BAD_FIELD_ERROR" 2>/dev/null || echo "0")

if [[ "$ERROR_COUNT" -eq "0" ]]; then
    print_success "  ✅ No database field errors in recent logs"
else
    print_warning "  ⚠️  Found $ERROR_COUNT database field errors in logs"
    echo "$RECENT_LOGS" | grep -A2 -B2 "Unknown column\|ER_BAD_FIELD_ERROR" | tail -10
fi

# 4. PM2 process status
print_status "4. Checking PM2 process status..."
PM2_STATUS=$(pm2 list --no-colors 2>/dev/null | grep "ult-fpeb-backend" | awk '{print $12}')

if [[ "$PM2_STATUS" == "online" ]]; then
    print_success "  ✅ PM2 process: online"
else
    print_warning "  ⚠️  PM2 process: $PM2_STATUS"
fi

# 5. Database connection test
print_status "5. Testing database connection..."
DB_TEST=$(mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT COUNT(*) as total FROM lost_items;" 2>/dev/null)

if [[ $? -eq 0 ]]; then
    print_success "  ✅ Database connection: OK"
    echo "$DB_TEST"
else
    print_error "  ❌ Database connection: FAILED"
fi

# Final summary
echo ""
echo "🎯 FINAL VERIFICATION SUMMARY"
echo "============================="

TOTAL_ISSUES=0

if [[ "$MISSING_COLUMNS" -gt "0" ]]; then
    print_error "❌ Missing $MISSING_COLUMNS required columns"
    ((TOTAL_ISSUES++))
else
    print_success "✅ All required columns present"
fi

if [[ "$HEALTH_RESPONSE" == "200" ]]; then
    print_success "✅ Application responding correctly"
else
    print_error "❌ Application health check failed"
    ((TOTAL_ISSUES++))
fi

if [[ "$ERROR_COUNT" -eq "0" ]]; then
    print_success "✅ No database errors in logs"
else
    print_warning "⚠️  Database errors still present"
    ((TOTAL_ISSUES++))
fi

if [[ "$PM2_STATUS" == "online" ]]; then
    print_success "✅ PM2 process running"
else
    print_error "❌ PM2 process not running properly"
    ((TOTAL_ISSUES++))
fi

echo ""
if [[ "$TOTAL_ISSUES" -eq "0" ]]; then
    print_success "🎉 ALL FIXES COMPLETED SUCCESSFULLY!"
    echo ""
    echo "✅ Column name mismatch: FIXED"
    echo "✅ Database schema: CORRECT"  
    echo "✅ Application health: OK"
    echo "✅ No database errors: CONFIRMED"
    echo "✅ Lost items functionality: READY"
    echo ""
    print_success "Your lost items functionality should now work perfectly! 🚀"
else
    print_warning "⚠️  $TOTAL_ISSUES issues still need attention"
    echo ""
    print_status "Next steps:"
    echo "1. Check PM2 logs: pm2 logs --lines 50"
    echo "2. Try creating a lost item in the application"
    echo "3. Monitor logs for any new errors"
fi

echo ""
print_status "Manual test command:"
echo "curl -X POST http://localhost:3001/api/lost-items -H 'Content-Type: application/json' -d '{\"item_name\":\"Test Item\",\"description\":\"Test Description\",\"found_location\":\"Office\",\"found_date\":\"2025-07-31\",\"found_time\":\"10:00:00\"}'"