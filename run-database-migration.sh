#!/bin/bash

# =======================================================
# DATABASE MIGRATION RUNNER SCRIPT
# Safely run database migration on production/development
# =======================================================

echo "🗄️ Database Migration Runner"
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

# Function to check MySQL connection
check_mysql_connection() {
    local db_host="$1"
    local db_user="$2"
    local db_pass="$3"
    local db_name="$4"
    
    print_status "Testing MySQL connection..."
    
    if mysql -h "$db_host" -u "$db_user" -p"$db_pass" -e "USE $db_name; SELECT 1;" &> /dev/null; then
        print_success "✅ MySQL connection successful"
        return 0
    else
        print_error "❌ MySQL connection failed"
        return 1
    fi
}

# Function to backup database
backup_database() {
    local db_host="$1"
    local db_user="$2"
    local db_pass="$3"
    local db_name="$4"
    local backup_file="$5"
    
    print_status "Creating database backup..."
    
    if mysqldump -h "$db_host" -u "$db_user" -p"$db_pass" \
        --single-transaction \
        --routines \
        --triggers \
        --add-drop-table \
        "$db_name" > "$backup_file"; then
        print_success "✅ Database backup created: $backup_file"
        return 0
    else
        print_error "❌ Database backup failed"
        return 1
    fi
}

# Function to run migration
run_migration() {
    local db_host="$1"
    local db_user="$2"
    local db_pass="$3"
    local db_name="$4"
    local migration_file="$5"
    
    print_status "Running database migration..."
    
    if mysql -h "$db_host" -u "$db_user" -p"$db_pass" "$db_name" < "$migration_file"; then
        print_success "✅ Database migration completed successfully"
        return 0
    else
        print_error "❌ Database migration failed"
        return 1
    fi
}

# Main script starts here
print_status "Starting database migration process..."

# Check if migration file exists
MIGRATION_FILE="backend/sql/comprehensive_database_migration.sql"
if [[ ! -f "$MIGRATION_FILE" ]]; then
    print_error "Migration file not found: $MIGRATION_FILE"
    print_status "Please ensure you're running this script from the project root directory"
    exit 1
fi

# Database configuration
print_status "Please provide database connection details:"

# Try to detect database config from environment or .env file
if [[ -f "backend/.env" ]]; then
    print_status "Loading database config from backend/.env..."
    source backend/.env
    DB_HOST=${DB_HOST:-"localhost"}
    DB_USER=${DB_USER:-"root"}
    DB_NAME=${DB_NAME:-"ult_fpeb_db"}
    DB_PASSWORD=${DB_PASSWORD:-""}
elif [[ -f ".env" ]]; then
    print_status "Loading database config from .env..."
    source .env
    DB_HOST=${DB_HOST:-"localhost"}
    DB_USER=${DB_USER:-"root"}
    DB_NAME=${DB_NAME:-"ult_fpeb_db"}
    DB_PASSWORD=${DB_PASSWORD:-""}
else
    # Manual input
    read -p "Database Host [localhost]: " DB_HOST
    DB_HOST=${DB_HOST:-localhost}
    
    read -p "Database User [root]: " DB_USER
    DB_USER=${DB_USER:-root}
    
    read -p "Database Name [ult_fpeb_db]: " DB_NAME
    DB_NAME=${DB_NAME:-ult_fpeb_db}
    
    read -s -p "Database Password: " DB_PASSWORD
    echo
fi

# Verify connection
if ! check_mysql_connection "$DB_HOST" "$DB_USER" "$DB_PASSWORD" "$DB_NAME"; then
    print_error "Cannot connect to database. Please check your credentials."
    exit 1
fi

# Ask for confirmation
echo ""
print_warning "⚠️  You are about to run a comprehensive database migration on:"
echo "   Host: $DB_HOST"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo ""
print_warning "This migration will:"
echo "   • Create missing tables"
echo "   • Add missing columns"
echo "   • Add performance indexes"
echo "   • Add foreign key constraints"
echo "   • Create enhanced views"
echo "   • Update data consistency"
echo ""

read -p "Do you want to proceed? (yes/no): " CONFIRM
if [[ "$CONFIRM" != "yes" ]]; then
    print_status "Migration cancelled by user"
    exit 0
fi

# Create backup
BACKUP_DIR="database-backups"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/backup_before_migration_$(date +%Y%m%d_%H%M%S).sql"

if backup_database "$DB_HOST" "$DB_USER" "$DB_PASSWORD" "$DB_NAME" "$BACKUP_FILE"; then
    print_success "Database backed up successfully"
else
    print_error "Failed to create backup. Migration aborted for safety."
    exit 1
fi

# Run the migration
print_status "Executing comprehensive database migration..."
echo "Migration file: $MIGRATION_FILE"
echo "Target database: $DB_NAME@$DB_HOST"
echo ""

if run_migration "$DB_HOST" "$DB_USER" "$DB_PASSWORD" "$DB_NAME" "$MIGRATION_FILE"; then
    print_success "🎉 Database migration completed successfully!"
    
    # Show summary
    echo ""
    print_status "📊 MIGRATION SUMMARY:"
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "
        SELECT 
            (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()) as total_tables,
            (SELECT COUNT(*) FROM INFORMATION_SCHEMA.VIEWS WHERE TABLE_SCHEMA = DATABASE()) as total_views,
            (SELECT COUNT(DISTINCT TABLE_NAME) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE()) as tables_with_indexes
    " 2>/dev/null || true
    
    echo ""
    print_status "📋 NEXT STEPS:"
    echo "1. Restart your Node.js application"
    echo "2. Test all application functionality"  
    echo "3. Monitor application logs for any errors"
    echo "4. Verify upload files are accessible"
    echo "5. Test visitor management features"
    
    echo ""
    print_success "✨ Database is now synchronized with production structure!"
    
else
    print_error "💥 Database migration failed!"
    print_status "You can restore from backup if needed:"
    print_status "mysql -h $DB_HOST -u $DB_USER -p $DB_NAME < $BACKUP_FILE"
    exit 1
fi

echo ""
print_status "🔍 VERIFICATION COMMANDS:"
echo "Check tables: mysql -h $DB_HOST -u $DB_USER -p -e 'USE $DB_NAME; SHOW TABLES;'"
echo "Check views: mysql -h $DB_HOST -u $DB_USER -p -e 'USE $DB_NAME; SHOW FULL TABLES WHERE Table_type = \"VIEW\";'"
echo "View backup: ls -la $BACKUP_FILE"

print_success "Database migration process completed! 🚀"