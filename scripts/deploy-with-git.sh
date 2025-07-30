#!/bin/bash

# ==============================================
# ULT FPEB Visitor Management - Git-Integrated Deployment Script
# ==============================================
# 
# Automated deployment script with Git integration
# Supports both fresh installation and updates
#
# Usage: 
#   Fresh install: sudo ./deploy-with-git.sh [LOCAL_IP] [GIT_REPO_URL]
#   Update: sudo ./deploy-with-git.sh update
# 
# Example: 
#   sudo ./deploy-with-git.sh 192.168.1.100 https://github.com/zhank48/ultfpeb.git
#   sudo ./deploy-with-git.sh update
# ==============================================

set -euo pipefail

# Configuration variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/tmp/ult-deploy-$(date +%Y%m%d-%H%M%S).log"
DEPLOY_USER="ult-deploy"
APP_DIR="/opt/ult-fpeb"
SERVICE_NAME="ult-fpeb"

# Default values
DEFAULT_REPO="https://github.com/zhank48/ultfpeb.git"
LOCAL_IP="${1:-$(hostname -I | awk '{print $1}')}"
GIT_REPO="${2:-$DEFAULT_REPO}"
MODE="${1:-install}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root (use sudo)"
    fi
}

# Install Git if not present
install_git() {
    if ! command -v git &> /dev/null; then
        log "Installing Git..."
        apt-get update -y
        apt-get install -y git
    else
        log "Git already installed: $(git --version)"
    fi
}

# Clone or update repository
setup_repository() {
    log "Setting up Git repository..."
    
    if [[ "$MODE" == "update" ]]; then
        if [[ -d "$APP_DIR/.git" ]]; then
            log "Updating existing repository..."
            cd "$APP_DIR"
            
            # Stash any local changes
            git stash push -m "Auto-stash before update $(date)"
            
            # Pull latest changes
            git pull origin main
            
            log "Repository updated successfully"
        else
            error "No Git repository found at $APP_DIR. Run fresh install first."
        fi
    else
        # Fresh installation
        if [[ -d "$APP_DIR" ]]; then
            log "Backing up existing directory..."
            mv "$APP_DIR" "${APP_DIR}.backup.$(date +%Y%m%d-%H%M%S)"
        fi
        
        log "Cloning repository from $GIT_REPO..."
        git clone "$GIT_REPO" "$APP_DIR"
        
        cd "$APP_DIR"
        log "Repository cloned successfully"
    fi
    
    # Set ownership
    chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR"
}

# Setup deployment hooks
setup_deployment_hooks() {
    log "Setting up deployment hooks..."
    
    # Create update script
    cat > /usr/local/bin/ult-update << 'EOF'
#!/bin/bash
APP_DIR="/opt/ult-fpeb"
DEPLOY_USER="ult-deploy"

echo "🔄 Updating ULT FPEB application..."

# Stop services
echo "⏹️  Stopping services..."
sudo -u "$DEPLOY_USER" pm2 stop all

# Update code
echo "📥 Pulling latest changes..."
cd "$APP_DIR"
git stash push -m "Auto-stash before update $(date)"
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
sudo -u "$DEPLOY_USER" npm install

# Build application
echo "🏗️  Building application..."
sudo -u "$DEPLOY_USER" npm run build

# Run database migrations if needed
echo "🗄️  Checking database..."
sudo -u "$DEPLOY_USER" npm run setup-db

# Start services
echo "▶️  Starting services..."
sudo -u "$DEPLOY_USER" pm2 start all

echo "✅ Update completed successfully!"
EOF

    chmod +x /usr/local/bin/ult-update
    
    # Create rollback script
    cat > /usr/local/bin/ult-rollback << 'EOF'
#!/bin/bash
APP_DIR="/opt/ult-fpeb"
DEPLOY_USER="ult-deploy"

echo "🔄 Rolling back ULT FPEB application..."

cd "$APP_DIR"

# Show recent commits
echo "Recent commits:"
git log --oneline -10

# Ask for commit to rollback to
read -p "Enter commit hash to rollback to: " COMMIT_HASH

if [[ -n "$COMMIT_HASH" ]]; then
    # Stop services
    echo "⏹️  Stopping services..."
    sudo -u "$DEPLOY_USER" pm2 stop all
    
    # Rollback
    echo "⏪ Rolling back to $COMMIT_HASH..."
    git reset --hard "$COMMIT_HASH"
    
    # Reinstall and rebuild
    echo "📦 Reinstalling dependencies..."
    sudo -u "$DEPLOY_USER" npm install
    sudo -u "$DEPLOY_USER" npm run build
    
    # Start services
    echo "▶️  Starting services..."
    sudo -u "$DEPLOY_USER" pm2 start all
    
    echo "✅ Rollback completed successfully!"
else
    echo "❌ No commit hash provided. Rollback cancelled."
fi
EOF

    chmod +x /usr/local/bin/ult-rollback
    
    log "Deployment hooks created: ult-update, ult-rollback"
}

# Run appropriate deployment mode
main() {
    log "Starting ULT FPEB deployment (mode: $MODE)..."
    
    check_root
    install_git
    
    if [[ "$MODE" == "update" ]]; then
        # Update mode
        setup_repository
        
        # Install dependencies and build
        cd "$APP_DIR"
        sudo -u "$DEPLOY_USER" npm install
        sudo -u "$DEPLOY_USER" npm run build
        
        # Restart services
        sudo -u "$DEPLOY_USER" pm2 restart all
        
        log "✅ Update completed successfully!"
    else
        # Fresh installation mode
        
        # Include the original deployment script functionality
        source "${SCRIPT_DIR}/deploy-linux-server.sh" "$LOCAL_IP"
        
        # Then setup Git repository
        setup_repository
        setup_deployment_hooks
        
        log "✅ Fresh installation with Git integration completed!"
    fi
    
    # Print usage info
    echo
    info "Git Integration Commands:"
    info "  - Update application: ult-update"
    info "  - Rollback application: ult-rollback"
    info "  - Check status: git log --oneline -5"
    info "  - View changes: git diff HEAD~1"
    echo
}

# Run main function
main "$@"