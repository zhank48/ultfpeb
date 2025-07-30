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

# Get script directory (where quick-deploy.sh is located)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log "Starting ULT FPEB Quick Deployment"
log "Target IP: $LOCAL_IP"
log "Script directory: $SCRIPT_DIR"

# Check if scripts exist in the same directory
REQUIRED_SCRIPTS=(
    "deploy-linux-server.sh"
    "database-init.sql"
    "configure-environment.sh" 
    "service-manager.sh"
)

log "Checking for required deployment scripts..."
for script in "${REQUIRED_SCRIPTS[@]}"; do
    if [[ -f "$SCRIPT_DIR/$script" ]]; then
        log "✓ Found: $script"
    else
        error "Missing required script: $script"
    fi
done

# Use scripts from the same directory
cd "$SCRIPT_DIR"

# Make scripts executable
chmod +x *.sh

# Run main deployment
log "Running main deployment script..."
./deploy-linux-server.sh "$LOCAL_IP" | tee -a "$LOG_FILE"

# Configure environment
log "Configuring production environment..."
./configure-environment.sh production "$LOCAL_IP" | tee -a "$LOG_FILE"

# Final service check
log "Performing post-deployment checks..."
cp service-manager.sh /usr/local/bin/ult-service
chmod +x /usr/local/bin/ult-service

# Wait for services to start
sleep 10

# Health check
/usr/local/bin/ult-service health production | tee -a "$LOG_FILE"

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