#!/bin/bash

# =======================================================  
# MANUAL DATABASE FIX for ULT FPEB
# Script manual dengan input manual untuk avoid env parsing
# =======================================================

echo "🔧 Manual Database Fix for ULT FPEB"
echo "==================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

# Check MySQL
if ! command -v mysql &> /dev/null; then
    print_error "MySQL client not found!"
    exit 1
fi

# Manual input untuk avoid env file parsing error
print_status "Please provide database connection details:"
echo ""

read -p "Database host [localhost]: " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "Database name [ult_fpeb_prod]: " DB_NAME  
DB_NAME=${DB_NAME:-ult_fpeb_prod}

read -p "Database user [ult_fpeb_user]: " DB_USER
DB_USER=${DB_USER:-ult_fpeb_user}

echo -n "Database password: "
read -s DB_PASSWORD
echo ""

print_status "Testing connection to ${DB_NAME}@${DB_HOST}..."

# Test connection first
mysql -h "${DB_HOST}" -u "${DB_USER}" -p"${DB_PASSWORD}" -e "SELECT 1;" "${DB_NAME}" > /dev/null 2>&1

if [[ $? -ne 0 ]]; then
    print_error "Database connection failed! Please check your credentials."
    exit 1
fi

print_success "Database connection successful!"

# Execute the compatible SQL fix
print_status "Executing database fixes..."
echo ""

mysql -h "${DB_HOST}" -u "${DB_USER}" -p"${DB_PASSWORD}" "${DB_NAME}" < backend/sql/mysql_compatible_fix.sql

if [[ $? -eq 0 ]]; then
    print_success "Database fixes completed successfully!"
    
    # Additional verification
    print_status "Verifying the fixes..."
    
    CHECKOUT_COUNT=$(mysql -h "${DB_HOST}" -u "${DB_USER}" -p"${DB_PASSWORD}" "${DB_NAME}" -sN -e "
        SELECT COUNT(*) 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = '${DB_NAME}' 
        AND TABLE_NAME = 'visitors' 
        AND COLUMN_NAME IN ('checkout_by_name', 'checkout_by_role', 'checkout_by_avatar', 'checkout_by_user_id', 'checkout_by_email');")
    
    TABLE_EXISTS=$(mysql -h "${DB_HOST}" -u "${DB_USER}" -p"${DB_PASSWORD}" "${DB_NAME}" -sN -e "
        SELECT COUNT(*) 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = '${DB_NAME}' 
        AND TABLE_NAME = 'visitor_edit_history';")
    
    echo ""
    print_status "Verification Results:"
    echo "  - Checkout columns found: ${CHECKOUT_COUNT}/5"
    echo "  - visitor_edit_history table exists: $([ "$TABLE_EXISTS" -gt 0 ] && echo "YES" || echo "NO")"
    
    if [[ "$CHECKOUT_COUNT" -ge 4 ]] && [[ "$TABLE_EXISTS" -gt 0 ]]; then
        print_success "✅ All database fixes verified successfully!"
    else
        print_warning "⚠️  Some fixes may not have been applied correctly"
    fi
    
else
    print_error "Database fix failed!"
    exit 1
fi

echo ""
print_status "🔄 Now you need to restart your application:"
echo ""

# Check for PM2 processes
if command -v pm2 &> /dev/null; then
    print_status "PM2 processes:"
    pm2 list 2>/dev/null | grep -E "(online|stopped|errored)" || echo "No PM2 processes found"
    echo ""
    
    # Try to find any process that might be our app
    POSSIBLE_PROCESSES=$(pm2 list 2>/dev/null | grep -E "(ult|fpeb|server|backend|node)" | head -3)
    
    if [[ -n "$POSSIBLE_PROCESSES" ]]; then
        echo "Possible app processes found:"
        echo "$POSSIBLE_PROCESSES"
        echo ""
        
        read -p "Enter PM2 process name/id to restart (or press Enter to skip): " PROCESS_NAME
        
        if [[ -n "$PROCESS_NAME" ]]; then
            print_status "Restarting PM2 process: $PROCESS_NAME"
            pm2 restart "$PROCESS_NAME"
            
            if [[ $? -eq 0 ]]; then
                print_success "Process restarted successfully!"
                pm2 list
            else
                print_warning "Failed to restart process. Try manually: pm2 restart $PROCESS_NAME"
            fi
        fi
    else
        print_warning "No PM2 processes found. You may need to start your app:"
        echo "  cd backend && pm2 start server.js --name ult-fpeb"
    fi
else
    print_warning "PM2 not found. Please restart your Node.js application manually."
fi

echo ""
print_success "Database fix completed! 🎉"
print_status "Please test the following functionality:"
echo "  - Visitor checkout"
echo "  - User login"  
echo "  - Password change"
echo ""
print_status "Monitor logs for any remaining errors."