#!/bin/bash

# =======================================================
# DATABASE CONNECTION DIAGNOSTIC SCRIPT
# Script untuk mendiagnosa masalah koneksi database
# =======================================================

echo "🔍 Database Connection Diagnostic Tool"
echo "====================================="

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

print_step "1. System Information"
echo "Operating System: $(uname -a)"
echo "Current User: $(whoami)"
echo "Current Directory: $(pwd)"
echo ""

print_step "2. MySQL Service Status"
if command -v systemctl &> /dev/null; then
    if systemctl is-active --quiet mysql; then
        print_success "MySQL service is running"
        systemctl status mysql --no-pager -l
    elif systemctl is-active --quiet mysqld; then
        print_success "MySQL service (mysqld) is running"
        systemctl status mysqld --no-pager -l
    else
        print_error "MySQL service is not running"
        print_status "Try starting MySQL: sudo systemctl start mysql"
    fi
elif command -v service &> /dev/null; then
    service mysql status || service mysqld status
else
    print_warning "Cannot check MySQL service status"
fi

echo ""
print_step "3. MySQL Installation Check"
if command -v mysql &> /dev/null; then
    print_success "MySQL client found: $(which mysql)"
    mysql --version
else
    print_error "MySQL client not found!"
    print_status "Install MySQL client: sudo apt-get install mysql-client"
fi

echo ""
print_step "4. Network Connectivity"
print_status "Testing localhost connection..."
if ping -c 1 localhost &> /dev/null; then
    print_success "Localhost is reachable"
else
    print_error "Cannot reach localhost"
fi

echo ""
print_step "5. MySQL Port Check"
if command -v netstat &> /dev/null; then
    print_status "Checking MySQL port 3306..."
    if netstat -tlnp | grep -q ":3306"; then
        print_success "MySQL is listening on port 3306"
        netstat -tlnp | grep ":3306"
    else
        print_error "MySQL is not listening on port 3306"
    fi
elif command -v ss &> /dev/null; then
    print_status "Checking MySQL port 3306 with ss..."
    if ss -tlnp | grep -q ":3306"; then
        print_success "MySQL is listening on port 3306"
        ss -tlnp | grep ":3306"
    else
        print_error "MySQL is not listening on port 3306"
    fi
else
    print_warning "Cannot check port status (netstat/ss not available)"
fi

echo ""
print_step "6. Environment File Analysis"
if [[ -f "backend/.env" ]]; then
    print_success "Found backend/.env file"
    print_status "Database configuration:"
    
    echo "  DB_HOST=$(grep "^DB_HOST=" backend/.env 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'")"
    echo "  DB_PORT=$(grep "^DB_PORT=" backend/.env 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'")"
    echo "  DB_NAME=$(grep "^DB_NAME=" backend/.env 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'")"
    echo "  DB_USER=$(grep "^DB_USER=" backend/.env 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'")"
    echo "  DB_PASSWORD=$(grep "^DB_PASSWORD=" backend/.env 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'" | sed 's/./*/g')"
    
    # Check for problematic characters
    if grep -q '[^[:print:]]' backend/.env 2>/dev/null; then
        print_warning "Environment file contains non-printable characters"
    fi
    
    # Check for parsing issues
    if grep -q '=' backend/.env 2>/dev/null; then
        print_success "Environment file has valid key=value format"
    else
        print_error "Environment file format appears invalid"
    fi
    
else
    print_error "backend/.env file not found"
    print_status "Expected location: $(pwd)/backend/.env"
fi

echo ""
print_step "7. MySQL Connection Tests"

# Test 1: Root with no password
print_status "Test 1: MySQL root (no password)"
if mysql -u root -e "SELECT 1;" 2>/dev/null; then
    print_success "✅ Connected as root (no password)"
    
    # Check databases
    print_status "Available databases:"
    mysql -u root -e "SHOW DATABASES;" 2>/dev/null | grep -E "(ult|fpeb)" || echo "  No matching databases found"
    
    # Check users
    print_status "MySQL users:"
    mysql -u root -e "SELECT User, Host FROM mysql.user;" 2>/dev/null | grep -E "(ult|fpeb|root)" || echo "  Error retrieving users"
    
else
    print_warning "❌ Cannot connect as root (no password)"
fi

# Test 2: Try with env file credentials
if [[ -f "backend/.env" ]]; then
    ENV_USER=$(grep "^DB_USER=" backend/.env 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    ENV_PASSWORD=$(grep "^DB_PASSWORD=" backend/.env 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    ENV_DATABASE=$(grep "^DB_NAME=" backend/.env 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    ENV_HOST=$(grep "^DB_HOST=" backend/.env 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'" | head -1)
    
    if [[ -n "$ENV_USER" && -n "$ENV_DATABASE" ]]; then
        print_status "Test 2: Environment file credentials (${ENV_USER}@${ENV_HOST:-localhost}/${ENV_DATABASE})"
        
        if [[ -n "$ENV_PASSWORD" ]]; then
            if mysql -h "${ENV_HOST:-localhost}" -u "$ENV_USER" -p"$ENV_PASSWORD" -e "SELECT 1;" "$ENV_DATABASE" 2>/dev/null; then
                print_success "✅ Connected with env file credentials"
            else
                print_warning "❌ Cannot connect with env file credentials"
                
                # Try to diagnose the issue
                print_status "Diagnosing connection issue..."
                mysql -h "${ENV_HOST:-localhost}" -u "$ENV_USER" -p"$ENV_PASSWORD" -e "SELECT 1;" "$ENV_DATABASE" 2>&1 | head -3
            fi
        else
            print_warning "❌ No password found in env file"
        fi
    else
        print_warning "❌ Incomplete credentials in env file"
    fi
fi

echo ""
print_step "8. Suggested Solutions"

print_status "If connection failed, try these solutions:"
echo ""
echo "Solution 1: Reset MySQL root password"
echo "  sudo mysql"
echo "  ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';"
echo "  FLUSH PRIVILEGES;"
echo "  exit;"
echo ""

echo "Solution 2: Create/fix database user"
echo "  sudo mysql -u root -p"
echo "  CREATE DATABASE IF NOT EXISTS ult_fpeb_prod;"
echo "  CREATE USER IF NOT EXISTS 'ult_fpeb_user'@'localhost' IDENTIFIED BY 'your_password';"
echo "  GRANT ALL PRIVILEGES ON ult_fpeb_prod.* TO 'ult_fpeb_user'@'localhost';"
echo "  FLUSH PRIVILEGES;"
echo "  exit;"
echo ""

echo "Solution 3: Use MySQL root for fix"
echo "  mysql -u root -p ult_fpeb_prod < backend/sql/fix_checkout_error_500.sql"
echo ""

echo "Solution 4: Manual SQL execution"
echo "  mysql -u root -p"
echo "  USE ult_fpeb_prod;"
echo "  ALTER TABLE visitors ADD COLUMN checkout_by_role VARCHAR(50) NULL;"
echo "  -- (continue with other ALTER TABLE commands)"
echo ""

print_step "9. Quick Fix Command"
print_status "If you want to run the fix immediately with root user:"
echo ""
echo "mysql -u root -p ult_fpeb_prod << 'EOF'"
echo "ALTER TABLE visitors ADD COLUMN IF NOT EXISTS checkout_by_name VARCHAR(255) NULL;"
echo "ALTER TABLE visitors ADD COLUMN IF NOT EXISTS checkout_by_role VARCHAR(50) NULL;"
echo "ALTER TABLE visitors ADD COLUMN IF NOT EXISTS checkout_by_avatar VARCHAR(255) NULL;"
echo "ALTER TABLE visitors ADD COLUMN IF NOT EXISTS checkout_by_user_id INT NULL;"
echo "ALTER TABLE visitors ADD COLUMN IF NOT EXISTS checkout_by_email VARCHAR(255) NULL;"
echo "SELECT 'Checkout columns added successfully!' as status;"
echo "EOF"

echo ""
print_success "Diagnostic completed! Use the information above to resolve connection issues."