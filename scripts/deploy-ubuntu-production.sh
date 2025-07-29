#!/bin/bash

#===============================================================================
# ULT FPEB Production Deploy Script for Ubuntu Server with SSL
# 
# This script automatically deploys the ULT FPEB application to Ubuntu server
# with MySQL database, Nginx reverse proxy, and Let's Encrypt SSL
#
# Prerequisites:
# - Ubuntu 20.04+ server
# - Root or sudo access
# - Internet connection
# - Domain pointing to server IP (for SSL)
#
# Usage:
#   chmod +x deploy-ubuntu-production.sh
#   sudo ./deploy-ubuntu-production.sh [domain] [email]
#   
# Example:
#   sudo ./deploy-ubuntu-production.sh your-domain.com admin@your-domain.com
#   sudo ./deploy-ubuntu-production.sh 192.168.1.100 admin@company.com  # For local IP without SSL
#===============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration variables
APP_NAME="ult-fpeb"
APP_DIR="/var/www/$APP_NAME"
DB_NAME="ult_fpeb_production"
DB_USER="ult_fpeb_user"
DB_PASSWORD="$(openssl rand -base64 32 | tr -d '=+/' | cut -c1-25)"
DOMAIN="${1:-localhost}"
EMAIL="${2:-admin@$DOMAIN}"
BACKEND_PORT="3001"
NODE_VERSION="18"
USE_SSL=false

# Determine SSL configuration based on domain/IP
if [[ $DOMAIN =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || [[ $DOMAIN == "localhost" ]] || [[ $DOMAIN == "127.0.0.1" ]]; then
    # For IP addresses, offer choice between HTTP and HTTPS with self-signed certificate
    echo -e "${YELLOW}[INFO]${NC} Detected IP address or localhost."
    echo -e "${CYAN}SSL Options:${NC}"
    echo -e "  1) HTTP only (no SSL)"
    echo -e "  2) HTTPS with self-signed certificate (recommended for local networks)"
    read -p "Choose SSL option (1 or 2, default: 2): " ssl_choice
    
    if [[ $ssl_choice == "1" ]]; then
        USE_SSL=false
        SSL_TYPE="none"
        echo -e "${YELLOW}[INFO]${NC} SSL disabled. Using HTTP only."
    else
        USE_SSL=true
        SSL_TYPE="self-signed"
        echo -e "${GREEN}[INFO]${NC} SSL enabled with self-signed certificate."
    fi
else
    USE_SSL=true
    SSL_TYPE="letsencrypt"
    echo -e "${GREEN}[INFO]${NC} Detected domain name. SSL will be enabled with Let's Encrypt."
fi

# Log functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_header() {
    echo -e "${CYAN}===============================================================================${NC}"
    echo -e "${CYAN}${1}${NC}"
    echo -e "${CYAN}===============================================================================${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Print deployment info
print_deployment_info() {
    log_header "ULT FPEB PRODUCTION DEPLOYMENT INFORMATION"
    echo -e "${CYAN}Application:${NC} $APP_NAME"
    echo -e "${CYAN}Domain:${NC} $DOMAIN"
    echo -e "${CYAN}Email:${NC} $EMAIL"
    echo -e "${CYAN}Database:${NC} $DB_NAME"
    echo -e "${CYAN}SSL Enabled:${NC} $USE_SSL"
    if [[ $USE_SSL == true ]]; then
        echo -e "${CYAN}SSL Type:${NC} $SSL_TYPE"
    fi
    echo -e "${CYAN}Backend Port:${NC} $BACKEND_PORT"
    echo ""
    
    if [[ $USE_SSL == false ]]; then
        log_warning "SSL is disabled for this deployment"
        log_warning "Application will be accessible via HTTP only"
    fi
    
    read -p "Continue with deployment? (y/N): " confirm
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        log_info "Deployment cancelled by user"
        exit 0
    fi
}

# Update system packages
update_system() {
    log_header "UPDATING SYSTEM PACKAGES"
    export DEBIAN_FRONTEND=noninteractive
    apt update && apt upgrade -y
    log_success "System packages updated"
}

# Install required packages
install_packages() {
    log_header "INSTALLING REQUIRED PACKAGES"
    
    # Install basic packages
    apt install -y curl wget git unzip software-properties-common \
                   build-essential python3-pip nginx ufw fail2ban \
                   htop tree vim nano
    
    # Install certbot only if SSL is enabled
    if [[ $USE_SSL == true ]]; then
        apt install -y certbot python3-certbot-nginx
        log_success "Certbot installed for SSL"
    fi
    
    log_success "Basic packages installed"
}

# Install Node.js
install_nodejs() {
    log_header "INSTALLING NODE.JS $NODE_VERSION"
    
    # Remove existing Node.js
    apt remove -y nodejs npm || true
    
    # Install Node.js using NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt install -y nodejs
    
    # Verify installation
    NODE_VER=$(node --version)
    NPM_VER=$(npm --version)
    
    log_success "Node.js $NODE_VER and npm $NPM_VER installed"
    
    # Install PM2 globally
    npm install -g pm2
    log_success "PM2 process manager installed"
}

# Install and configure MySQL
install_mysql() {
    log_header "INSTALLING AND CONFIGURING MYSQL"
    
    # Set non-interactive mode for MySQL installation
    export DEBIAN_FRONTEND=noninteractive
    
    # Generate MySQL root password
    MYSQL_ROOT_PASSWORD="$(openssl rand -base64 32 | tr -d '=+/' | cut -c1-25)"
    
    # Pre-configure MySQL installation
    echo "mysql-server mysql-server/root_password password $MYSQL_ROOT_PASSWORD" | debconf-set-selections
    echo "mysql-server mysql-server/root_password_again password $MYSQL_ROOT_PASSWORD" | debconf-set-selections
    
    # Install MySQL Server
    apt install -y mysql-server
    
    # Secure MySQL installation
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" --execute="ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '$MYSQL_ROOT_PASSWORD';"
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" --execute="DELETE FROM mysql.user WHERE User='';"
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" --execute="DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');"
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" --execute="DROP DATABASE IF EXISTS test;"
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" --execute="DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';"
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" --execute="FLUSH PRIVILEGES;"
    
    # Create application database and user
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" --execute="CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" --execute="CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';"
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" --execute="GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';"
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" --execute="FLUSH PRIVILEGES;"
    
    # Start and enable MySQL service
    systemctl start mysql
    systemctl enable mysql
    
    # Save MySQL credentials
    cat > /root/mysql_credentials.txt << EOF
MySQL Root Password: $MYSQL_ROOT_PASSWORD
Database Name: $DB_NAME
Database User: $DB_USER
Database Password: $DB_PASSWORD
EOF
    chmod 600 /root/mysql_credentials.txt
    
    log_success "MySQL installed and configured"
    log_warning "MySQL credentials saved to /root/mysql_credentials.txt"
}

# Create application user
create_app_user() {
    log_header "CREATING APPLICATION USER"
    
    # Create user if doesn't exist
    if ! id "$APP_NAME" &>/dev/null; then
        useradd -r -m -s /bin/bash $APP_NAME
        log_success "User $APP_NAME created"
    else
        log_info "User $APP_NAME already exists"
    fi
    
    # Add to www-data group
    usermod -a -G www-data $APP_NAME
}

# Setup application directory
setup_app_directory() {
    log_header "SETTING UP APPLICATION DIRECTORY"
    
    # Create application directory
    mkdir -p $APP_DIR
    
    # Set ownership and permissions
    chown -R $APP_NAME:www-data $APP_DIR
    chmod -R 755 $APP_DIR
    
    log_success "Application directory created at $APP_DIR"
}

# Deploy application code
deploy_application() {
    log_header "DEPLOYING APPLICATION CODE"
    
    # Copy application files (assuming script is run from project root)
    log_info "Copying application files to $APP_DIR..."
    cp -r . $APP_DIR/
    
    # Verify critical directories exist
    if [ ! -d "$APP_DIR/backend" ]; then
        log_error "Backend directory not found after copying"
        exit 1
    fi
    
    if [ ! -d "$APP_DIR/frontend" ]; then
        log_error "Frontend directory not found after copying"
        exit 1
    fi
    
    # Remove development and unnecessary files
    log_info "Cleaning up unnecessary files..."
    rm -rf $APP_DIR/node_modules
    rm -rf $APP_DIR/frontend/node_modules
    rm -rf $APP_DIR/backend/node_modules
    rm -rf $APP_DIR/frontend/dist
    rm -rf $APP_DIR/.git
    rm -f $APP_DIR/scripts/deploy-ubuntu-production.sh
    rm -rf $APP_DIR/.claude
    
    # Preserve only .docx templates
    find $APP_DIR -name "*.log" -delete 2>/dev/null || true
    find $APP_DIR -name "*.tmp" -delete 2>/dev/null || true
    find $APP_DIR -name ".DS_Store" -delete 2>/dev/null || true
    
    # Set proper ownership
    chown -R $APP_NAME:www-data $APP_DIR
    
    # Verify package.json files exist
    log_info "Verifying project structure..."
    if [ -f "$APP_DIR/package.json" ]; then
        log_success "Root package.json found"
    else
        log_warning "No root package.json found (this is normal for this project)"
    fi
    
    if [ -f "$APP_DIR/backend/package.json" ]; then
        log_success "Backend package.json found"
    else
        log_error "Backend package.json missing - deployment cannot continue"
        exit 1
    fi
    
    if [ -f "$APP_DIR/frontend/package.json" ]; then
        log_success "Frontend package.json found"
    else
        log_error "Frontend package.json missing - deployment cannot continue"
        exit 1
    fi
    
    log_success "Application code deployed successfully"
}

# Install application dependencies
install_dependencies() {
    log_header "INSTALLING APPLICATION DEPENDENCIES"
    
    # Check if root package.json exists, if not, skip root level installation
    if [ -f "$APP_DIR/package.json" ]; then
        log_info "Installing root level dependencies..."
        cd $APP_DIR
        sudo -u $APP_NAME npm install --omit=dev
        log_success "Root dependencies installed"
    else
        log_info "No root package.json found, skipping root level dependencies"
    fi
    
    # Install backend dependencies
    if [ -f "$APP_DIR/backend/package.json" ]; then
        log_info "Installing backend dependencies..."
        cd $APP_DIR/backend
        sudo -u $APP_NAME npm install --omit=dev
        log_success "Backend dependencies installed"
    else
        log_error "Backend package.json not found at $APP_DIR/backend/package.json"
        exit 1
    fi
    
    # Install frontend dependencies and build
    if [ -f "$APP_DIR/frontend/package.json" ]; then
        log_info "Installing frontend dependencies and building..."
        cd $APP_DIR/frontend
        sudo -u $APP_NAME npm install
        sudo -u $APP_NAME npm run build
        log_success "Frontend built successfully"
    else
        log_error "Frontend package.json not found at $APP_DIR/frontend/package.json"
        exit 1
    fi
}

# Configure environment files
configure_environment() {
    log_header "CONFIGURING ENVIRONMENT FILES"
    
    # Generate JWT secret
    JWT_SECRET="$(openssl rand -base64 64 | tr -d '\n')"
    
    # Create backend .env file
    cat > $APP_DIR/backend/.env << EOF
# Production Environment Configuration
NODE_ENV=production
PORT=$BACKEND_PORT

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# JWT Configuration
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h

# Upload Configuration
UPLOAD_PATH=$APP_DIR/backend/uploads

# CORS Origins
CORS_ORIGINS=http://$DOMAIN,https://$DOMAIN,http://localhost:3000,http://localhost:5173

# Security Configuration
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCK_TIME=30

# Application Configuration
APP_NAME="ULT FPEB Visitor Management"
APP_VERSION="1.0.0"
DEBUG=false
EOF
    
    # Create frontend .env file
    local PROTOCOL="http"
    if [[ $USE_SSL == true ]]; then
        PROTOCOL="https"
    fi
    
    cat > $APP_DIR/frontend/.env << EOF
# Production Frontend Environment
VITE_API_URL=${PROTOCOL}://$DOMAIN/api
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

# Security Settings
VITE_SHOW_DEV_TOOLS=false
VITE_ENABLE_LOGGING=false

# Performance Settings
VITE_ENABLE_PWA=true
VITE_ENABLE_ANALYTICS=false
EOF
    
    # Create uploads directory structure
    mkdir -p $APP_DIR/backend/uploads/{photos,signatures,complaints,feedback,lost-items,reports,profiles}
    chown -R $APP_NAME:www-data $APP_DIR/backend/uploads
    chmod -R 755 $APP_DIR/backend/uploads
    
    # Set proper permissions for env files
    chown $APP_NAME:www-data $APP_DIR/backend/.env
    chown $APP_NAME:www-data $APP_DIR/frontend/.env
    chmod 644 $APP_DIR/backend/.env
    chmod 644 $APP_DIR/frontend/.env
    
    log_success "Environment files configured"
}

# Initialize database
initialize_database() {
    log_header "INITIALIZING DATABASE"
    
    cd $APP_DIR
    
    # Set environment variables for database initialization
    export DB_HOST=localhost
    export DB_NAME=$DB_NAME
    export DB_USER=$DB_USER
    export DB_PASSWORD=$DB_PASSWORD
    export NODE_ENV=production
    
    # Run database initialization script
    sudo -u $APP_NAME -E node scripts/improved-production-deployment.cjs --env=production
    
    log_success "Database initialized with production data"
}

# Configure PM2 for process management
configure_pm2() {
    log_header "CONFIGURING PM2 PROCESS MANAGEMENT"
    
    # Create PM2 ecosystem file
    cat > $APP_DIR/ecosystem.config.cjs << EOF
module.exports = {
  apps: [{
    name: '$APP_NAME-backend',
    script: 'backend/server.js',
    cwd: '$APP_DIR',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: $BACKEND_PORT
    },
    error_file: '/var/log/$APP_NAME/backend-error.log',
    out_file: '/var/log/$APP_NAME/backend-out.log',
    log_file: '/var/log/$APP_NAME/backend.log',
    time: true,
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    watch: false,
    ignore_watch: ["node_modules", "uploads", "logs"],
    kill_timeout: 5000,
    listen_timeout: 3000,
    wait_ready: true
  }]
};
EOF
    
    # Create log directory
    mkdir -p /var/log/$APP_NAME
    chown -R $APP_NAME:www-data /var/log/$APP_NAME
    
    # Start application with PM2
    cd $APP_DIR
    sudo -u $APP_NAME pm2 start ecosystem.config.cjs
    sudo -u $APP_NAME pm2 save
    
    # Setup PM2 startup script
    env PATH=$PATH:/usr/bin pm2 startup systemd -u $APP_NAME --hp /home/$APP_NAME
    
    log_success "PM2 configured and application started"
}

# Configure Nginx without SSL
configure_nginx_http() {
    log_header "CONFIGURING NGINX (HTTP ONLY)"
    
    # Create Nginx site configuration for HTTP only
    cat > /etc/nginx/sites-available/$APP_NAME << EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: http: https:;" always;
    
    # Set maximum upload size
    client_max_body_size 20M;
    
    # Serve static files (frontend build)
    location / {
        root $APP_DIR/frontend/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|pdf|docx)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            access_log off;
        }
    }
    
    # API proxy to backend
    location /api/ {
        proxy_pass http://localhost:$BACKEND_PORT/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        proxy_send_timeout 300s;
        
        # Handle large uploads
        client_max_body_size 20M;
        proxy_request_buffering off;
    }
    
    # Upload files
    location /uploads/ {
        alias $APP_DIR/backend/uploads/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
        access_log off;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://localhost:$BACKEND_PORT/api/health;
        access_log off;
    }
    
    # Security: Hide sensitive files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    location ~ \.(env|log|json|md|txt|sql)$ {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # Prevent access to node_modules
    location ~ /node_modules/ {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json
        application/x-javascript
        font/truetype
        font/opentype
        image/svg+xml;
}
EOF
    
    configure_nginx_common
}

# Configure Nginx with Let's Encrypt SSL
configure_nginx_letsencrypt() {
    log_header "CONFIGURING NGINX WITH LET'S ENCRYPT SSL"
    
    # Create temporary HTTP configuration for SSL certificate generation
    cat > /etc/nginx/sites-available/$APP_NAME << EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    # Allow Let's Encrypt validation
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}
EOF
    
    configure_nginx_common
    
    # Generate SSL certificate
    log_info "Generating SSL certificate for $DOMAIN..."
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect
    
    # Update Nginx configuration with full HTTPS setup
    cat > /etc/nginx/sites-available/$APP_NAME << EOF
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:;" always;
    
    # Set maximum upload size
    client_max_body_size 20M;
    
    # Serve static files (frontend build)
    location / {
        root $APP_DIR/frontend/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|pdf|docx)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            access_log off;
        }
    }
    
    # API proxy to backend
    location /api/ {
        proxy_pass http://localhost:$BACKEND_PORT/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        proxy_send_timeout 300s;
        
        # Handle large uploads
        client_max_body_size 20M;
        proxy_request_buffering off;
    }
    
    # Upload files
    location /uploads/ {
        alias $APP_DIR/backend/uploads/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
        access_log off;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://localhost:$BACKEND_PORT/api/health;
        access_log off;
    }
    
    # Security: Hide sensitive files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    location ~ \.(env|log|json|md|txt|sql)$ {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # Prevent access to node_modules
    location ~ /node_modules/ {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json
        application/x-javascript
        font/truetype
        font/opentype
        image/svg+xml;
}
EOF
    
    # Reload Nginx to apply SSL configuration
    nginx -t && systemctl reload nginx
    log_success "Let's Encrypt SSL certificate generated and configured"
}

# Configure Nginx with self-signed SSL
configure_nginx_selfsigned() {
    log_header "CONFIGURING NGINX WITH SELF-SIGNED SSL"
    
    # Generate self-signed certificate first
    generate_self_signed_certificate
    
    # Create HTTPS configuration with self-signed certificate
    cat > /etc/nginx/sites-available/$APP_NAME << EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    
    # Self-signed SSL Configuration
    ssl_certificate /etc/nginx/ssl/$APP_NAME.crt;
    ssl_certificate_key /etc/nginx/ssl/$APP_NAME.key;
    
    # SSL settings for self-signed certificate
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_ecdh_curve secp384r1;
    ssl_session_timeout 10m;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:;" always;
    
    # Set maximum upload size
    client_max_body_size 20M;
    
    # Serve static files (frontend build)
    location / {
        root $APP_DIR/frontend/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|pdf|docx)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            access_log off;
        }
    }
    
    # API proxy to backend
    location /api/ {
        proxy_pass http://localhost:$BACKEND_PORT/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        proxy_send_timeout 300s;
        
        # Handle large uploads
        client_max_body_size 20M;
        proxy_request_buffering off;
    }
    
    # Upload files
    location /uploads/ {
        alias $APP_DIR/backend/uploads/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
        access_log off;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://localhost:$BACKEND_PORT/api/health;
        access_log off;
    }
    
    # Security: Hide sensitive files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    location ~ \.(env|log|json|md|txt|sql)$ {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # Prevent access to node_modules
    location ~ /node_modules/ {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json
        application/x-javascript
        font/truetype
        font/opentype
        image/svg+xml;
}
EOF
    
    configure_nginx_common
    log_success "Self-signed SSL certificate configured"
}

# Common Nginx configuration tasks
configure_nginx_common() {
    # Enable site
    ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
    
    # Remove default site
    rm -f /etc/nginx/sites-enabled/default
    
    # Test Nginx configuration
    nginx -t
    
    # Restart Nginx
    systemctl restart nginx
    systemctl enable nginx
    
    log_success "Nginx configured and started"
}

# Configure firewall
configure_firewall() {
    log_header "CONFIGURING FIREWALL"
    
    # Reset UFW to default settings
    ufw --force reset
    
    # Set default policies
    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow SSH
    ufw allow ssh
    
    # Allow HTTP and HTTPS
    ufw allow 'Nginx Full'
    
    # Allow MySQL (only from localhost)
    ufw allow from 127.0.0.1 to any port 3306
    
    # Allow backend port (only from localhost)
    ufw allow from 127.0.0.1 to any port $BACKEND_PORT
    
    # Enable UFW
    ufw --force enable
    
    # Show status
    ufw status verbose
    
    log_success "Firewall configured"
}

# Generate self-signed SSL certificate for IP address
generate_self_signed_certificate() {
    log_header "GENERATING SELF-SIGNED SSL CERTIFICATE"
    
    # Create SSL directory
    mkdir -p /etc/nginx/ssl
    
    # Generate private key
    log_info "Generating private key..."
    openssl genrsa -out /etc/nginx/ssl/$APP_NAME.key 2048
    
    # Create certificate signing request config
    cat > /tmp/cert.conf << EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
req_extensions = req_ext
distinguished_name = dn

[dn]
C=ID
ST=West Java
L=Bandung
O=ULT FPEB UPI
OU=IT Department
CN=$DOMAIN

[req_ext]
subjectAltName = @alt_names

[alt_names]
IP.1 = $DOMAIN
DNS.1 = localhost
DNS.2 = $DOMAIN
EOF

    # Generate certificate
    log_info "Generating self-signed certificate..."
    openssl req -new -x509 -key /etc/nginx/ssl/$APP_NAME.key \
        -out /etc/nginx/ssl/$APP_NAME.crt \
        -days 365 \
        -config /tmp/cert.conf
    
    # Set proper permissions
    chmod 600 /etc/nginx/ssl/$APP_NAME.key
    chmod 644 /etc/nginx/ssl/$APP_NAME.crt
    
    # Clean up temp files
    rm -f /tmp/cert.conf
    
    log_success "Self-signed certificate generated"
    log_warning "Certificate is valid for 1 year. Remember to renew before expiration."
    log_warning "Browser will show security warning for self-signed certificate - this is normal."
}

# Setup automatic SSL renewal
setup_ssl_renewal() {
    if [[ $USE_SSL == true && $SSL_TYPE == "letsencrypt" ]]; then
        log_header "SETTING UP SSL CERTIFICATE AUTO-RENEWAL"
        
        # Test certificate renewal
        certbot renew --dry-run
        
        # Setup cron job for automatic renewal
        cat > /etc/cron.d/certbot << EOF
# Renew Let's Encrypt certificates twice daily
0 */12 * * * root certbot renew --quiet && systemctl reload nginx
EOF
        
        log_success "SSL auto-renewal configured"
    elif [[ $USE_SSL == true && $SSL_TYPE == "self-signed" ]]; then
        log_info "Self-signed certificate renewal must be done manually"
        log_info "Certificate expires in 1 year from today"
    fi
}

# Create systemd service for automatic startup
create_systemd_service() {
    log_header "CREATING SYSTEMD SERVICE"
    
    cat > /etc/systemd/system/$APP_NAME.service << EOF
[Unit]
Description=ULT FPEB Visitor Management Application
After=network.target mysql.service nginx.service
Wants=mysql.service nginx.service

[Service]
Type=forking
User=$APP_NAME
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/pm2 start ecosystem.config.cjs
ExecReload=/usr/bin/pm2 reload ecosystem.config.cjs
ExecStop=/usr/bin/pm2 stop ecosystem.config.cjs
Restart=always
RestartSec=10
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable $APP_NAME
    
    log_success "Systemd service created and enabled"
}

# Setup log rotation
setup_log_rotation() {
    log_header "SETTING UP LOG ROTATION"
    
    cat > /etc/logrotate.d/$APP_NAME << EOF
/var/log/$APP_NAME/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0644 $APP_NAME www-data
    postrotate
        sudo -u $APP_NAME pm2 reloadLogs
    endscript
}
EOF
    
    log_success "Log rotation configured"
}

# Cleanup and optimize
cleanup_optimize() {
    log_header "CLEANUP AND OPTIMIZATION"
    
    # Clean package cache
    apt autoremove -y
    apt autoclean
    
    # Clear npm cache
    sudo -u $APP_NAME npm cache clean --force
    
    # Set proper permissions
    chown -R $APP_NAME:www-data $APP_DIR
    find $APP_DIR -type f -exec chmod 644 {} \;
    find $APP_DIR -type d -exec chmod 755 {} \;
    
    # Make scripts executable
    find $APP_DIR/scripts -name "*.sh" -exec chmod +x {} \; 2>/dev/null || true
    
    # Secure sensitive files
    chmod 600 $APP_DIR/backend/.env
    chmod 600 /root/mysql_credentials.txt
    
    log_success "Cleanup and optimization completed"
}

# Verify deployment
verify_deployment() {
    log_header "VERIFYING DEPLOYMENT"
    
    local errors=0
    
    # Check services
    if systemctl is-active --quiet nginx; then
        log_success "Nginx is running"
    else
        log_error "Nginx is not running"
        ((errors++))
    fi
    
    if systemctl is-active --quiet mysql; then
        log_success "MySQL is running"
    else
        log_error "MySQL is not running"
        ((errors++))
    fi
    
    # Check application
    sleep 5
    if sudo -u $APP_NAME pm2 list | grep -q "online"; then
        log_success "Application is running"
    else
        log_error "Application is not running"
        ((errors++))
    fi
    
    # Check database connection
    if mysql -u $DB_USER -p"$DB_PASSWORD" -h localhost $DB_NAME -e "SELECT 1;" &>/dev/null; then
        log_success "Database connection successful"
    else
        log_error "Database connection failed"
        ((errors++))
    fi
    
    # Test HTTP response
    sleep 5
    local protocol="http"
    if [[ $USE_SSL == true ]]; then
        protocol="https"
    fi
    
    if curl -k -s -o /dev/null -w "%{http_code}" $protocol://$DOMAIN | grep -q "200\|301\|302"; then
        log_success "Web server responding correctly"
    else
        log_warning "Web server may not be responding correctly"
        ((errors++))
    fi
    
    # Test API endpoint
    if curl -k -s -o /dev/null -w "%{http_code}" $protocol://$DOMAIN/api/health | grep -q "200"; then
        log_success "API endpoint responding correctly"
    else
        log_warning "API endpoint may not be responding correctly"
        ((errors++))
    fi
    
    if [[ $errors -gt 0 ]]; then
        log_warning "Deployment completed with $errors warnings"
    else
        log_success "All verification checks passed"
    fi
}

# Print deployment summary
print_summary() {
    log_header "DEPLOYMENT SUMMARY"
    
    echo -e "${GREEN}✅ ULT FPEB successfully deployed to production!${NC}\n"
    
    echo -e "${CYAN}📋 Deployment Information:${NC}"
    echo -e "  • Application Directory: $APP_DIR"
    echo -e "  • Database Name: $DB_NAME"
    echo -e "  • Database User: $DB_USER"
    echo -e "  • Backend Port: $BACKEND_PORT"
    echo -e "  • Domain: $DOMAIN"
    echo -e "  • SSL Enabled: $USE_SSL"
    if [[ $USE_SSL == true ]]; then
        echo -e "  • SSL Type: $SSL_TYPE"
    fi
    
    if [[ $USE_SSL == true ]]; then
        echo -e "  • Web URL: https://$DOMAIN"
        echo -e "  • API URL: https://$DOMAIN/api"
    else
        echo -e "  • Web URL: http://$DOMAIN"
        echo -e "  • API URL: http://$DOMAIN/api"
    fi
    
    echo -e "\n${CYAN}🔧 Management Commands:${NC}"
    echo -e "  • View application logs: sudo -u $APP_NAME pm2 logs"
    echo -e "  • PM2 status: sudo -u $APP_NAME pm2 status"
    echo -e "  • Restart application: sudo -u $APP_NAME pm2 restart all"
    echo -e "  • Nginx status: sudo systemctl status nginx"
    echo -e "  • MySQL status: sudo systemctl status mysql"
    echo -e "  • View system logs: sudo journalctl -u $APP_NAME -f"
    echo -e "  • MySQL credentials: cat /root/mysql_credentials.txt"
    
    echo -e "\n${CYAN}🔐 Default Login Credentials:${NC}"
    echo -e "  • Admin: adminult@fpeb.upi.edu / AdminULT2025!"
    echo -e "  • Arsip: arsip@fpeb.upi.edu / ArsipFPEB2025!"
    echo -e "  • Receptionist: manper@upi.edu / ManperUPI2025!"
    
    echo -e "\n${YELLOW}⚠️  Important Security Notes:${NC}"
    echo -e "  • Change all default passwords immediately after first login"
    echo -e "  • MySQL credentials are stored in /root/mysql_credentials.txt"
    echo -e "  • JWT secret has been automatically generated"
    echo -e "  • Firewall has been configured with minimal required ports"
    echo -e "  • Regular backups should be configured for the database"
    echo -e "  • Monitor application logs regularly"
    
    if [[ $USE_SSL == true && $SSL_TYPE == "letsencrypt" ]]; then
        echo -e "  • SSL certificate will auto-renew via cron job"
    elif [[ $USE_SSL == true && $SSL_TYPE == "self-signed" ]]; then
        echo -e "  • Self-signed certificate is valid for 1 year - set calendar reminder to renew"
        echo -e "  • Browser will show security warning - add exception or import certificate"
        echo -e "  • Certificate files: /etc/nginx/ssl/$APP_NAME.crt and /etc/nginx/ssl/$APP_NAME.key"
    else
        echo -e "  • Consider setting up SSL with a proper domain name"
    fi
    
    echo -e "\n${CYAN}📁 Important File Locations:${NC}"
    echo -e "  • Application: $APP_DIR"
    echo -e "  • Nginx config: /etc/nginx/sites-available/$APP_NAME"
    echo -e "  • Application logs: /var/log/$APP_NAME/"
    echo -e "  • Backend env: $APP_DIR/backend/.env"
    echo -e "  • MySQL credentials: /root/mysql_credentials.txt"
    
    echo -e "\n${GREEN}🎉 Production deployment completed successfully!${NC}"
    echo -e "${GREEN}Your ULT FPEB application is now live and ready to use.${NC}"
}

# Main deployment function
main() {
    log_header "ULT FPEB PRODUCTION DEPLOYMENT FOR UBUNTU SERVER"
    
    check_root
    print_deployment_info
    update_system
    install_packages
    install_nodejs
    install_mysql
    create_app_user
    setup_app_directory
    deploy_application
    install_dependencies
    configure_environment
    initialize_database
    configure_pm2
    
    # Configure Nginx based on SSL preference
    if [[ $USE_SSL == true && $SSL_TYPE == "letsencrypt" ]]; then
        configure_nginx_letsencrypt
        setup_ssl_renewal
    elif [[ $USE_SSL == true && $SSL_TYPE == "self-signed" ]]; then
        configure_nginx_selfsigned
        setup_ssl_renewal
    else
        configure_nginx_http
    fi
    
    configure_firewall
    create_systemd_service
    setup_log_rotation
    cleanup_optimize
    verify_deployment
    print_summary
}

# Handle script interruption
trap 'log_error "Deployment interrupted by user"; exit 1' INT TERM

# Run main function
main "$@"