#!/bin/bash

# ==============================================
# ULT FPEB Environment Management Script
# ==============================================
# 
# Manages environment configurations for different deployment scenarios
#
# Usage: ./manage-environment.sh [environment] [ip_address]
# Environments: development, production, laragon
# ==============================================

set -euo pipefail

ENVIRONMENT="${1:-production}"
IP_ADDRESS="${2:-$(hostname -I | awk '{print $1}')}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Generate JWT secret
generate_jwt_secret() {
    openssl rand -base64 64 2>/dev/null || head -c 64 /dev/urandom | base64
}

# Create backend environment file
create_backend_env() {
    local env_file="$PROJECT_ROOT/backend/.env"
    local jwt_secret=$(generate_jwt_secret)
    
    log "Creating backend environment file for $ENVIRONMENT..."
    
    case "$ENVIRONMENT" in
        "development")
            cat > "$env_file" << EOF
NODE_ENV=development
PORT=3001
HOST=0.0.0.0

# Database Configuration (Auto-detected)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ult_fpeb_dev
DB_USER=root
DB_PASSWORD=

# JWT Configuration
JWT_SECRET=$jwt_secret
JWT_EXPIRES_IN=24h

# Upload Configuration
UPLOAD_PATH=./uploads

# CORS Origins
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173

# Development Settings
DEBUG=true
ENABLE_CORS=true
ENABLE_LOGGING=true

# Application Configuration
APP_NAME=ULT FPEB Visitor Management (Dev)
APP_VERSION=1.0.4
EOF
            ;;
        "laragon")
            cat > "$env_file" << EOF
NODE_ENV=development
PORT=3001
HOST=0.0.0.0

# Database Configuration (Laragon)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ult_fpeb_dev
DB_USER=root
DB_PASSWORD=

# JWT Configuration
JWT_SECRET=$jwt_secret
JWT_EXPIRES_IN=24h

# Upload Configuration
UPLOAD_PATH=./uploads

# CORS Origins
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173

# Laragon Settings
DEBUG=true
ENABLE_CORS=true
ENABLE_LOGGING=true

# Application Configuration
APP_NAME=ULT FPEB Visitor Management (Laragon)
APP_VERSION=1.0.4
EOF
            ;;
        "production")
            cat > "$env_file" << EOF
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ult_fpeb_prod
DB_USER=ult_fpeb_user
DB_PASSWORD=REPLACE_WITH_ACTUAL_PASSWORD

# JWT Configuration
JWT_SECRET=$jwt_secret
JWT_EXPIRES_IN=24h

# Upload Configuration
UPLOAD_PATH=./uploads

# CORS Origins
CORS_ORIGINS=https://$IP_ADDRESS,https://ult-fpeb.local,https://localhost

# Security Configuration
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCK_TIME=30

# Application Configuration
APP_NAME=ULT FPEB Visitor Management
APP_VERSION=1.0.4
DEBUG=false

# Trust proxy settings
TRUSTED_PROXIES=127.0.0.1,::1,$IP_ADDRESS
EOF
            ;;
    esac
    
    info "Backend environment file created: $env_file"
}

# Create frontend environment file
create_frontend_env() {
    local env_file="$PROJECT_ROOT/frontend/.env"
    
    log "Creating frontend environment file for $ENVIRONMENT..."
    
    case "$ENVIRONMENT" in
        "development")
            cat > "$env_file" << EOF
VITE_API_URL=http://localhost:3001/api
VITE_APP_TITLE=ULT FPEB UPI - Development

# Development Configuration
VITE_NODE_ENV=development
VITE_BUILD_MODE=development
VITE_ENABLE_DEBUG=true
VITE_ENABLE_DEMO_MODE=false
VITE_ENABLE_MOCK_DATA=false

# API Configuration
VITE_API_TIMEOUT=30000
VITE_API_RETRY_ATTEMPTS=3

# File Upload Settings
VITE_MAX_FILE_SIZE=10485760
VITE_ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf

# Development Settings
VITE_SHOW_DEV_TOOLS=true
VITE_ENABLE_LOGGING=true
EOF
            ;;
        "laragon")
            cat > "$env_file" << EOF
VITE_API_URL=http://localhost:3001/api
VITE_APP_TITLE=ULT FPEB UPI - Laragon Development

# Development Configuration
VITE_NODE_ENV=development
VITE_BUILD_MODE=development
VITE_ENABLE_DEBUG=true
VITE_ENABLE_DEMO_MODE=false
VITE_ENABLE_MOCK_DATA=false

# API Configuration
VITE_API_TIMEOUT=30000
VITE_API_RETRY_ATTEMPTS=3

# File Upload Settings
VITE_MAX_FILE_SIZE=10485760
VITE_ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf

# Development Settings
VITE_SHOW_DEV_TOOLS=true
VITE_ENABLE_LOGGING=true
EOF
            ;;
        "production")
            cat > "$env_file" << EOF
VITE_API_URL=https://$IP_ADDRESS/api
VITE_APP_TITLE=ULT FPEB UPI - Sistem Manajemen Pengunjung

# Production Configuration
VITE_NODE_ENV=production
VITE_BUILD_MODE=production
VITE_ENABLE_DEBUG=false
VITE_ENABLE_DEMO_MODE=false
VITE_ENABLE_MOCK_DATA=false

# API Configuration
VITE_API_TIMEOUT=30000
VITE_API_RETRY_ATTEMPTS=3

# File Upload Settings
VITE_MAX_FILE_SIZE=10485760
VITE_ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf

# Production Settings
VITE_SHOW_DEV_TOOLS=false
VITE_ENABLE_LOGGING=false

# Performance Settings
VITE_ENABLE_PWA=true
VITE_ENABLE_ANALYTICS=false
EOF
            ;;
    esac
    
    info "Frontend environment file created: $env_file"
}

# Main function
main() {
    log "Setting up environment for: $ENVIRONMENT"
    log "IP Address: $IP_ADDRESS"
    
    create_backend_env
    create_frontend_env
    
    # Set permissions
    chmod 600 "$PROJECT_ROOT/backend/.env" 2>/dev/null || true
    chmod 600 "$PROJECT_ROOT/frontend/.env" 2>/dev/null || true
    
    log "Environment setup completed!"
    echo
    info "Next steps:"
    case "$ENVIRONMENT" in
        "development"|"laragon")
            info "1. Update database password in backend/.env if needed"
            info "2. Run: npm run setup-db:dev"
            info "3. Run: npm run dev"
            ;;
        "production")
            info "1. Update database password in backend/.env"
            info "2. Run deployment script with Git integration"
            info "3. Access: https://$IP_ADDRESS"
            ;;
    esac
}

# Validate environment
case "$ENVIRONMENT" in
    "development"|"production"|"laragon")
        main
        ;;
    *)
        echo "Invalid environment: $ENVIRONMENT"
        echo "Valid options: development, production, laragon"
        exit 1
        ;;
esac