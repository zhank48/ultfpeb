#!/bin/bash

# =============================================================================
# ULT FPEB Visitor Management System - Update Deployment Script
# =============================================================================
# This script handles application updates on production server
# =============================================================================

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
APP_NAME="ult-fpeb-visitor-management"
APP_USER="ultfpeb"
APP_DIR="/var/www/$APP_NAME"
BACKUP_DIR="/var/backups/ult-fpeb"

print_header() {
    echo -e "\n${BLUE}=============================================================================${NC}"
    echo -e "${BLUE} $1 ${NC}"
    echo -e "${BLUE}=============================================================================${NC}\n"
}

print_step() {
    echo -e "${YELLOW}🔹 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

check_user() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root"
        exit 1
    fi
}

create_backup() {
    print_header "CREATING BACKUP BEFORE UPDATE"
    
    DATE=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/pre_update_$DATE.tar.gz"
    
    print_step "Creating application backup..."
    mkdir -p $BACKUP_DIR
    tar -czf $BACKUP_FILE -C /var/www $APP_NAME --exclude=node_modules --exclude=.git
    
    print_success "Backup created: $BACKUP_FILE"
}

update_application() {
    print_header "UPDATING APPLICATION"
    
    print_step "Stopping PM2..."
    sudo -u $APP_USER pm2 stop all
    
    print_step "Pulling latest changes..."
    cd $APP_DIR
    # Replace with your git repository commands
    # git pull origin main
    
    print_step "Installing dependencies..."
    sudo -u $APP_USER npm install
    sudo -u $APP_USER npm run install:all
    
    print_step "Building frontend..."
    sudo -u $APP_USER npm run build
    
    print_step "Running database migrations..."
    sudo -u $APP_USER npm run migrate
    
    print_step "Restarting PM2..."
    sudo -u $APP_USER pm2 restart all
    
    print_success "Application updated successfully"
}

main() {
    print_header "ULT FPEB UPDATE DEPLOYMENT"
    
    check_user
    create_backup
    update_application
    
    print_success "Update completed successfully!"
}

main "$@"