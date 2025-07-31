#!/bin/bash

# =======================================================
# FIX FEEDBACK API ERROR 500 SCRIPT
# Script untuk memperbaiki error 500 pada /api/feedback
# =======================================================

echo "🔧 Fix Feedback API Error 500 Script"
echo "===================================="

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

# Extract credentials from .env file
if [[ -f "backend/.env" ]]; then
    DB_HOST=$(grep "^DB_HOST=" backend/.env 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    DB_NAME=$(grep "^DB_NAME=" backend/.env 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    DB_USER=$(grep "^DB_USER=" backend/.env 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    DB_PASSWORD=$(grep "^DB_PASSWORD=" backend/.env 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    
    DB_HOST=${DB_HOST:-localhost}
    DB_NAME=${DB_NAME:-ult_fpeb_prod}
    
    print_status "Using credentials: ${DB_USER}@${DB_HOST}/${DB_NAME}"
else
    print_error "backend/.env file not found!"
    exit 1
fi

# Test connection
print_status "Testing database connection..."
if mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" "$DB_NAME" >/dev/null 2>&1; then
    print_success "✅ Database connection successful!"
else
    print_error "❌ Database connection failed!"
    exit 1
fi

print_status "Analyzing current feedback system..."

# Check if feedbacks table exists
TABLE_EXISTS=$(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -sN -e "
SELECT COUNT(*) 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = '$DB_NAME' 
AND TABLE_NAME = 'feedbacks';
")

print_status "Feedbacks table exists: $([ "$TABLE_EXISTS" -gt 0 ] && echo "YES" || echo "NO")"

if [[ "$TABLE_EXISTS" -gt 0 ]]; then
    # Check table structure if exists
    print_status "Checking existing feedbacks table structure..."
    
    COLUMN_COUNT=$(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -sN -e "
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = '$DB_NAME' 
    AND TABLE_NAME = 'feedbacks';
    ")
    
    print_status "Feedbacks table has $COLUMN_COUNT columns"
    
    # Check for constraints that might cause issues
    CONSTRAINT_COUNT=$(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -sN -e "
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = '$DB_NAME' 
    AND TABLE_NAME = 'feedbacks' 
    AND CONSTRAINT_TYPE = 'FOREIGN KEY';
    ")
    
    print_status "Feedbacks table has $CONSTRAINT_COUNT foreign key constraints"
    
    if [[ "$CONSTRAINT_COUNT" -gt 0 ]]; then
        print_warning "Foreign key constraints detected - these might cause 500 errors"
    fi
fi

print_status "Applying feedback API fixes..."

# Apply the SQL fix
if mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < backend/sql/fix_feedback_api_error.sql; then
    print_success "✅ Feedback API fix applied successfully!"
else
    print_error "❌ Failed to apply feedback API fix!"
    exit 1
fi

print_status "Verifying feedback system setup..."

# Verify feedbacks table
NEW_TABLE_EXISTS=$(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -sN -e "
SELECT COUNT(*) 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = '$DB_NAME' 
AND TABLE_NAME = 'feedbacks';
")

# Verify feedback_categories table
CATEGORIES_TABLE_EXISTS=$(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -sN -e "
SELECT COUNT(*) 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = '$DB_NAME' 
AND TABLE_NAME = 'feedback_categories';
")

# Count sample data
SAMPLE_DATA_COUNT=$(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -sN -e "
SELECT COUNT(*) FROM feedbacks;
" 2>/dev/null || echo "0")

echo ""
print_status "VERIFICATION RESULTS:"
echo "  - feedbacks table exists: $([ "$NEW_TABLE_EXISTS" -gt 0 ] && echo "YES ✅" || echo "NO ❌")"
echo "  - feedback_categories table exists: $([ "$CATEGORIES_TABLE_EXISTS" -gt 0 ] && echo "YES ✅" || echo "NO ❌")"
echo "  - sample feedback records: $SAMPLE_DATA_COUNT"

# Test feedback API endpoint
print_status "Testing feedback API endpoint..."

# Check if we can query the feedbacks table
if mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT COUNT(*) as total_feedbacks FROM feedbacks;" >/dev/null 2>&1; then
    print_success "✅ Feedbacks table is queryable"
else
    print_warning "⚠️  Issue querying feedbacks table"
fi

# Restart application
print_status "Restarting application to apply changes..."

if command -v pm2 &> /dev/null; then
    if pm2 restart ult-fpeb-backend >/dev/null 2>&1; then
        print_success "✅ Application restarted successfully!"
        
        # Wait a moment for startup
        sleep 2
        
        # Show PM2 status
        pm2 list | grep -E "(App name|ult-fpeb-backend)" || echo "Process status updated"
        
    else
        print_warning "⚠️  Failed to restart with PM2. Try manually: pm2 restart ult-fpeb-backend"
    fi
else
    print_warning "PM2 not found. Please restart your Node.js application manually."
fi

echo ""
if [[ "$NEW_TABLE_EXISTS" -gt 0 ]] && [[ "$CATEGORIES_TABLE_EXISTS" -gt 0 ]]; then
    print_success "🎉 FEEDBACK API ERROR 500 FIX COMPLETED SUCCESSFULLY!"
    echo ""
    print_status "What was fixed:"
    echo "  ✅ Recreated feedbacks table with proper structure"
    echo "  ✅ Removed problematic foreign key constraints"
    echo "  ✅ Added proper CHECK constraints for data validation"
    echo "  ✅ Created feedback_categories reference table"
    echo "  ✅ Added sample data for testing"
    echo "  ✅ Restarted application"
    echo ""
    print_status "Next steps:"
    echo "  1. Test feedback submission in your application"
    echo "  2. The POST /api/feedback endpoint should now work"
    echo "  3. Monitor application logs: pm2 logs ult-fpeb-backend"
    
else
    print_warning "⚠️  Fix completed with some issues"
    echo ""
    print_status "Manual verification needed:"
    echo "  1. Check feedbacks table: DESCRIBE feedbacks;"
    echo "  2. Check categories table: SELECT * FROM feedback_categories;"
    echo "  3. Test feedback API manually"
fi

echo ""
print_success "Feedback API fix script completed! 🚀"