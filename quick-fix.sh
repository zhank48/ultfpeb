#!/bin/bash

# =======================================================
# QUICK DATABASE FIX for ULT FPEB Production
# Script cepat untuk fix masalah database production
# =======================================================

echo "🚀 Quick Database Fix for ULT FPEB"
echo "=================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if MySQL is available
if ! command -v mysql &> /dev/null; then
    print_error "MySQL client not found!"
    exit 1
fi

# Load database credentials from environment or prompt
if [[ -f "backend/.env" ]]; then
    print_status "Loading database config from backend/.env..."
    source backend/.env
elif [[ -f ".env" ]]; then
    print_status "Loading database config from .env..."
    source .env
else
    print_status "Please provide database credentials:"
    read -p "Database host (default: localhost): " DB_HOST
    DB_HOST=${DB_HOST:-localhost}
    
    read -p "Database name (default: ult_fpeb_prod): " DB_NAME
    DB_NAME=${DB_NAME:-ult_fpeb_prod}
    
    read -p "Database user: " DB_USER
    read -s -p "Database password: " DB_PASSWORD
    echo ""
fi

print_status "Connecting to database: ${DB_NAME}@${DB_HOST}"

# Execute the simple fix SQL
print_status "Executing database fixes..."

mysql -h "${DB_HOST}" -u "${DB_USER}" -p"${DB_PASSWORD}" "${DB_NAME}" << 'EOF'
-- Add missing checkout columns to visitors table
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS checkout_by_name VARCHAR(255) NULL COMMENT 'Name of checkout operator';
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS checkout_by_role VARCHAR(50) NULL COMMENT 'Role of checkout operator';  
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS checkout_by_avatar VARCHAR(255) NULL COMMENT 'Avatar URL of checkout operator';
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS checkout_by_user_id INT NULL COMMENT 'User ID of checkout operator';
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS checkout_by_email VARCHAR(255) NULL COMMENT 'Email of checkout operator';

-- Create visitor_edit_history table
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Visitor edit history tracking';

SELECT '✅ Database fixes applied successfully!' as status;
EOF

if [[ $? -eq 0 ]]; then
    print_success "Database fixes applied successfully!"
    
    # Verify the fixes
    print_status "Verifying fixes..."
    
    mysql -h "${DB_HOST}" -u "${DB_USER}" -p"${DB_PASSWORD}" "${DB_NAME}" -e "
        SELECT COUNT(*) as checkout_columns_count 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = '${DB_NAME}' 
        AND TABLE_NAME = 'visitors' 
        AND COLUMN_NAME IN ('checkout_by_name', 'checkout_by_role', 'checkout_by_avatar', 'checkout_by_user_id');
        
        SELECT COUNT(*) as edit_history_table_exists
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = '${DB_NAME}' 
        AND TABLE_NAME = 'visitor_edit_history';
    "
    
    print_success "Database verification completed!"
    
else
    print_error "Database fix failed!"
    exit 1
fi

# Find and restart the correct PM2 process
print_status "Looking for PM2 processes..."
if command -v pm2 &> /dev/null; then
    PM2_PROCESSES=$(pm2 list | grep -E "(ult|fpeb|backend|server)" | head -1)
    
    if [[ -n "$PM2_PROCESSES" ]]; then
        # Extract process name/id from PM2 list
        PROCESS_NAME=$(echo "$PM2_PROCESSES" | awk '{print $2}' | tr -d '│')
        print_status "Found PM2 process: $PROCESS_NAME"
        
        read -p "Restart PM2 process '$PROCESS_NAME'? (y/N): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            pm2 restart "$PROCESS_NAME"
            print_success "PM2 process restarted!"
        fi
    else
        print_status "No matching PM2 processes found. Showing all processes:"
        pm2 list
        echo ""
        print_status "You can manually restart with: pm2 restart <process_name>"
    fi
else
    print_status "PM2 not found. Please restart your application manually."
fi

print_success "Quick fix completed! 🎉"
print_status "Please test the following:"
echo "  - Visitor checkout functionality"
echo "  - User login"  
echo "  - Password change"
echo ""
print_status "Monitor logs with: pm2 logs <process_name>"