#!/bin/bash

# =======================================================
# NGINX CONFIG FIX SCRIPT
# Fix syntax errors in ult-fpeb nginx configuration
# =======================================================

echo "🔧 Fixing Nginx Configuration"
echo "============================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root (sudo)"
   exit 1
fi

print_status "Fixing Nginx configuration syntax errors..."

# Backup current config
NGINX_CONFIG="/etc/nginx/sites-available/ult-fpeb"
BACKUP_CONFIG="/etc/nginx/sites-available/ult-fpeb.backup.$(date +%Y%m%d_%H%M%S)"

if [[ -f "$NGINX_CONFIG" ]]; then
    cp "$NGINX_CONFIG" "$BACKUP_CONFIG"
    print_success "Backup created: $BACKUP_CONFIG"
else
    print_error "Nginx config not found: $NGINX_CONFIG"
    exit 1
fi

# Write corrected configuration
cat > "$NGINX_CONFIG" << 'EOF'
# ULT FPEB Visitor Management - Nginx Configuration
server {
    listen 80;
    server_name 10.15.0.120 ult-fpeb.local localhost;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name 10.15.0.120 ult-fpeb.local localhost;

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
    root /opt/ult-fpeb/frontend/dist;
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
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    # Static file serving for uploads - EMERGENCY FIX
    location /uploads/ {
        alias /opt/ult-fpeb/backend/uploads/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
        add_header Access-Control-Allow-Origin "*";
        add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS";
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept";

        # Handle missing files gracefully
        try_files $uri $uri/ @fallback;

        # Security headers
        add_header X-Content-Type-Options nosniff;
        add_header X-Frame-Options DENY;

        # Allow common file formats
        location ~* \.(jpg|jpeg|png|gif|ico|svg|webp|docx|pdf)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Fallback for missing files
    location @fallback {
        return 404;
    }

    # Static file serving with caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Handle React Router (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # Deny access to sensitive files
    location ~ /\.ht {
        deny all;
    }

    location ~ /\.(env|git) {
        deny all;
    }
}
EOF

print_success "Nginx configuration has been fixed"

# Test configuration
print_status "Testing Nginx configuration..."
if nginx -t; then
    print_success "✅ Nginx configuration is valid!"
    
    # Reload nginx
    print_status "Reloading Nginx..."
    systemctl reload nginx
    
    if [[ $? -eq 0 ]]; then
        print_success "✅ Nginx reloaded successfully!"
    else
        print_error "❌ Failed to reload Nginx"
        exit 1
    fi
else
    print_error "❌ Nginx configuration still has errors!"
    print_status "Restoring backup..."
    cp "$BACKUP_CONFIG" "$NGINX_CONFIG"
    exit 1
fi

# Test SSL certificates
print_status "Checking SSL certificates..."
if [[ -f "/etc/nginx/ssl/server.crt" ]] && [[ -f "/etc/nginx/ssl/server.key" ]]; then
    print_success "✅ SSL certificates found"
else
    print_warning "⚠️ SSL certificates missing - HTTPS will not work"
    print_status "Creating self-signed certificate for testing..."
    
    mkdir -p /etc/nginx/ssl
    
    # Create self-signed certificate
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/server.key \
        -out /etc/nginx/ssl/server.crt \
        -subj "/C=ID/ST=WestJava/L=Bandung/O=ULT/OU=FPEB/CN=10.15.0.120"
    
    if [[ $? -eq 0 ]]; then
        print_success "✅ Self-signed SSL certificate created"
        
        # Reload nginx again
        systemctl reload nginx
    else
        print_error "❌ Failed to create SSL certificate"
    fi
fi

echo ""
print_status "🧪 Testing file access..."

# Test HTTP access
HTTP_TEST=$(curl -s -o /dev/null -w "%{http_code}" "http://10.15.0.120/uploads/photos/1754543894378_photo_Rena_Yuliana.png" 2>/dev/null)
if [[ "$HTTP_TEST" == "301" ]]; then
    print_success "✅ HTTP redirect working (301 -> HTTPS)"
elif [[ "$HTTP_TEST" == "200" ]]; then
    print_success "✅ HTTP access working (200)"
else
    print_warning "⚠️ HTTP test returned: $HTTP_TEST"
fi

# Test HTTPS access
HTTPS_TEST=$(curl -s -k -o /dev/null -w "%{http_code}" "https://10.15.0.120/uploads/photos/1754543894378_photo_Rena_Yuliana.png" 2>/dev/null)
if [[ "$HTTPS_TEST" == "200" ]]; then
    print_success "✅ HTTPS access working (200)"
else
    print_warning "⚠️ HTTPS test returned: $HTTPS_TEST"
fi

echo ""
print_status "📊 FIX RESULTS:"
echo "================================="
echo "🔧 Nginx config: Fixed"
echo "🔄 Nginx status: Reloaded"  
echo "📜 SSL certs: $(test -f /etc/nginx/ssl/server.crt && echo "Present" || echo "Created")"
echo "🌐 HTTP access: $HTTP_TEST"
echo "🔒 HTTPS access: $HTTPS_TEST"

echo ""
if [[ "$HTTPS_TEST" == "200" ]]; then
    print_success "🎉 ALL FIXED! Upload files should now be accessible via HTTPS!"
    print_status "Test in browser: https://10.15.0.120/uploads/photos/1754543894378_photo_Rena_Yuliana.png"
else
    print_warning "⚠️ HTTPS still not working. Check SSL certificate and frontend configuration."
    print_status "But HTTP should work: http://10.15.0.120/uploads/photos/1754543894378_photo_Rena_Yuliana.png"
fi

print_success "Nginx configuration fix completed! 🔧"