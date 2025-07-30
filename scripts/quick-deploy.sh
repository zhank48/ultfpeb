#!/bin/bash

# ==============================================
# ULT FPEB Quick Deployment Script
# ==============================================
# 
# One-command deployment for ULT FPEB on fresh Linux server
# 
# Usage: curl -sSL https://raw.githubusercontent.com/your-repo/ult-fpeb/main/scripts/quick-deploy.sh | sudo bash -s -- [LOCAL_IP]
# Or: wget -qO- <URL> | sudo bash -s -- [LOCAL_IP]
# Or: sudo ./quick-deploy.sh [LOCAL_IP]
# ==============================================

set -euo pipefail

# Configuration
LOCAL_IP="${1:-$(hostname -I | awk '{print $1}')}"
TEMP_DIR="/tmp/ult-fpeb-deploy-$(date +%s)"
LOG_FILE="/tmp/ult-fpeb-quick-deploy.log"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    error "This script must be run as root (use sudo)"
fi

# Create temporary directory
mkdir -p "$TEMP_DIR"
cd "$TEMP_DIR"

log "Starting ULT FPEB Quick Deployment"
log "Target IP: $LOCAL_IP"
log "Temporary directory: $TEMP_DIR"

# Download deployment scripts (if running from curl/wget)
if [[ ! -f "deploy-linux-server.sh" ]]; then
    log "Downloading deployment scripts..."
    
    # For GitHub repository (adjust URL as needed)
    # curl -sSL https://raw.githubusercontent.com/your-repo/ult-fpeb/main/scripts/deploy-linux-server.sh -o deploy-linux-server.sh
    # curl -sSL https://raw.githubusercontent.com/your-repo/ult-fpeb/main/scripts/database-init.sql -o database-init.sql
    # curl -sSL https://raw.githubusercontent.com/your-repo/ult-fpeb/main/scripts/configure-environment.sh -o configure-environment.sh
    # curl -sSL https://raw.githubusercontent.com/your-repo/ult-fpeb/main/scripts/service-manager.sh -o service-manager.sh
    
    # For now, create inline versions or copy from current directory
    if [[ -f "/root/deploy-linux-server.sh" ]]; then
        cp /root/deploy-linux-server.sh .
        cp /root/database-init.sql . 2>/dev/null || true
        cp /root/configure-environment.sh . 2>/dev/null || true
        cp /root/service-manager.sh . 2>/dev/null || true
    else
        error "Deployment scripts not found. Please ensure they are available."
    fi
fi

# Make scripts executable
chmod +x *.sh

# Run main deployment
log "Running main deployment script..."
if [[ -f "deploy-linux-server.sh" ]]; then
    ./deploy-linux-server.sh "$LOCAL_IP" | tee -a "$LOG_FILE"
else
    error "Main deployment script not found"
fi

# Configure environment
log "Configuring production environment..."
if [[ -f "configure-environment.sh" ]]; then
    ./configure-environment.sh production "$LOCAL_IP" | tee -a "$LOG_FILE"
fi

# Final service check
log "Performing post-deployment checks..."
if [[ -f "service-manager.sh" ]]; then
    cp service-manager.sh /usr/local/bin/ult-service
    chmod +x /usr/local/bin/ult-service
    
    # Wait for services to start
    sleep 10
    
    # Health check
    /usr/local/bin/ult-service health production | tee -a "$LOG_FILE"
fi

# Clean up
cd /
rm -rf "$TEMP_DIR"

log "=== QUICK DEPLOYMENT COMPLETED ==="
info "Application URL: https://$LOCAL_IP"
info "Log file: $LOG_FILE"
info "Management command: ult-service [action] [service] [environment]"
info ""
info "Next steps:"
info "1. Add '$LOCAL_IP ult-fpeb.local' to your /etc/hosts file"
info "2. Visit https://$LOCAL_IP in your browser"
info "3. Login with admin@ultfpeb.upi.edu / admin123"
info "4. Change default passwords!"
info ""
info "Useful commands:"
info "- ult-service status all production     # Check all services"
info "- ult-service restart all production   # Restart all services"
info "- ult-service backup                   # Create backup"
info "- ult-service logs backend production  # View backend logs"