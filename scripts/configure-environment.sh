#!/bin/bash

# ==============================================
# ULT FPEB Environment Configuration Script
# ==============================================
# 
# Automated environment configuration for different deployment scenarios
# Supports: production, staging, development environments
# 
# Usage: ./configure-environment.sh [environment] [local_ip]
# Example: ./configure-environment.sh production 192.168.1.100
# ==============================================

set -euo pipefail

# Configuration variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
APP_DIR="/opt/ult-fpeb"
ENVIRONMENT="${1:-production}"
LOCAL_IP="${2:-$(hostname -I | awk '{print $1}')}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Generate secure random password
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

# Load MySQL credentials if exists
load_mysql_credentials() {
    if [[ -f /root/.mysql_credentials ]]; then
        source /root/.mysql_credentials
        log "MySQL credentials loaded"
    else
        # Generate new credentials
        MYSQL_ROOT_PASSWORD=$(generate_password)
        MYSQL_DATABASE="ult_fpeb_${ENVIRONMENT}"
        MYSQL_USER="ult_fpeb_user"
        MYSQL_PASSWORD=$(generate_password)
        
        log "Generated new MySQL credentials"
    fi
}

# Configure backend environment
configure_backend_env() {
    log "Configuring backend environment for: $ENVIRONMENT"
    
    local backend_env_file="$APP_DIR/backend/.env"
    
    # Generate JWT secret
    local jwt_secret=$(openssl rand -base64 64)
    
    # Base configuration
    cat > "$backend_env_file" << EOF
# Environment: $ENVIRONMENT
NODE_ENV=$ENVIRONMENT
PORT=3001
HOST=0.0.0.0

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=$MYSQL_DATABASE
DB_USER=$MYSQL_USER
DB_PASSWORD=$MYSQL_PASSWORD

# JWT Configuration
JWT_SECRET=$jwt_secret
JWT_EXPIRES_IN=24h

# Upload Configuration
UPLOAD_PATH=./uploads
UPLOAD_MAX_SIZE=50MB
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif,application/pdf

# CORS Origins
EOF

    # Environment-specific CORS configuration
    case $ENVIRONMENT in
        "production")
            echo "CORS_ORIGINS=https://$LOCAL_IP,https://ult-fpeb.local" >> "$backend_env_file"
            echo "DEBUG=false" >> "$backend_env_file"
            echo "BCRYPT_ROUNDS=12" >> "$backend_env_file"
            ;;
        "staging")
            echo "CORS_ORIGINS=https://$LOCAL_IP,https://staging-ult-fpeb.local,http://localhost:5173" >> "$backend_env_file"
            echo "DEBUG=true" >> "$backend_env_file"
            echo "BCRYPT_ROUNDS=10" >> "$backend_env_file"
            ;;
        "development")
            echo "CORS_ORIGINS=http://localhost:5173,http://$LOCAL_IP:5173,https://$LOCAL_IP" >> "$backend_env_file"
            echo "DEBUG=true" >> "$backend_env_file"
            echo "BCRYPT_ROUNDS=8" >> "$backend_env_file"
            ;;
    esac
    
    # Common configuration
    cat >> "$backend_env_file" << EOF

# Security Configuration
MAX_LOGIN_ATTEMPTS=5
LOCK_TIME=30
SESSION_SECRET=$jwt_secret

# Application Configuration
APP_NAME=ULT FPEB Visitor Management
APP_VERSION=1.0.4

# Logging Configuration
LOG_LEVEL=info
LOG_FILE_MAX_SIZE=10MB
LOG_FILE_MAX_FILES=5

# Email Configuration (if needed)
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=

# Trust proxy settings
TRUSTED_PROXIES=127.0.0.1,::1,$LOCAL_IP

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File storage
STORAGE_TYPE=local
STORAGE_PATH=./uploads

# Backup configuration
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
EOF

    chmod 600 "$backend_env_file"
    log "Backend environment configured"
}

# Configure frontend environment
configure_frontend_env() {
    log "Configuring frontend environment for: $ENVIRONMENT"
    
    local frontend_env_file="$APP_DIR/frontend/.env"
    
    # Base configuration
    cat > "$frontend_env_file" << EOF
# Environment: $ENVIRONMENT
VITE_NODE_ENV=$ENVIRONMENT
VITE_BUILD_MODE=$ENVIRONMENT
VITE_APP_TITLE=ULT FPEB UPI - Sistem Manajemen Pengunjung

# API Configuration
EOF

    # Environment-specific API configuration
    case $ENVIRONMENT in
        "production")
            echo "VITE_API_URL=https://$LOCAL_IP/api" >> "$frontend_env_file"
            echo "VITE_ENABLE_DEBUG=false" >> "$frontend_env_file"
            echo "VITE_SHOW_DEV_TOOLS=false" >> "$frontend_env_file"
            echo "VITE_ENABLE_LOGGING=false" >> "$frontend_env_file"
            ;;
        "staging")
            echo "VITE_API_URL=https://$LOCAL_IP/api" >> "$frontend_env_file"
            echo "VITE_ENABLE_DEBUG=true" >> "$frontend_env_file"
            echo "VITE_SHOW_DEV_TOOLS=true" >> "$frontend_env_file"
            echo "VITE_ENABLE_LOGGING=true" >> "$frontend_env_file"
            ;;
        "development")
            echo "VITE_API_URL=http://$LOCAL_IP:3001/api" >> "$frontend_env_file"
            echo "VITE_ENABLE_DEBUG=true" >> "$frontend_env_file"
            echo "VITE_SHOW_DEV_TOOLS=true" >> "$frontend_env_file"
            echo "VITE_ENABLE_LOGGING=true" >> "$frontend_env_file"
            ;;
    esac
    
    # Common configuration
    cat >> "$frontend_env_file" << EOF

# Feature Flags
VITE_ENABLE_DEMO_MODE=false
VITE_ENABLE_MOCK_DATA=false

# API Configuration
VITE_API_TIMEOUT=30000
VITE_API_RETRY_ATTEMPTS=3
VITE_API_BASE_PATH=/api

# File Upload Settings
VITE_MAX_FILE_SIZE=10485760
VITE_ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf
VITE_UPLOAD_CHUNK_SIZE=1048576

# UI Configuration
VITE_THEME=light
VITE_LANGUAGE=id
VITE_TIMEZONE=Asia/Jakarta

# Performance Settings  
VITE_ENABLE_PWA=true
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_ERROR_REPORTING=true

# Security Settings
VITE_ENABLE_CSP=true
VITE_ENABLE_HTTPS_REDIRECT=true

# Caching
VITE_CACHE_VERSION=1.0.4
VITE_ENABLE_SERVICE_WORKER=true
EOF

    chmod 600 "$frontend_env_file"
    log "Frontend environment configured"
}

# Create Docker environment file
create_docker_env() {
    log "Creating Docker environment file"
    
    local docker_env_file="$APP_DIR/.env.docker"
    
    cat > "$docker_env_file" << EOF
# Docker Environment Configuration
COMPOSE_PROJECT_NAME=ult-fpeb-$ENVIRONMENT

# MySQL Configuration
MYSQL_ROOT_PASSWORD=$MYSQL_ROOT_PASSWORD
MYSQL_DATABASE=$MYSQL_DATABASE
MYSQL_USER=$MYSQL_USER
MYSQL_PASSWORD=$MYSQL_PASSWORD

# Application URLs
FRONTEND_URL=https://$LOCAL_IP
VITE_API_URL=https://$LOCAL_IP/api
ALLOWED_ORIGINS=https://$LOCAL_IP,https://ult-fpeb.local

# SSL Configuration
ACME_EMAIL=admin@ultfpeb.upi.edu

# JWT Configuration
JWT_SECRET=$(openssl rand -base64 64)

# Environment
NODE_ENV=$ENVIRONMENT
EOF

    chmod 600 "$docker_env_file"
    log "Docker environment file created"
}

# Configure Nginx for specific environment
configure_nginx_env() {
    log "Configuring Nginx for environment: $ENVIRONMENT"
    
    local nginx_conf="/etc/nginx/sites-available/ult-fpeb-$ENVIRONMENT"
    
    # Server name based on environment
    local server_name="$LOCAL_IP"
    case $ENVIRONMENT in
        "production")
            server_name="$LOCAL_IP ult-fpeb.local"
            ;;
        "staging") 
            server_name="$LOCAL_IP staging-ult-fpeb.local"
            ;;
        "development")
            server_name="$LOCAL_IP dev-ult-fpeb.local localhost"
            ;;
    esac
    
    # Backend port based on environment
    local backend_port=3001
    case $ENVIRONMENT in
        "staging")
            backend_port=3002
            ;;
        "development")
            backend_port=3003
            ;;
    esac
    
    cat > "$nginx_conf" << EOF
# ULT FPEB Visitor Management - $ENVIRONMENT Environment
server {
    listen 80;
    server_name $server_name;
    
    # Redirect HTTP to HTTPS in production
EOF

    if [[ "$ENVIRONMENT" == "production" ]]; then
        echo "    return 301 https://\$server_name\$request_uri;" >> "$nginx_conf"
    else
        # Allow HTTP in non-production environments
        cat >> "$nginx_conf" << EOF
    root $APP_DIR/frontend/dist;
    index index.html;
    
    location /api {
        proxy_pass http://127.0.0.1:$backend_port;
        include /etc/nginx/proxy_params;
    }
    
    location / {
        try_files \$uri \$uri/ /index.html;
    }
EOF
    fi
    
    cat >> "$nginx_conf" << EOF
}

server {
    listen 443 ssl http2;
    server_name $server_name;
    
    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/server.crt;
    ssl_certificate_key /etc/nginx/ssl/server.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
EOF

    # Environment-specific security headers
    if [[ "$ENVIRONMENT" == "production" ]]; then
        cat >> "$nginx_conf" << EOF
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:;" always;
EOF
    else
        cat >> "$nginx_conf" << EOF
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Content-Security-Policy "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: http: https:;" always;
EOF
    fi
    
    cat >> "$nginx_conf" << EOF
    
    # Document root
    root $APP_DIR/frontend/dist;
    index index.html;
    
    # Logging
    access_log /var/log/nginx/ult-fpeb-$ENVIRONMENT-access.log;
    error_log /var/log/nginx/ult-fpeb-$ENVIRONMENT-error.log;
    
    # Client max body size for file uploads
    client_max_body_size 50M;
    
    # API proxy to backend
    location /api {
        proxy_pass http://127.0.0.1:$backend_port;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
    
    # Static file serving with caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
EOF

    # Environment-specific caching
    if [[ "$ENVIRONMENT" == "production" ]]; then
        echo "        expires 1y;" >> "$nginx_conf"
        echo "        add_header Cache-Control \"public, immutable\";" >> "$nginx_conf"
    else
        echo "        expires 1h;" >> "$nginx_conf"
        echo "        add_header Cache-Control \"public\";" >> "$nginx_conf"
    fi
    
    cat >> "$nginx_conf" << EOF
        access_log off;
    }
    
    # Handle React Router (SPA)
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy - $ENVIRONMENT\\n";
        add_header Content-Type text/plain;
    }
    
    # Environment info (non-production only)
EOF

    if [[ "$ENVIRONMENT" != "production" ]]; then
        cat >> "$nginx_conf" << EOF
    location /env-info {
        access_log off;
        return 200 "Environment: $ENVIRONMENT\\nServer: $server_name\\nTimestamp: \$time_iso8601\\n";
        add_header Content-Type text/plain;
    }
EOF
    fi
    
    cat >> "$nginx_conf" << EOF
    
    # Deny access to sensitive files
    location ~ /\\.ht {
        deny all;
    }
    
    location ~ /\\.(env|git) {
        deny all;
    }
}
EOF

    # Enable the site
    ln -sf "/etc/nginx/sites-available/ult-fpeb-$ENVIRONMENT" "/etc/nginx/sites-enabled/"
    
    log "Nginx configured for $ENVIRONMENT environment"
}

# Create systemd service for specific environment
create_systemd_service() {
    log "Creating systemd service for environment: $ENVIRONMENT"
    
    local service_file="/etc/systemd/system/ult-fpeb-$ENVIRONMENT.service"
    
    cat > "$service_file" << EOF
[Unit]
Description=ULT FPEB Visitor Management ($ENVIRONMENT)
After=network.target mysql.service

[Service]
Type=simple
User=ult-deploy
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=$ENVIRONMENT
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=ult-fpeb-$ENVIRONMENT

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable "ult-fpeb-$ENVIRONMENT"
    
    log "Systemd service created for $ENVIRONMENT"
}

# Create PM2 ecosystem for specific environment
create_pm2_ecosystem() {
    log "Creating PM2 ecosystem for environment: $ENVIRONMENT"
    
    local ecosystem_file="$APP_DIR/ecosystem.$ENVIRONMENT.config.js"
    local backend_port=3001
    
    case $ENVIRONMENT in
        "staging")
            backend_port=3002
            ;;
        "development") 
            backend_port=3003
            ;;
    esac
    
    cat > "$ecosystem_file" << EOF
module.exports = {
  apps: [{
    name: 'ult-fpeb-backend-$ENVIRONMENT',
    cwd: '$APP_DIR/backend',
    script: 'src/index.js',
    instances: ENVIRONMENT === 'production' ? 'max' : 1,
    exec_mode: ENVIRONMENT === 'production' ? 'cluster' : 'fork',
    env: {
      NODE_ENV: '$ENVIRONMENT',
      PORT: $backend_port
    },
    error_file: '$APP_DIR/logs/backend-$ENVIRONMENT-error.log',
    out_file: '$APP_DIR/logs/backend-$ENVIRONMENT-out.log',
    log_file: '$APP_DIR/logs/backend-$ENVIRONMENT-combined.log',
    time: true,
    max_memory_restart: '$ENVIRONMENT' === 'production' ? '500M' : '256M',
    node_args: '--max-old-space-size=' + ('$ENVIRONMENT' === 'production' ? '512' : '256'),
    watch: '$ENVIRONMENT' !== 'production' ? ['src'] : false,
    ignore_watch: ['node_modules', 'logs', 'uploads'],
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    env_staging: {
      NODE_ENV: 'staging', 
      PORT: 3002
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 3003
    }
  }]
};
EOF

    chown ult-deploy:ult-deploy "$ecosystem_file"
    log "PM2 ecosystem created for $ENVIRONMENT"
}

# Main configuration function
main() {
    log "Starting environment configuration for: $ENVIRONMENT"
    log "Local IP: $LOCAL_IP"
    
    # Validate environment
    case $ENVIRONMENT in
        "production"|"staging"|"development")
            log "Valid environment: $ENVIRONMENT"
            ;;
        *)
            error "Invalid environment: $ENVIRONMENT. Must be: production, staging, or development"
            ;;
    esac
    
    # Create directories if they don't exist
    mkdir -p "$APP_DIR/backend" "$APP_DIR/frontend" "$APP_DIR/logs"
    
    # Load or generate MySQL credentials
    load_mysql_credentials
    
    # Configure environments
    configure_backend_env
    configure_frontend_env
    create_docker_env
    
    # Configure services if running as root
    if [[ $EUID -eq 0 ]]; then
        configure_nginx_env
        create_pm2_ecosystem
        # Reload nginx
        nginx -t && systemctl reload nginx
    else
        warn "Not running as root - skipping system service configuration"
    fi
    
    log "Environment configuration completed for: $ENVIRONMENT"
    log "Backend port: $(grep PORT $APP_DIR/backend/.env | cut -d= -f2)"
    log "Frontend API URL: $(grep VITE_API_URL $APP_DIR/frontend/.env | cut -d= -f2)"
}

# Show usage if no arguments
if [[ $# -eq 0 ]]; then
    echo "Usage: $0 [environment] [local_ip]"
    echo "Environments: production, staging, development"
    echo "Example: $0 production 192.168.1.100"
    exit 1
fi

# Run main function
main "$@"