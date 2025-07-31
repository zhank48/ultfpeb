#!/bin/bash

# =======================================================
# ULT FPEB Production Database Fix Script
# Script untuk memperbaiki masalah database production
# =======================================================

echo "🚀 ULT FPEB Production Database Fix Script"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"  
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [[ ! -f "package.json" || ! -d "backend" ]]; then
    print_error "This script must be run from the project root directory"
    print_error "Make sure you're in the directory containing package.json and backend folder"
    exit 1
fi

print_status "Checking Node.js version..."
if ! command -v node &> /dev/null; then
    print_error "Node.js not found. Please install Node.js first."
    exit 1
fi

NODE_VERSION=$(node --version)
print_success "Node.js version: $NODE_VERSION"

# Change to backend directory
cd backend

print_status "Installing dependencies if needed..."
if [[ ! -d "node_modules" ]]; then
    npm install
fi

print_status "Running database fix script..."
echo "----------------------------------------"

# Run the Node.js database fix script
node scripts/fix-production-database.js

FIX_RESULT=$?

echo "----------------------------------------"

if [[ $FIX_RESULT -eq 0 ]]; then
    print_success "Database fix completed successfully!"
    echo ""
    print_status "Recommended next steps:"
    echo "1. Restart your application:"
    echo "   pm2 restart ult-fpeb"
    echo "   # or"
    echo "   npm run restart"
    echo ""
    echo "2. Test the following functionality:"
    echo "   - Visitor checkout"
    echo "   - User login"
    echo "   - Password change"
    echo ""
    echo "3. Monitor logs for any remaining errors:"
    echo "   pm2 logs ult-fpeb"
    echo "   # or"
    echo "   tail -f logs/backend-error.log"
    
else
    print_error "Database fix failed!"
    print_warning "Please check the error messages above and try again."
    print_warning "You may need to run the SQL scripts manually."
    exit 1
fi

# Optional: Restart application if pm2 is available
if command -v pm2 &> /dev/null; then
    echo ""
    read -p "Would you like to restart the application now using pm2? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Restarting application with pm2..."
        pm2 restart ult-fpeb
        if [[ $? -eq 0 ]]; then
            print_success "Application restarted successfully!"
        else
            print_warning "Failed to restart with pm2. Please restart manually."
        fi
    fi
fi

print_success "Fix script completed! 🎉"