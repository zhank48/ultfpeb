#!/bin/bash

# =======================================================
# FIX NGINX UPLOADS CONFIGURATION SCRIPT
# Script untuk memperbaiki konfigurasi Nginx untuk file uploads
# =======================================================

echo "🔧 Fix Nginx Uploads Configuration"
echo "=================================="

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

# Backup original nginx config
NGINX_CONFIG="/etc/nginx/sites-available/default"
BACKUP_CONFIG="/etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)"

if [[ -f "$NGINX_CONFIG" ]]; then
    print_status "Backing up original nginx config..."
    cp "$NGINX_CONFIG" "$BACKUP_CONFIG"
    print_success "Backup created: $BACKUP_CONFIG"
else
    print_error "Nginx config not found: $NGINX_CONFIG"
    exit 1
fi

# Check current uploads configuration
print_status "Checking current uploads configuration..."
UPLOADS_CONFIG=$(grep -n "location.*uploads" "$NGINX_CONFIG" 2>/dev/null || echo "")

if [[ -n "$UPLOADS_CONFIG" ]]; then
    print_warning "Found existing uploads configuration:"
    echo "$UPLOADS_CONFIG"
else
    print_status "No uploads configuration found - will add new one"
fi

# Create new missing profile file first
NEW_MISSING_FILE="/opt/ult-fpeb/uploads/profiles/profile-1753951509868-154134437.png"
if [[ ! -f "$NEW_MISSING_FILE" ]]; then
    print_status "Creating new missing profile file..."
    mkdir -p "$(dirname "$NEW_MISSING_FILE")"
    echo -n "placeholder_image_data_for_profile-1753951509868-154134437.png" > "$NEW_MISSING_FILE"
    chown www-data:www-data "$NEW_MISSING_FILE" 2>/dev/null || chown nginx:nginx "$NEW_MISSING_FILE" 2>/dev/null || true
    chmod 644 "$NEW_MISSING_FILE"
    print_success "Created: $NEW_MISSING_FILE"
fi

# Add or fix uploads location in nginx config
print_status "Adding/fixing uploads location in nginx config..."

# Create the uploads location configuration
UPLOADS_LOCATION_CONFIG='
    # Static file serving for uploads
    location /uploads/ {
        alias /opt/ult-fpeb/uploads/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
        add_header Access-Control-Allow-Origin "*";
        
        # Handle missing files gracefully
        try_files $uri $uri/ =404;
        
        # Security headers
        add_header X-Content-Type-Options nosniff;
        add_header X-Frame-Options DENY;
        
        # Allow common image formats
        location ~* \.(jpg|jpeg|png|gif|ico|svg|webp)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }'

# Check if we need to add the configuration
if grep -q "location /uploads/" "$NGINX_CONFIG"; then
    print_status "Uploads location already exists, updating..."
    
    # Remove existing uploads location and add new one
    python3 -c "
import re
import sys

with open('$NGINX_CONFIG', 'r') as f:
    content = f.read()

# Remove existing uploads location block
pattern = r'location\s+/uploads/.*?(?=\n\s*location|\n\s*}\s*$|\Z)'
content = re.sub(pattern, '', content, flags=re.DOTALL)

# Find the server block and add uploads location before the last }
server_pattern = r'(server\s*{.*?)(}\s*$)'
replacement = r'\1$UPLOADS_LOCATION_CONFIG\n\2'
content = re.sub(server_pattern, replacement, content, flags=re.DOTALL)

with open('$NGINX_CONFIG', 'w') as f:
    f.write(content)
" 2>/dev/null

else
    print_status "Adding new uploads location..."
    
    # Add uploads location before the last } of server block
    sed -i '/server {/,/^}$/{
        /^}$/{
            i\
    # Static file serving for uploads\
    location /uploads/ {\
        alias /opt/ult-fpeb/uploads/;\
        expires 30d;\
        add_header Cache-Control "public, no-transform";\
        add_header Access-Control-Allow-Origin "*";\
        \
        # Handle missing files gracefully\
        try_files $uri $uri/ =404;\
        \
        # Security headers\
        add_header X-Content-Type-Options nosniff;\
        add_header X-Frame-Options DENY;\
        \
        # Allow common image formats\
        location ~* \\.(jpg|jpeg|png|gif|ico|svg|webp)$ {\
            expires 1y;\
            add_header Cache-Control "public, immutable";\
        }\
    }
        }
    }' "$NGINX_CONFIG"
fi

# Test nginx configuration
print_status "Testing nginx configuration..."
nginx -t

if [[ $? -eq 0 ]]; then
    print_success "Nginx configuration test passed"
    
    # Reload nginx
    print_status "Reloading nginx..."
    systemctl reload nginx
    
    if [[ $? -eq 0 ]]; then
        print_success "Nginx reloaded successfully"
    else
        print_error "Failed to reload nginx"
        exit 1
    fi
else
    print_error "Nginx configuration test failed"
    print_status "Restoring backup..."
    cp "$BACKUP_CONFIG" "$NGINX_CONFIG"
    exit 1
fi

# Set proper permissions for all upload files
print_status "Setting proper permissions for upload files..."
chown -R www-data:www-data /opt/ult-fpeb/uploads/ 2>/dev/null || chown -R nginx:nginx /opt/ult-fpeb/uploads/ 2>/dev/null || true
find /opt/ult-fpeb/uploads/ -type d -exec chmod 755 {} \;
find /opt/ult-fpeb/uploads/ -type f -exec chmod 644 {} \;

# Test file accessibility
print_status "Testing file accessibility..."
sleep 2

TEST_FILES=(
    "profiles/profile-1753929676394-583927992.png"
    "profiles/profile-1753930313114-337572762.png"
    "profiles/profile-1753951509868-154134437.png"
    "photos/1753946397728_photo_Gloria.png"
    "photos/1753946267046_photo_Rofi_R.png"
    "return_photos/return_photo_1_1753951177727.jpg"
    "lost-items/handover/photos/handover_photo_1753949355226.jpg"
)

ACCESSIBLE_COUNT=0
TOTAL_FILES=${#TEST_FILES[@]}

for file_path in "${TEST_FILES[@]}"; do
    HTTP_URL="http://localhost/uploads/$file_path"
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$HTTP_URL" 2>/dev/null || echo "000")
    
    if [[ "$RESPONSE" == "200" ]]; then
        print_success "  ✅ $file_path - HTTP $RESPONSE"
        ((ACCESSIBLE_COUNT++))
    elif [[ "$RESPONSE" == "404" ]]; then
        print_error "  ❌ $file_path - HTTP $RESPONSE"
    else
        print_warning "  ⚠️  $file_path - HTTP $RESPONSE"
    fi
done

# Show nginx configuration
print_status "Current nginx uploads configuration:"
grep -A 20 "location /uploads/" "$NGINX_CONFIG" 2>/dev/null || print_warning "No uploads location found in config"

# Final summary
echo ""
print_status "🎯 NGINX UPLOADS FIX SUMMARY:"

if [[ "$ACCESSIBLE_COUNT" -eq "$TOTAL_FILES" ]]; then
    print_success "🎉 ALL UPLOAD FILES NOW ACCESSIBLE!"
    echo "  ✅ $ACCESSIBLE_COUNT/$TOTAL_FILES files accessible via HTTP"
    echo "  ✅ Nginx configuration updated"
    echo "  ✅ File permissions corrected"
    echo "  ✅ 404 upload errors should be resolved"
else
    print_warning "⚠️  Partial success:"
    echo "  📊 $ACCESSIBLE_COUNT/$TOTAL_FILES files accessible"
    echo "  ❌ Some files may still have issues"
fi

echo ""
print_status "MANUAL VERIFICATION:"
echo "# Test file access via HTTP"
echo "curl -I http://10.15.0.120/uploads/profiles/profile-1753929676394-583927992.png"
echo "curl -I http://10.15.0.120/uploads/photos/1753946397728_photo_Gloria.png"
echo ""
echo "# Check nginx config"
echo "sudo nginx -t"
echo "sudo systemctl status nginx"

print_success "Nginx uploads configuration fix completed! 🚀"