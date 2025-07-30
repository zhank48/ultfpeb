#!/bin/bash

# ==============================================
# ULT FPEB Continue Deployment Script
# ==============================================
# 
# Continue deployment after interruption
# Usage: sudo ./continue-deployment.sh [LOCAL_IP]
# ==============================================

set -euo pipefail

# Configuration
LOCAL_IP="${1:-$(hostname -I | awk '{print $1}')}"
APP_DIR="/opt/ult-fpeb"
DEPLOY_USER="ult-deploy"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    error "This script must be run as root (use sudo)"
fi

log "Continuing ULT FPEB deployment for IP: $LOCAL_IP"

# Install rsync if missing
if ! command -v rsync &> /dev/null; then
    log "Installing rsync..."
    apt-get update -y
    apt-get install -y rsync
fi

# Get current script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

log "Script directory: $SCRIPT_DIR"
log "Project root: $PROJECT_ROOT"

# Copy project files to app directory
if [[ -d "$PROJECT_ROOT" ]]; then
    log "Copying project files to $APP_DIR..."
    mkdir -p "$APP_DIR"
    
    # Copy project files excluding development files
    rsync -av --exclude='node_modules' --exclude='.git' --exclude='*.log' \
          --exclude='*.md' --exclude='*.bat' --exclude='.env.laragon' \
          "$PROJECT_ROOT/" "$APP_DIR/"
else
    log "Setting up minimal project structure..."
    mkdir -p "$APP_DIR/backend/src"
    mkdir -p "$APP_DIR/frontend/src"
    
    # Copy essential files
    if [[ -f "$SCRIPT_DIR/database-init.sql" ]]; then
        cp "$SCRIPT_DIR/database-init.sql" "$APP_DIR/backend/"
    fi
fi

# Set proper ownership
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR"

# Load MySQL credentials if available
if [[ -f /root/.mysql_credentials ]]; then
    source /root/.mysql_credentials
    log "MySQL credentials loaded"
else
    error "MySQL credentials not found. Run main deployment script first."
fi

# Configure environment files
log "Configuring environment files..."

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
CORS_ORIGINS=https://$LOCAL_IP,https://ult-fpeb.local,https://localhost

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

# Install application dependencies
log "Installing application dependencies..."
cd "$APP_DIR"

# Create basic package.json if it doesn't exist
if [[ ! -f "package.json" ]]; then
    log "Creating basic package.json..."
    cat > package.json << 'EOF'
{
  "name": "ult-fpeb-visitor-management",
  "version": "1.0.4",
  "description": "ULT FPEB Visitor Management System",
  "type": "module",
  "private": true,
  "workspaces": [
    "frontend",
    "backend"
  ],
  "scripts": {
    "dev": "concurrently --kill-others-on-fail \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:frontend": "npm run dev --workspace=frontend",
    "dev:backend": "npm run dev --workspace=backend",
    "start": "concurrently \"npm run start:backend\" \"npm run start:frontend\"",
    "start:frontend": "npm run start --workspace=frontend",
    "start:backend": "npm run start --workspace=backend",
    "build": "npm run build --workspace=frontend",
    "setup-db": "npm run setup-db --workspace=backend"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
EOF
fi

# Install as deploy user
sudo -u "$DEPLOY_USER" npm install || log "Warning: npm install failed, continuing..."

# Initialize database
log "Initializing database..."
if [[ -f "$APP_DIR/backend/database-init.sql" ]] || [[ -f "$SCRIPT_DIR/database-init.sql" ]]; then
    # Use database-init.sql if available
    if [[ -f "$APP_DIR/backend/database-init.sql" ]]; then
        mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" < "$APP_DIR/backend/database-init.sql"
    elif [[ -f "$SCRIPT_DIR/database-init.sql" ]]; then
        mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" < "$SCRIPT_DIR/database-init.sql"
    fi
    log "Database initialized from SQL file"
else
    log "Warning: Database initialization file not found"
fi

# Configure Nginx
log "Configuring Nginx..."
cat > /etc/nginx/sites-available/ult-fpeb << EOF
server {
    listen 80;
    server_name $LOCAL_IP ult-fpeb.local localhost;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $LOCAL_IP ult-fpeb.local localhost;
    
    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/server.crt;
    ssl_certificate_key /etc/nginx/ssl/server.key;
    ssl_protocols TLSv1.2 TLSv1.3;
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
nginx -t && systemctl reload nginx

# Configure PM2
log "Configuring PM2..."
cat > "$APP_DIR/ecosystem.config.js" << EOF
module.exports = {
  apps: [{
    name: 'ult-fpeb-backend',
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

# Create a basic backend index.js if it doesn't exist
if [[ ! -f "$APP_DIR/backend/src/index.js" ]]; then
    log "Creating basic backend server..."
    mkdir -p "$APP_DIR/backend/src"
    cat > "$APP_DIR/backend/src/index.js" << 'EOF'
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Basic route
app.get('/api', (req, res) => {
  res.json({ 
    message: 'ULT FPEB Visitor Management API',
    version: '1.0.4'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
EOF

    # Create basic package.json for backend
    cat > "$APP_DIR/backend/package.json" << 'EOF'
{
  "name": "ult-fpeb-backend",
  "version": "1.0.4",
  "type": "module",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "node src/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5"
  }
}
EOF

    # Install backend dependencies
    cd "$APP_DIR/backend"
    sudo -u "$DEPLOY_USER" npm install
    cd "$APP_DIR"
fi

# Create basic frontend if it doesn't exist
if [[ ! -f "$APP_DIR/frontend/dist/index.html" ]]; then
    log "Creating basic frontend..."
    mkdir -p "$APP_DIR/frontend/dist"
    cat > "$APP_DIR/frontend/dist/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ULT FPEB Visitor Management</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            text-align: center;
            padding: 2rem;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            backdrop-filter: blur(10px);
        }
        .logo {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
        .status {
            font-size: 1.2rem;
            margin: 1rem 0;
        }
        .info {
            margin-top: 2rem;
            font-size: 0.9rem;
            opacity: 0.8;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🏢</div>
        <h1>ULT FPEB Visitor Management</h1>
        <p class="status">System is being deployed...</p>
        <p class="info">
            The full application will be available shortly.<br>
            Please check back in a few minutes.
        </p>
    </div>
</body>
</html>
EOF
fi

# Start PM2 as deploy user
log "Starting backend service with PM2..."
sudo -u "$DEPLOY_USER" bash -c "cd $APP_DIR && pm2 start ecosystem.config.js"
sudo -u "$DEPLOY_USER" pm2 save

# Generate startup script
sudo -u "$DEPLOY_USER" pm2 startup systemd -u "$DEPLOY_USER" --hp "/home/$DEPLOY_USER" || log "PM2 startup script creation failed"

# Copy service manager script
if [[ -f "$SCRIPT_DIR/service-manager.sh" ]]; then
    cp "$SCRIPT_DIR/service-manager.sh" /usr/local/bin/ult-service
    chmod +x /usr/local/bin/ult-service
fi

log "=== DEPLOYMENT CONTINUATION COMPLETED ==="
log "Application URL: https://$LOCAL_IP"
log "Health check: curl -k https://$LOCAL_IP/health"
log "API check: curl -k https://$LOCAL_IP/api/health"
log ""
log "Next steps:"
log "1. Add '$LOCAL_IP ult-fpeb.local' to your /etc/hosts file"
log "2. Visit https://$LOCAL_IP in your browser"
log "3. The full application will be available after complete deployment"
EOF