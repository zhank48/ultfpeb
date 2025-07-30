#!/bin/bash

# ==============================================
# ULT FPEB Visitor Management - Linux Deployment Script
# ==============================================
# 
# Automated deployment script for Ubuntu/Debian servers
# Installs: Node.js, MySQL, Nginx, SSL certificates, PM2
# Configures: Database, environment, services, firewall
#
# Usage: sudo ./deploy-linux-server.sh [LOCAL_IP]
# Example: sudo ./deploy-linux-server.sh 192.168.1.100
# ==============================================

set -euo pipefail

# Configuration variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/tmp/ult-deploy-$(date +%Y%m%d-%H%M%S).log"
DEPLOY_USER="ult-deploy"
APP_DIR="/opt/ult-fpeb"
SERVICE_NAME="ult-fpeb"

# Get local IP address (parameter or auto-detect)
LOCAL_IP="${1:-$(hostname -I | awk '{print $1}')}"
DOMAIN_NAME="ult-fpeb.local"

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

# Detect OS
detect_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
    else
        error "Cannot detect OS version"
    fi
    
    log "Detected OS: $OS $VER"
    
    # Check if Ubuntu/Debian
    if [[ "$OS" != *"Ubuntu"* ]] && [[ "$OS" != *"Debian"* ]]; then
        warn "This script is optimized for Ubuntu/Debian. Proceed with caution."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Update system packages
update_system() {
    log "Updating system packages..."
    apt-get update -y
    apt-get upgrade -y
    apt-get install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates lsb-release
}

# Install Node.js 18.x
install_nodejs() {
    log "Installing Node.js 18.x..."
    
    # Add NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
    
    # Verify installation
    node_version=$(node --version)
    npm_version=$(npm --version)
    log "Node.js installed: $node_version"
    log "npm installed: $npm_version"
    
    # Install PM2 globally
    npm install -g pm2
    log "PM2 installed: $(pm2 --version)"
}

# Install MySQL 8.0
install_mysql() {
    log "Installing MySQL 8.0..."
    
    # Set non-interactive mode
    export DEBIAN_FRONTEND=noninteractive
    
    # Generate random root password
    MYSQL_ROOT_PASSWORD=$(openssl rand -base64 32)
    DB_PASSWORD=$(openssl rand -base64 24)
    
    # Pre-configure MySQL
    echo "mysql-server mysql-server/root_password password $MYSQL_ROOT_PASSWORD" | debconf-set-selections
    echo "mysql-server mysql-server/root_password_again password $MYSQL_ROOT_PASSWORD" | debconf-set-selections
    
    # Install MySQL
    apt-get install -y mysql-server mysql-client
    
    # Secure MySQL installation
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" <<EOF
DELETE FROM mysql.user WHERE User='';
DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');
DROP DATABASE IF EXISTS test;
DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';
FLUSH PRIVILEGES;
EOF

    # Create application database and user
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" <<EOF
CREATE DATABASE IF NOT EXISTS ult_fpeb_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'ult_fpeb_user'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON ult_fpeb_prod.* TO 'ult_fpeb_user'@'localhost';
FLUSH PRIVILEGES;
EOF

    # Save credentials securely
    cat > /root/.mysql_credentials << EOF
MYSQL_ROOT_PASSWORD="$MYSQL_ROOT_PASSWORD"
MYSQL_DATABASE="ult_fpeb_prod"
MYSQL_USER="ult_fpeb_user"
MYSQL_PASSWORD="$DB_PASSWORD"
EOF
    chmod 600 /root/.mysql_credentials
    
    log "MySQL installed and configured"
    log "Credentials saved to /root/.mysql_credentials"
}

# Install Nginx
install_nginx() {
    log "Installing Nginx..."
    
    apt-get install -y nginx
    systemctl enable nginx
    systemctl start nginx
    
    log "Nginx installed and started"
}

# Install SSL certificates
install_ssl() {
    log "Setting up SSL certificates..."
    
    # Create SSL directory
    mkdir -p /etc/nginx/ssl
    
    # Generate self-signed certificate for local IP
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/server.key \
        -out /etc/nginx/ssl/server.crt \
        -subj "/C=ID/ST=West Java/L=Bandung/O=UPI/OU=FPEB/CN=$LOCAL_IP" \
        -addext "subjectAltName=IP:$LOCAL_IP,DNS:$DOMAIN_NAME,DNS:localhost"
    
    # Set proper permissions
    chmod 600 /etc/nginx/ssl/server.key
    chmod 644 /etc/nginx/ssl/server.crt
    
    log "SSL certificates generated for IP: $LOCAL_IP"
}

# Create deployment user
create_deploy_user() {
    log "Creating deployment user: $DEPLOY_USER"
    
    if ! id "$DEPLOY_USER" &>/dev/null; then
        useradd -m -s /bin/bash "$DEPLOY_USER"
        usermod -aG sudo "$DEPLOY_USER"
        
        # Create SSH directory for deployment
        mkdir -p "/home/$DEPLOY_USER/.ssh"
        chmod 700 "/home/$DEPLOY_USER/.ssh"
        chown "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
    fi
    
    log "Deployment user created/verified"
}

# Setup application directory
setup_app_directory() {
    log "Setting up application directory: $APP_DIR"
    
    mkdir -p "$APP_DIR"
    mkdir -p "$APP_DIR/backend/uploads"
    mkdir -p "$APP_DIR/frontend/dist"
    mkdir -p "$APP_DIR/logs"
    mkdir -p "$APP_DIR/backups"
    
    # Copy project files
    if [[ -d "$PROJECT_ROOT" ]]; then
        log "Copying project files..."
        rsync -av --exclude='node_modules' --exclude='.git' --exclude='*.log' \
              "$PROJECT_ROOT/" "$APP_DIR/"
    fi
    
    # Set ownership
    chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR"
    
    log "Application directory setup complete"
}

# Configure environment files
configure_environment() {
    log "Configuring environment files..."
    
    # Source MySQL credentials
    source /root/.mysql_credentials
    
    # Generate JWT secret
    JWT_SECRET=$(openssl rand -base64 64)
    
    # Backend environment
    cat > "$APP_DIR/backend/.env" << EOF
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=$MYSQL_DATABASE
DB_USER=$MYSQL_USER
DB_PASSWORD=$MYSQL_PASSWORD

# JWT Configuration
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h

# Upload Configuration
UPLOAD_PATH=./uploads

# CORS Origins
CORS_ORIGINS=https://$LOCAL_IP,https://$DOMAIN_NAME,https://localhost,http://localhost

# Security Configuration
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCK_TIME=30

# Application Configuration
APP_NAME=ULT FPEB Visitor Management
APP_VERSION=1.0.4
DEBUG=false

# Trust proxy settings
TRUSTED_PROXIES=127.0.0.1,::1,$LOCAL_IP
EOF

    # Frontend environment
    cat > "$APP_DIR/frontend/.env" << EOF
VITE_API_URL=https://$LOCAL_IP/api
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

    # Set proper permissions
    chmod 600 "$APP_DIR/backend/.env"
    chmod 600 "$APP_DIR/frontend/.env"
    chown "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR/backend/.env"
    chown "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR/frontend/.env"
    
    log "Environment files configured"
}

# Install application dependencies
install_dependencies() {
    log "Installing application dependencies..."
    
    cd "$APP_DIR"
    
    # Install as deploy user
    sudo -u "$DEPLOY_USER" npm install
    sudo -u "$DEPLOY_USER" npm run build
    
    log "Dependencies installed and application built"
}

# Initialize database
initialize_database() {
    log "Initializing database..."
    
    # Source credentials
    source /root/.mysql_credentials
    
    # Run database initialization
    cd "$APP_DIR"
    sudo -u "$DEPLOY_USER" npm run setup-db
    
    log "Database initialized successfully"
}

# Configure Nginx
configure_nginx() {
    log "Configuring Nginx..."
    
    # Backup default config
    cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup
    
    # Create ULT FPEB site configuration
    cat > /etc/nginx/sites-available/ult-fpeb << EOF
# ULT FPEB Visitor Management - Nginx Configuration
server {
    listen 80;
    server_name $LOCAL_IP $DOMAIN_NAME localhost;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $LOCAL_IP $DOMAIN_NAME localhost;
    
    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/server.crt;
    ssl_certificate_key /etc/nginx/ssl/server.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:;" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Document root
    root $APP_DIR/frontend/dist;
    index index.html;
    
    # Logging
    access_log /var/log/nginx/ult-fpeb-access.log;
    error_log /var/log/nginx/ult-fpeb-error.log;
    
    # Client max body size for file uploads
    client_max_body_size 50M;
    
    # API proxy to backend
    location /api {
        proxy_pass http://127.0.0.1:3001;
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
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    # Handle React Router (SPA)
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\\n";
        add_header Content-Type text/plain;
    }
    
    # Deny access to sensitive files
    location ~ /\\.ht {
        deny all;
    }
    
    location ~ /\\.(env|git) {
        deny all;
    }
}
EOF

    # Enable site and disable default
    ln -sf /etc/nginx/sites-available/ult-fpeb /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Test and reload Nginx
    nginx -t
    systemctl reload nginx
    
    log "Nginx configured successfully"
}

# Configure PM2
configure_pm2() {
    log "Configuring PM2..."
    
    # Create PM2 ecosystem file
    cat > "$APP_DIR/ecosystem.config.js" << EOF
module.exports = {
  apps: [{
    name: '$SERVICE_NAME-backend',
    cwd: '$APP_DIR/backend',
    script: 'src/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: '$APP_DIR/logs/backend-error.log',
    out_file: '$APP_DIR/logs/backend-out.log',
    log_file: '$APP_DIR/logs/backend-combined.log',
    time: true,
    max_memory_restart: '500M',
    node_args: '--max-old-space-size=512'
  }]
};
EOF

    chown "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR/ecosystem.config.js"
    
    # Start PM2 as deploy user
    sudo -u "$DEPLOY_USER" bash -c "cd $APP_DIR && pm2 start ecosystem.config.js"
    sudo -u "$DEPLOY_USER" pm2 save
    
    # Generate startup script
    sudo -u "$DEPLOY_USER" pm2 startup systemd -u "$DEPLOY_USER" --hp "/home/$DEPLOY_USER"
    
    log "PM2 configured and application started"
}

# Configure firewall
configure_firewall() {
    log "Configuring firewall..."
    
    # Install ufw if not present
    apt-get install -y ufw
    
    # Reset firewall rules
    ufw --force reset
    
    # Default policies
    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow SSH
    ufw allow ssh
    
    # Allow HTTP and HTTPS
    ufw allow 80
    ufw allow 443
    
    # Allow specific local network access if needed
    ufw allow from 192.168.0.0/16 to any port 22
    ufw allow from 10.0.0.0/8 to any port 22
    ufw allow from 172.16.0.0/12 to any port 22
    
    # Enable firewall
    ufw --force enable
    
    log "Firewall configured"
}

# Create maintenance scripts
create_maintenance_scripts() {
    log "Creating maintenance scripts..."
    
    # Backup script
    cat > /usr/local/bin/ult-backup << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/ult-fpeb"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Database backup
source /root/.mysql_credentials
mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" > "$BACKUP_DIR/db_$DATE.sql"

# Application backup
tar -czf "$BACKUP_DIR/app_$DATE.tar.gz" -C /opt ult-fpeb --exclude=node_modules --exclude=logs

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "*.sql" -mtime +7 -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

    # Update script
    cat > /usr/local/bin/ult-update << 'EOF'
#!/bin/bash
APP_DIR="/opt/ult-fpeb"
DEPLOY_USER="ult-deploy"

echo "Updating ULT FPEB application..."

# Stop services
sudo -u "$DEPLOY_USER" pm2 stop all

# Update code (if using git)
cd "$APP_DIR"
# git pull origin main

# Install dependencies and build
sudo -u "$DEPLOY_USER" npm install
sudo -u "$DEPLOY_USER" npm run build

# Start services
sudo -u "$DEPLOY_USER" pm2 start all

echo "Update completed"
EOF

    # Status script
    cat > /usr/local/bin/ult-status << 'EOF'
#!/bin/bash
echo "=== ULT FPEB System Status ==="
echo
echo "Nginx Status:"
systemctl status nginx --no-pager -l

echo
echo "MySQL Status:"
systemctl status mysql --no-pager -l

echo
echo "PM2 Status:"
sudo -u ult-deploy pm2 status

echo
echo "Disk Usage:"
df -h /opt/ult-fpeb

echo
echo "Memory Usage:"
free -h
EOF

    # Make scripts executable
    chmod +x /usr/local/bin/ult-backup
    chmod +x /usr/local/bin/ult-update
    chmod +x /usr/local/bin/ult-status
    
    # Create daily backup cron job
    echo "0 2 * * * root /usr/local/bin/ult-backup" > /etc/cron.d/ult-backup
    
    log "Maintenance scripts created"
}

# Print deployment summary
print_summary() {
    log "=== DEPLOYMENT COMPLETED SUCCESSFULLY ==="
    echo
    info "Application URL: https://$LOCAL_IP"
    info "Local domain: https://$DOMAIN_NAME (add to /etc/hosts)"
    info "Application directory: $APP_DIR"
    info "Deploy user: $DEPLOY_USER"
    info "Database: ult_fpeb_prod"
    echo
    info "Credentials stored in: /root/.mysql_credentials"
    info "Log file: $LOG_FILE"
    echo
    info "Management commands:"
    info "  - Check status: ult-status"
    info "  - Create backup: ult-backup"
    info "  - Update app: ult-update"
    echo
    info "Default login credentials:"
    info "  - Admin: admin@ultfpeb.up.edu / admin123"
    info "  - Receptionist: receptionist@ultfpeb.up.edu / receptionist123"
    echo
    warn "Please change default passwords after first login!"
    warn "Add '$LOCAL_IP $DOMAIN_NAME' to client /etc/hosts files"
}

# Main deployment function
main() {
    log "Starting ULT FPEB deployment on $LOCAL_IP..."
    
    check_root
    detect_os
    update_system
    install_nodejs
    install_mysql
    install_nginx
    install_ssl
    create_deploy_user
    setup_app_directory
    configure_environment
    install_dependencies
    initialize_database
    configure_nginx
    configure_pm2
    configure_firewall
    create_maintenance_scripts
    
    print_summary
}

# Run main function
main "$@"