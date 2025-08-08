#!/bin/bash

# =======================================================
# DEVELOPMENT DATABASE SETUP SCRIPT
# Setup database untuk development environment
# =======================================================

echo "🔧 Development Database Setup"
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

# Default configuration
DB_HOST="localhost"
DB_USER="root"
DB_NAME="ult_fpeb_dev"
DB_PASSWORD=""

print_status "Setting up development database..."

# Check if MySQL is available
if ! command -v mysql &> /dev/null; then
    print_error "MySQL not found. Please install MySQL first."
    exit 1
fi

# Test MySQL connection
print_status "Testing MySQL connection..."
if ! mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" &> /dev/null; then
    print_error "Cannot connect to MySQL. Please check your MySQL installation."
    print_status "Make sure MySQL is running and you have the correct credentials."
    exit 1
fi

print_success "✅ MySQL connection successful"

# Create database if it doesn't exist
print_status "Creating development database: $DB_NAME"
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

if [[ $? -eq 0 ]]; then
    print_success "✅ Database $DB_NAME created/verified"
else
    print_error "❌ Failed to create database"
    exit 1
fi

# Run comprehensive migration
print_status "Running comprehensive database migration..."
if [[ -f "backend/sql/comprehensive_database_migration.sql" ]]; then
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < backend/sql/comprehensive_database_migration.sql
    
    if [[ $? -eq 0 ]]; then
        print_success "✅ Database migration completed successfully"
    else
        print_error "❌ Database migration failed"
        exit 1
    fi
else
    print_warning "Comprehensive migration not found, running basic setup..."
    
    # Run individual SQL files in order
    SQL_FILES=(
        "backend/sql/create_configuration_tables.sql"
        "backend/sql/visitor_management_enhancement.sql"
        "backend/sql/add_checkout_operator_fields.sql"
        "backend/sql/production_database_fix.sql"
    )
    
    for sql_file in "${SQL_FILES[@]}"; do
        if [[ -f "$sql_file" ]]; then
            print_status "Running: $sql_file"
            mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$sql_file"
        else
            print_warning "File not found: $sql_file"
        fi
    done
fi

# Create .env file for development
print_status "Creating development .env file..."
cat > backend/.env.development << EOL
# Development Environment Configuration
NODE_ENV=development
PORT=3000

# Database Configuration
DB_HOST=$DB_HOST
DB_PORT=3306
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME

# JWT Configuration
JWT_SECRET=dev_jwt_secret_$(date +%s)

# Upload Configuration
UPLOAD_PATH=uploads/
MAX_FILE_SIZE=10mb
UPLOAD_MAX_FILES=5

# CORS Configuration
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174

# Debug Configuration
DEBUG=true
LOG_LEVEL=debug
EOL

print_success "✅ Development .env file created"

# Copy to main .env if it doesn't exist
if [[ ! -f "backend/.env" ]]; then
    cp backend/.env.development backend/.env
    print_success "✅ Main .env file created from development template"
fi

# Create upload directories
print_status "Creating upload directories..."
mkdir -p backend/uploads/{photos,signatures,profiles,complaints,lost-items,reports,document_requests,return_photos}
mkdir -p backend/uploads/lost-items/{handover,return}/{photos,signatures}

# Set proper permissions
chmod -R 755 backend/uploads
print_success "✅ Upload directories created"

# Verify database setup
print_status "Verifying database setup..."
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "
    SELECT 
        'Database Setup Verification' as status,
        (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()) as total_tables,
        (SELECT COUNT(*) FROM INFORMATION_SCHEMA.VIEWS WHERE TABLE_SCHEMA = DATABASE()) as total_views,
        (SELECT COUNT(*) FROM users WHERE role = 'Admin') as admin_users,
        NOW() as setup_completed_at
" 2>/dev/null

print_success "🎉 Development database setup completed!"

echo ""
print_status "📋 SUMMARY:"
echo "  📄 Database: $DB_NAME"
echo "  🌐 Host: $DB_HOST"
echo "  👤 User: $DB_USER"
echo "  📁 Uploads: backend/uploads/"
echo "  ⚙️ Config: backend/.env.development"

echo ""
print_status "🚀 NEXT STEPS:"
echo "1. Start the development server:"
echo "   cd backend && npm run dev"
echo ""  
echo "2. Start the frontend:"
echo "   cd frontend && npm run dev"
echo ""
echo "3. Access the application:"
echo "   Frontend: http://localhost:5173"
echo "   Backend API: http://localhost:3000/api"
echo "   Health Check: http://localhost:3000/api/health"

echo ""
print_status "🔐 DEFAULT LOGIN:"
echo "   Email: admin@ult-fpeb.upi.edu"
echo "   Password: admin123"

echo ""
print_success "Development environment is ready! 🎊"