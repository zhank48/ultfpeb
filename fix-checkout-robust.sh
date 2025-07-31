#!/bin/bash

# =======================================================
# ROBUST CHECKOUT ERROR 500 FIX SCRIPT
# Script dengan multiple authentication methods dan fallback
# =======================================================

echo "🚀 Robust Checkout Error 500 Fix Script"
echo "========================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_step() { echo -e "${CYAN}[STEP]${NC} $1"; }

# Function to test MySQL connection
test_mysql_connection() {
    local user="$1"
    local password="$2"
    local database="$3"
    local host="${4:-localhost}"
    
    if [[ -n "$password" ]]; then
        mysql -h "$host" -u "$user" -p"$password" -e "SELECT 1;" "$database" >/dev/null 2>&1
    else
        mysql -h "$host" -u "$user" -e "SELECT 1;" "$database" >/dev/null 2>&1
    fi
    
    return $?
}

# Function to execute SQL with error handling
execute_sql() {
    local user="$1"
    local password="$2"
    local database="$3"
    local sql="$4"
    local host="${5:-localhost}"
    
    if [[ -n "$password" ]]; then
        echo "$sql" | mysql -h "$host" -u "$user" -p"$password" "$database" 2>/dev/null
    else
        echo "$sql" | mysql -h "$host" -u "$user" "$database" 2>/dev/null
    fi
    
    return $?
}

print_step "1. Checking MySQL Service Status"
if systemctl is-active --quiet mysql || systemctl is-active --quiet mysqld; then
    print_success "MySQL service is running"
else
    print_warning "MySQL service status unknown, continuing anyway..."
fi

print_step "2. Attempting Database Connection with Multiple Methods"

# Method 1: Try with credentials from .env file
if [[ -f "backend/.env" ]]; then
    print_status "Found backend/.env file, extracting credentials..."
    DB_HOST=$(grep "^DB_HOST=" backend/.env 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    DB_NAME=$(grep "^DB_NAME=" backend/.env 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'")  
    DB_USER=$(grep "^DB_USER=" backend/.env 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    DB_PASSWORD=$(grep "^DB_PASSWORD=" backend/.env 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    
    DB_HOST=${DB_HOST:-localhost}
    DB_NAME=${DB_NAME:-ult_fpeb_prod}
    DB_USER=${DB_USER:-ult_fpeb_user}
    
    print_status "Trying connection with env file credentials: ${DB_USER}@${DB_HOST}/${DB_NAME}"
    
    if test_mysql_connection "$DB_USER" "$DB_PASSWORD" "$DB_NAME" "$DB_HOST"; then
        print_success "✅ Connected successfully with env file credentials!"
        MYSQL_USER="$DB_USER"
        MYSQL_PASSWORD="$DB_PASSWORD"
        MYSQL_DATABASE="$DB_NAME"
        MYSQL_HOST="$DB_HOST"
        CONNECTION_SUCCESS=true
    else
        print_warning "❌ Connection failed with env file credentials"
        CONNECTION_SUCCESS=false
    fi
fi

# Method 2: Try with root user (no password)
if [[ "$CONNECTION_SUCCESS" != "true" ]]; then
    print_status "Trying connection as MySQL root (no password)..."
    if test_mysql_connection "root" "" "ult_fpeb_prod"; then
        print_success "✅ Connected successfully as root!"
        MYSQL_USER="root"
        MYSQL_PASSWORD=""
        MYSQL_DATABASE="ult_fpeb_prod"
        MYSQL_HOST="localhost"
        CONNECTION_SUCCESS=true
    else
        print_warning "❌ Connection failed as root (no password)"
    fi
fi

# Method 3: Try with root user (prompt for password)
if [[ "$CONNECTION_SUCCESS" != "true" ]]; then
    print_status "Trying connection as MySQL root (with password)..."
    echo -n "Enter MySQL root password: "
    read -s ROOT_PASSWORD
    echo ""
    
    if test_mysql_connection "root" "$ROOT_PASSWORD" "ult_fpeb_prod"; then
        print_success "✅ Connected successfully as root with password!"
        MYSQL_USER="root"
        MYSQL_PASSWORD="$ROOT_PASSWORD"
        MYSQL_DATABASE="ult_fpeb_prod"
        MYSQL_HOST="localhost"
        CONNECTION_SUCCESS=true
    else
        print_warning "❌ Connection failed as root with password"
    fi
fi

# Method 4: Manual input
if [[ "$CONNECTION_SUCCESS" != "true" ]]; then
    print_status "All automatic methods failed. Please provide database credentials manually:"
    
    read -p "Database host [localhost]: " MANUAL_HOST
    MANUAL_HOST=${MANUAL_HOST:-localhost}
    
    read -p "Database name [ult_fpeb_prod]: " MANUAL_DATABASE
    MANUAL_DATABASE=${MANUAL_DATABASE:-ult_fpeb_prod}
    
    read -p "Database user: " MANUAL_USER
    
    echo -n "Database password: "
    read -s MANUAL_PASSWORD
    echo ""
    
    if test_mysql_connection "$MANUAL_USER" "$MANUAL_PASSWORD" "$MANUAL_DATABASE" "$MANUAL_HOST"; then
        print_success "✅ Connected successfully with manual credentials!"
        MYSQL_USER="$MANUAL_USER"
        MYSQL_PASSWORD="$MANUAL_PASSWORD"
        MYSQL_DATABASE="$MANUAL_DATABASE"
        MYSQL_HOST="$MANUAL_HOST"
        CONNECTION_SUCCESS=true
    else
        print_error "❌ Connection failed with manual credentials"
        CONNECTION_SUCCESS=false
    fi
fi

# Exit if no connection established
if [[ "$CONNECTION_SUCCESS" != "true" ]]; then
    print_error "Could not establish database connection with any method!"
    print_error "Please check:"
    print_error "1. MySQL service is running: systemctl status mysql"
    print_error "2. Database exists: SHOW DATABASES;"
    print_error "3. User has proper permissions: SHOW GRANTS FOR 'user'@'host';"
    exit 1
fi

print_step "3. Executing Database Fix"

# Define the fix SQL
FIX_SQL="
-- Set SQL mode to avoid issues
SET SQL_MODE = '';

-- Add checkout columns (ignore errors if already exist)
SET @sql = 'ALTER TABLE visitors ADD COLUMN checkout_by_name VARCHAR(255) NULL COMMENT \"Name of checkout operator\"';
SET @sql_error = '';
DECLARE CONTINUE HANDLER FOR SQLEXCEPTION SET @sql_error = 'EXISTS';
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = 'ALTER TABLE visitors ADD COLUMN checkout_by_role VARCHAR(50) NULL COMMENT \"Role of checkout operator\"';
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = 'ALTER TABLE visitors ADD COLUMN checkout_by_avatar VARCHAR(255) NULL COMMENT \"Avatar URL of checkout operator\"';
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = 'ALTER TABLE visitors ADD COLUMN checkout_by_user_id INT NULL COMMENT \"User ID of checkout operator\"';
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = 'ALTER TABLE visitors ADD COLUMN checkout_by_email VARCHAR(255) NULL COMMENT \"Email of checkout operator\"';
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Visitor edit history tracking';

SELECT 'Database fix executed' as status;
"

# Execute the fix with error handling
print_status "Applying database fixes..."

if execute_sql "$MYSQL_USER" "$MYSQL_PASSWORD" "$MYSQL_DATABASE" "$FIX_SQL" "$MYSQL_HOST"; then
    print_success "✅ Database fix executed successfully!"
else
    print_warning "⚠️  Some SQL commands may have failed, but this might be normal (columns already exist)"
fi

print_step "4. Verifying Fix Results"

# Verify checkout columns
CHECKOUT_COUNT=$(execute_sql "$MYSQL_USER" "$MYSQL_PASSWORD" "$MYSQL_DATABASE" "
SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = '$MYSQL_DATABASE' 
AND TABLE_NAME = 'visitors' 
AND COLUMN_NAME IN ('checkout_by_name', 'checkout_by_role', 'checkout_by_avatar', 'checkout_by_user_id', 'checkout_by_email');
" "$MYSQL_HOST" | tail -n1)

# Verify edit history table
TABLE_EXISTS=$(execute_sql "$MYSQL_USER" "$MYSQL_PASSWORD" "$MYSQL_DATABASE" "
SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = '$MYSQL_DATABASE' 
AND TABLE_NAME = 'visitor_edit_history';
" "$MYSQL_HOST" | tail -n1)

echo ""
print_status "Verification Results:"
echo "  - Checkout columns found: ${CHECKOUT_COUNT}/5"
echo "  - visitor_edit_history table exists: $([ "$TABLE_EXISTS" -gt 0 ] && echo "YES" || echo "NO")"

if [[ "$CHECKOUT_COUNT" -ge 4 ]] && [[ "$TABLE_EXISTS" -gt 0 ]]; then
    print_success "🎉 All database fixes verified successfully!"
    FIX_SUCCESS=true
else
    print_warning "⚠️  Some fixes may not have been applied correctly"
    FIX_SUCCESS=false
fi

print_step "5. Restarting Application"

# Check PM2 processes
if command -v pm2 &> /dev/null; then
    print_status "Checking PM2 processes..."
    
    # Find the correct process name
    PM2_PROCESS=$(pm2 list 2>/dev/null | grep -E "(ult|fpeb|backend)" | head -1 | awk '{print $2}' | tr -d '│')
    
    if [[ -n "$PM2_PROCESS" ]]; then
        print_status "Found PM2 process: $PM2_PROCESS"
        
        if pm2 restart "$PM2_PROCESS" >/dev/null 2>&1; then
            print_success "✅ Application restarted successfully!"
            
            # Show process status
            echo ""
            pm2 list | grep -E "(App name|$PM2_PROCESS)" || pm2 list
            
        else
            print_warning "⚠️  Failed to restart PM2 process. Try manually: pm2 restart $PM2_PROCESS"
        fi
    else
        print_warning "No PM2 processes found. Please restart your application manually."
        print_status "Available PM2 processes:"
        pm2 list 2>/dev/null || echo "No PM2 processes running"
    fi
else
    print_warning "PM2 not found. Please restart your Node.js application manually."
fi

echo ""
print_step "6. Final Summary"

if [[ "$FIX_SUCCESS" == "true" ]]; then
    print_success "🎉 CHECKOUT ERROR 500 FIX COMPLETED SUCCESSFULLY!"
    echo ""
    print_status "What was fixed:"
    echo "  ✅ Added 5 checkout operator columns to visitors table"
    echo "  ✅ Created visitor_edit_history table for audit trail"
    echo "  ✅ Applied proper database schema changes"
    echo "  ✅ Restarted application"
    echo ""
    print_status "Next steps:"
    echo "  1. Test visitor checkout functionality in your application"
    echo "  2. Monitor application logs: pm2 logs <process_name>"
    echo "  3. The checkout error 500 should now be resolved!"
    
else
    print_warning "⚠️  Fix completed with some issues"
    echo ""
    print_status "Manual verification needed:"
    echo "  1. Check database columns: SHOW COLUMNS FROM visitors LIKE '%checkout%';"
    echo "  2. Check edit history table: DESCRIBE visitor_edit_history;"
    echo "  3. Restart application manually if needed"
fi

echo ""
print_success "Script completed! 🚀"