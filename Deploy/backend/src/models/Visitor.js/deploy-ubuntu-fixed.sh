#!/bin/bash

# 🚀 ULT FPEB - Advanced Ubuntu Production Deployment Script
# Enhanced version with comprehensive monitoring and security

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
PROJECT_NAME="ult-fpeb"
APP_DIR="/var/www/ult-fpeb"
FRONTEND_DIR="/var/www/ult-fpeb-frontend"
DB_NAME="ult_fpeb_db"
DB_USER="ult_fpeb_user"
NODE_VERSION="18"
DEPLOYMENT_ID="deploy-$(date +%s)"

# Load configuration if exists
if [ -f "deploy-config-enhanced.env" ]; then
    source deploy-config-enhanced.env
    echo -e "${CYAN}📄 Loaded configuration from deploy-config-enhanced.env${NC}"
fi

print_header() {
    clear
    echo -e "${MAGENTA}╔════════════════════════════════════════╗${NC}"
    echo -e "${MAGENTA}║        ULT FPEB Ubuntu Deployment     ║${NC}"
    echo -e "${MAGENTA}║      Production-Ready Installation    ║${NC}"
    echo -e "${MAGENTA}╚════════════════════════════════════════╝${NC}"
    echo
    echo -e "${CYAN}🆔 Deployment ID: ${DEPLOYMENT_ID}${NC}"
    echo -e "${CYAN}📅 Date: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
    echo -e "${CYAN}🖥️  Server: $(hostname) ($(hostname -I | awk '{print $1}'))${NC}"
    echo
}

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_step() {
    echo
    echo -e "${CYAN}🔧 [$1]${NC} $2"
    echo -e "${CYAN}$(printf '─%.0s' {1..50})${NC}"
}

check_root() {
    if [ "$EUID" -eq 0 ]; then
        log_error "Please DO NOT run this script as root!"
        log_info "Run as regular user with sudo privileges"
        exit 1
    fi
}

check_ubuntu() {
    if ! command -v lsb_release &> /dev/null; then
        log_error "This script is designed for Ubuntu systems"
        exit 1
    fi

    UBUNTU_VERSION=$(lsb_release -rs)
    log "Detected Ubuntu $UBUNTU_VERSION"
    
    # Check if Ubuntu version is supported
    if (( $(echo "$UBUNTU_VERSION >= 18.04" | bc -l) )); then
        log "✅ Ubuntu version supported"
    else
        log_warning "Ubuntu version may not be fully supported"
    fi
}

create_deployment_log() {
    # Create deployment log in user-accessible location first
    DEPLOYMENT_LOG="$PWD/ult-fpeb-deployment.log"
    touch "$DEPLOYMENT_LOG" 2>/dev/null || {
        log_warning "Cannot create log in current directory, using /tmp"
        DEPLOYMENT_LOG="/tmp/ult-fpeb-deployment-$DEPLOYMENT_ID.log"
        touch "$DEPLOYMENT_LOG"
    }
    chmod 644 "$DEPLOYMENT_LOG"
    exec 1> >(tee -a "$DEPLOYMENT_LOG")
    exec 2> >(tee -a "$DEPLOYMENT_LOG" >&2)
    log "📝 Deployment log: $DEPLOYMENT_LOG"
    
    # Later move to system log location with sudo
    LOG_MOVE_TARGET="/var/log/ult-fpeb-deployment.log"
}

finalize_deployment_log() {
    if [ -n "$LOG_MOVE_TARGET" ] && [ -f "$DEPLOYMENT_LOG" ]; then
        sudo mv "$DEPLOYMENT_LOG" "$LOG_MOVE_TARGET" 2>/dev/null || true
        sudo chmod 644 "$LOG_MOVE_TARGET" 2>/dev/null || true
        log "📝 Deployment log moved to: $LOG_MOVE_TARGET"
    fi
}

install_system_dependencies() {
    log_step "SYSTEM" "Installing System Dependencies"
    
    # Update system
    log "Updating system packages..."
    sudo apt update && sudo apt upgrade -y
    
    # Install essential packages
    log "Installing essential packages..."
    sudo apt install -y \
        curl wget git vim htop tree \
        software-properties-common apt-transport-https \
        ca-certificates gnupg lsb-release \
        ufw fail2ban \
        build-essential python3-dev \
        nginx mysql-server \
        unzip zip tar gzip \
        certbot python3-certbot-nginx \
        bc
    
    log "✅ System dependencies installed"
}

install_nodejs() {
    log_step "NODE" "Installing Node.js $NODE_VERSION"
    
    if command -v node &> /dev/null; then
        CURRENT_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$CURRENT_VERSION" -ge "$NODE_VERSION" ]; then
            log "✅ Node.js $CURRENT_VERSION already installed"
            return
        fi
    fi
    
    # Install Node.js via NodeSource
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
    sudo apt install -y nodejs
    
    # Install PM2 globally
    sudo npm install -g pm2
    
    # Configure PM2 startup
    pm2 startup | tail -1 | sudo bash || true
    
    log "✅ Node.js $(node --version) and PM2 installed"
}

configure_mysql() {
    log_step "DATABASE" "Configuring MySQL Database"
    
    # Secure MySQL installation
    log "Securing MySQL installation..."
    sudo mysql_secure_installation --use-default || true
    
    # Get database password
    while true; do
        read -s -p "Enter password for database user '$DB_USER': " DB_PASSWORD
        echo
        read -s -p "Confirm password: " DB_PASSWORD_CONFIRM
        echo
        
        if [ "$DB_PASSWORD" = "$DB_PASSWORD_CONFIRM" ]; then
            break
        else
            log_error "Passwords do not match. Please try again."
        fi
    done
    
    # Create database and user
    log "Creating database and user..."
    sudo mysql -e "
        CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
        GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
        FLUSH PRIVILEGES;
    "
    
    # Test database connection
    if mysql -u "$DB_USER" -p"$DB_PASSWORD" -e "USE $DB_NAME; SELECT 'Database OK' AS status;" &>/dev/null; then
        log "✅ Database connection successful"
    else
        log_error "Database connection failed"
        exit 1
    fi
}

setup_application() {
    log_step "APP" "Setting Up Application"
    
    # Remove existing installation
    if [ -d "$APP_DIR" ]; then
        log_warning "Removing existing installation..."
        sudo rm -rf "$APP_DIR"
    fi
    
    # Create application directory
    sudo mkdir -p "$APP_DIR"
    sudo chown "$USER:$USER" "$APP_DIR"
    
    # Copy source code (assuming we're running from source directory)
    log "Copying application files..."
    cp -r . "$APP_DIR/"
    cd "$APP_DIR"
    
    # Install root dependencies
    log "Installing root dependencies..."
    npm install --production
    
    # Setup backend
    log "Setting up backend..."
    cd backend
    npm install --production
    
    # Create backend environment
    cat > .env << EOF
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# JWT
JWT_SECRET=$(openssl rand -base64 64)
JWT_EXPIRES_IN=24h

# CORS
CORS_ORIGIN=*
ALLOWED_ORIGINS=*

# Upload
UPLOAD_PATH=uploads/
MAX_FILE_SIZE=10485760

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=1000

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log
EOF
    
    # Create necessary directories
    mkdir -p uploads/visitors uploads/signatures logs
    chmod 755 uploads
    
    # Import database schema if exists
    if [ -f "../database.sql" ]; then
        log "Importing database schema..."
        mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < ../database.sql
    fi
    
    cd ..
    
    # Setup frontend
    log "Setting up frontend..."
    cd frontend
    npm install --production
    
    # Create production environment
    SERVER_IP=$(hostname -I | awk '{print $1}')
    cat > .env.production << EOF
VITE_API_URL=http://$SERVER_IP/api
VITE_APP_TITLE=ULT FPEB - Production
VITE_ENABLE_DEBUG=false
EOF
    
    # Build frontend
    log "Building frontend..."
    npm run build
    
    # Deploy frontend
    sudo mkdir -p "$FRONTEND_DIR"
    sudo cp -r dist/* "$FRONTEND_DIR/"
    sudo chown -R www-data:www-data "$FRONTEND_DIR"
    
    cd ..
    log "✅ Application setup completed"
}

configure_nginx() {
    log_step "NGINX" "Configuring Nginx"
    
    SERVER_IP=$(hostname -I | awk '{print $1}')
    
    # Remove default configuration
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Create ULT FPEB configuration
    sudo tee /etc/nginx/sites-available/ult-fpeb << EOF > /dev/null
# ULT FPEB Production Configuration
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    server_name $SERVER_IP localhost _;
    root $FRONTEND_DIR;
    index index.html;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline' 'unsafe-eval'" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;
    
    # Frontend
    location / {
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API proxy
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # CORS headers
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-Requested-With" always;
        
        if (\$request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "*";
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-Requested-With";
            add_header Access-Control-Max-Age 1728000;
            add_header Content-Type "text/plain; charset=utf-8";
            add_header Content-Length 0;
            return 204;
        }
        
        client_max_body_size 10M;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Uploads
    location /uploads/ {
        alias $APP_DIR/backend/uploads/;
        expires 1y;
        add_header Cache-Control "public";
        add_header Access-Control-Allow-Origin "*";
    }
    
    # Health check
    location /health {
        access_log off;
        return 200 "ULT FPEB System Healthy\\n";
        add_header Content-Type text/plain;
    }
    
    # Logging
    access_log /var/log/nginx/ult-fpeb_access.log;
    error_log /var/log/nginx/ult-fpeb_error.log;
}
EOF
    
    # Enable site
    sudo ln -sf /etc/nginx/sites-available/ult-fpeb /etc/nginx/sites-enabled/
    
    # Test configuration
    if sudo nginx -t; then
        sudo systemctl restart nginx
        log "✅ Nginx configured and restarted"
    else
        log_error "Nginx configuration test failed"
        exit 1
    fi
}

setup_pm2() {
    log_step "PM2" "Setting Up Process Management"
    
    cd "$APP_DIR"
    
    # Create PM2 ecosystem file (ES modules compatible)
    cat > ecosystem.config.cjs << EOF
module.exports = {
  apps: [{
    name: 'ult-fpeb-backend',
    script: './backend/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      HOST: '0.0.0.0'
    },
    error_file: './backend/logs/err.log',
    out_file: './backend/logs/out.log',
    log_file: './backend/logs/combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm Z'
  }]
}
EOF
    
    # Start application with PM2
    pm2 start ecosystem.config.cjs
    pm2 save
    
    log "✅ PM2 configured and application started"
}

configure_firewall() {
    log_step "FIREWALL" "Configuring UFW Firewall"
    
    # Enable UFW
    sudo ufw --force enable
    
    # Allow SSH
    sudo ufw allow OpenSSH
    
    # Allow HTTP/HTTPS
    sudo ufw allow 'Nginx Full'
    
    # Allow from local networks
    sudo ufw allow from 192.168.0.0/16
    sudo ufw allow from 10.0.0.0/8
    sudo ufw allow from 172.16.0.0/12
    
    log "✅ Firewall configured"
}

create_management_tools() {
    log_step "TOOLS" "Creating Management Tools"
    
    # Create ult command
    sudo tee /usr/local/bin/ult << 'EOF' > /dev/null
#!/bin/bash
case "$1" in
    status)
        echo "🔍 ULT FPEB System Status"
        echo "========================"
        echo "📊 Application:"
        pm2 status ult-fpeb-backend
        echo ""
        echo "🌐 Nginx:"
        sudo systemctl status nginx --no-pager -l | grep -E "(Active|Main PID|Tasks)"
        echo ""
        echo "🗄️ MySQL:"
        sudo systemctl status mysql --no-pager -l | grep -E "(Active|Main PID)"
        echo ""
        echo "🔥 Firewall:"
        sudo ufw status numbered
        ;;
    logs)
        echo "📋 Recent Application Logs:"
        pm2 logs ult-fpeb-backend --lines 50
        ;;
    restart)
        echo "🔄 Restarting ULT FPEB..."
        pm2 restart ult-fpeb-backend
        sudo systemctl reload nginx
        echo "✅ Restart completed!"
        ;;
    update)
        echo "🔄 Updating ULT FPEB..."
        cd /var/www/ult-fpeb
        git pull origin main
        cd backend && npm install --production
        pm2 restart ult-fpeb-backend
        cd ../frontend && npm install --production && npm run build
        sudo cp -r dist/* /var/www/ult-fpeb-frontend/
        echo "✅ Update completed!"
        ;;
    backup)
        BACKUP_DIR="/backups/ult-fpeb"
        TIMESTAMP=$(date +%Y%m%d_%H%M%S)
        
        mkdir -p $BACKUP_DIR
        echo "🗄️ Creating backup..."
        mysqldump -u ult_fpeb_user -p ult_fpeb_db > $BACKUP_DIR/database_$TIMESTAMP.sql
        tar -czf $BACKUP_DIR/application_$TIMESTAMP.tar.gz /var/www/ult-fpeb
        echo "✅ Backup completed: $BACKUP_DIR"
        ;;
    *)
        echo "ULT FPEB Management Tool"
        echo "========================"
        echo "Usage: ult {status|logs|restart|update|backup}"
        echo ""
        echo "Commands:"
        echo "  status  - Show system status"
        echo "  logs    - Show application logs"
        echo "  restart - Restart application"
        echo "  update  - Update from Git repository"
        echo "  backup  - Create system backup"
        ;;
esac
EOF
    
    sudo chmod +x /usr/local/bin/ult
    
    log "✅ Management tools created (use 'ult status')"
}

run_health_checks() {
    log_step "HEALTH" "Running Health Checks"
    
    # Wait for services to stabilize
    sleep 5
    
    # Check backend
    if curl -f http://localhost:3001/api/health &>/dev/null; then
        log "✅ Backend API responding"
    else
        log_warning "⚠️ Backend API not responding"
    fi
    
    # Check frontend
    if curl -f http://localhost/ &>/dev/null; then
        log "✅ Frontend responding"
    else
        log_warning "⚠️ Frontend not responding"
    fi
    
    # Check PM2
    if pm2 describe ult-fpeb-backend &>/dev/null; then
        log "✅ PM2 process running"
    else
        log_warning "⚠️ PM2 process not found"
    fi
    
    log "🔍 Health checks completed"
}

create_deployment_summary() {
    log_step "SUMMARY" "Creating Deployment Summary"
    
    SERVER_IP=$(hostname -I | awk '{print $1}')
    
    cat > "$APP_DIR/DEPLOYMENT_SUMMARY.md" << EOF
# 🎉 ULT FPEB Deployment Summary

**Deployment ID**: $DEPLOYMENT_ID  
**Date**: $(date)  
**Server**: $(hostname) ($SERVER_IP)  
**Status**: DEPLOYED ✅

## 🌐 Access Points

- **Frontend**: http://$SERVER_IP/
- **API**: http://$SERVER_IP/api/
- **Health**: http://$SERVER_IP/health

## 🔧 Management

- **Status**: \`ult status\`
- **Logs**: \`ult logs\`
- **Restart**: \`ult restart\`
- **Update**: \`ult update\`
- **Backup**: \`ult backup\`

## 📁 Directories

- **Application**: $APP_DIR
- **Frontend**: $FRONTEND_DIR
- **Logs**: $APP_DIR/backend/logs
- **Uploads**: $APP_DIR/backend/uploads

## 🔑 Default Admin

- **Email**: admin@ult-fpeb.ac.id
- **Password**: admin123
- **⚠️ Change password after first login!**

EOF
    
    log "📄 Deployment summary created: $APP_DIR/DEPLOYMENT_SUMMARY.md"
}

display_completion() {
    SERVER_IP=$(hostname -I | awk '{print $1}')
    
    clear
    echo -e "${GREEN}🎉 ULT FPEB DEPLOYMENT COMPLETE!${NC}"
    echo -e "${CYAN}══════════════════════════════════${NC}"
    echo
    echo -e "${BLUE}🌐 Access Your Application:${NC}"
    echo -e "   Frontend: ${GREEN}http://$SERVER_IP/${NC}"
    echo -e "   API: ${GREEN}http://$SERVER_IP/api/${NC}"
    echo -e "   Health: ${GREEN}http://$SERVER_IP/health${NC}"
    echo
    echo -e "${BLUE}🔑 Default Admin Login:${NC}"
    echo -e "   Email: ${GREEN}admin@ult-fpeb.ac.id${NC}"
    echo -e "   Password: ${GREEN}admin123${NC}"
    echo -e "   ${YELLOW}⚠️ CHANGE PASSWORD IMMEDIATELY!${NC}"
    echo
    echo -e "${BLUE}🔧 Management Commands:${NC}"
    echo -e "   System status: ${YELLOW}ult status${NC}"
    echo -e "   View logs: ${YELLOW}ult logs${NC}"
    echo -e "   Restart app: ${YELLOW}ult restart${NC}"
    echo -e "   Update app: ${YELLOW}ult update${NC}"
    echo -e "   Backup data: ${YELLOW}ult backup${NC}"
    echo
    echo -e "${BLUE}📊 Services:${NC}"
    echo -e "   Backend: ${GREEN}PM2 (ult-fpeb-backend)${NC}"
    echo -e "   Frontend: ${GREEN}Nginx${NC}"
    echo -e "   Database: ${GREEN}MySQL${NC}"
    echo -e "   Firewall: ${GREEN}UFW${NC}"
    echo
    echo -e "${GREEN}🎯 Deployment ID: $DEPLOYMENT_ID${NC}"
    echo -e "${GREEN}✨ ULT FPEB is ready for production use!${NC}"
}

# Main deployment flow
main() {
    print_header
    check_root
    check_ubuntu
    create_deployment_log
    
    log "🚀 Starting ULT FPEB Ubuntu deployment..."
    
    install_system_dependencies
    install_nodejs
    configure_mysql
    setup_application
    configure_nginx
    setup_pm2
    configure_firewall
    create_management_tools
    run_health_checks
    create_deployment_summary
    finalize_deployment_log
    
    display_completion
}

# Run main function
main "$@"
