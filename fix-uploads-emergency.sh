#!/bin/bash

# =======================================================
# EMERGENCY UPLOADS FIX SCRIPT
# Fix critical upload files 404 error - PRODUCTION
# =======================================================

echo "🚨 Emergency Upload Files Fix"
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

print_status "🚨 Starting emergency upload files fix..."

# Step 1: Find the actual uploads directory
print_status "Step 1: Finding uploads directory..."
POSSIBLE_DIRS=(
    "/opt/ult-fpeb/backend/uploads"
    "/opt/ult-fpeb/uploads"
    "/var/www/ult-fpeb/backend/uploads"
    "/var/www/ult-fpeb/uploads"
    "/home/ubuntu/ult-fpeb/backend/uploads"
    "/home/ubuntu/ult-fpeb/uploads"
    "/root/ult-fpeb/backend/uploads"
)

ACTUAL_UPLOAD_PATH=""
for dir in "${POSSIBLE_DIRS[@]}"; do
    if [[ -d "$dir" ]]; then
        print_success "Found uploads directory: $dir"
        ACTUAL_UPLOAD_PATH="$dir"
        break
    fi
done

# If not found, search the entire system
if [[ -z "$ACTUAL_UPLOAD_PATH" ]]; then
    print_status "Searching entire system for uploads directory..."
    ACTUAL_UPLOAD_PATH=$(find /opt /var/www /home -name "uploads" -type d 2>/dev/null | grep -E "(ult|fpeb)" | head -1)
    
    if [[ -n "$ACTUAL_UPLOAD_PATH" ]]; then
        print_success "Found uploads directory: $ACTUAL_UPLOAD_PATH"
    else
        print_error "No uploads directory found! Creating one..."
        ACTUAL_UPLOAD_PATH="/opt/ult-fpeb/uploads"
        mkdir -p "$ACTUAL_UPLOAD_PATH"
    fi
fi

# Step 2: Fix directory structure and permissions
print_status "Step 2: Fixing directory structure and permissions..."

# Create all necessary subdirectories
mkdir -p "$ACTUAL_UPLOAD_PATH"/{photos,signatures,profiles,complaints,lost-items,reports,document_requests,return_photos}
mkdir -p "$ACTUAL_UPLOAD_PATH"/lost-items/{handover,return}/{photos,signatures}

# Set proper ownership and permissions
chown -R www-data:www-data "$ACTUAL_UPLOAD_PATH"
chmod -R 755 "$ACTUAL_UPLOAD_PATH"
find "$ACTUAL_UPLOAD_PATH" -type f -exec chmod 644 {} \;

print_success "Directory structure and permissions fixed"

# Step 3: Create symbolic links to ensure accessibility
print_status "Step 3: Creating symbolic links for better accessibility..."

# Create link in /var/www/html if it exists
if [[ -d "/var/www/html" ]]; then
    ln -sf "$ACTUAL_UPLOAD_PATH" /var/www/html/uploads
    print_success "Created symbolic link: /var/www/html/uploads -> $ACTUAL_UPLOAD_PATH"
fi

# Create link in nginx default document root
if [[ -d "/usr/share/nginx/html" ]]; then
    ln -sf "$ACTUAL_UPLOAD_PATH" /usr/share/nginx/html/uploads
    print_success "Created symbolic link: /usr/share/nginx/html/uploads -> $ACTUAL_UPLOAD_PATH"
fi

# Step 4: Fix Nginx configuration aggressively
print_status "Step 4: Fixing Nginx configuration..."

# Find Nginx config file
NGINX_CONFIG=""
POSSIBLE_CONFIGS=(
    "/etc/nginx/sites-available/ult-fpeb"
    "/etc/nginx/sites-available/default"
    "/etc/nginx/conf.d/ult-fpeb.conf"
    "/etc/nginx/conf.d/default.conf"
)

for config in "${POSSIBLE_CONFIGS[@]}"; do
    if [[ -f "$config" ]]; then
        NGINX_CONFIG="$config"
        print_success "Using Nginx config: $config"
        break
    fi
done

if [[ -n "$NGINX_CONFIG" ]]; then
    # Backup original config
    cp "$NGINX_CONFIG" "$NGINX_CONFIG.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Remove existing uploads location if present
    sed -i '/# Static file serving for uploads/,/^[[:space:]]*}/d' "$NGINX_CONFIG"
    sed -i '/location \/uploads\//,/^[[:space:]]*}/d' "$NGINX_CONFIG"
    
    # Add comprehensive uploads location block
    # Find the server block and add before the closing brace
    sed -i '/^[[:space:]]*server[[:space:]]*{/,/^[[:space:]]*}[[:space:]]*$/ {
        /^[[:space:]]*}[[:space:]]*$/ i\
\
    # Static file serving for uploads - EMERGENCY FIX\
    location /uploads/ {\
        alias '"$ACTUAL_UPLOAD_PATH"'/;\
        expires 30d;\
        add_header Cache-Control "public, no-transform";\
        add_header Access-Control-Allow-Origin "*";\
        add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS";\
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept";\
        \
        # Handle missing files gracefully\
        try_files $uri $uri/ @fallback;\
        \
        # Security headers\
        add_header X-Content-Type-Options nosniff;\
        add_header X-Frame-Options DENY;\
        \
        # Allow common file formats\
        location ~* \.(jpg|jpeg|png|gif|ico|svg|webp|docx|pdf)$ {\
            expires 1y;\
            add_header Cache-Control "public, immutable";\
        }\
    }\
    \
    # Fallback for missing files\
    location @fallback {\
        return 404;\
    }
    }' "$NGINX_CONFIG"
    
    print_success "Nginx configuration updated with comprehensive uploads block"
else
    print_warning "No Nginx config found. Creating basic config..."
    
    # Create basic nginx config for uploads
    cat > /etc/nginx/conf.d/ult-fpeb-uploads.conf << EOF
# ULT FPEB Uploads Configuration - EMERGENCY FIX
server {
    listen 80;
    listen 443 ssl http2;
    server_name 10.15.0.120;

    # Static file serving for uploads
    location /uploads/ {
        alias $ACTUAL_UPLOAD_PATH/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
        add_header Access-Control-Allow-Origin "*";
        add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS";
        
        # Handle missing files gracefully
        try_files \$uri \$uri/ =404;
        
        # Allow common file formats
        location ~* \.(jpg|jpeg|png|gif|ico|svg|webp|docx|pdf)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
EOF
    print_success "Created dedicated uploads Nginx config"
fi

# Step 5: Test and reload Nginx
print_status "Step 5: Testing and reloading Nginx..."
if nginx -t; then
    print_success "Nginx configuration test passed"
    systemctl reload nginx
    print_success "Nginx reloaded successfully"
else
    print_error "Nginx configuration test failed!"
    print_status "Attempting to restore backup..."
    if [[ -f "$NGINX_CONFIG.backup."* ]]; then
        cp "$NGINX_CONFIG".backup.* "$NGINX_CONFIG"
        nginx -t && systemctl reload nginx
    fi
fi

# Step 6: Create test file and verify access
print_status "Step 6: Creating test file and verifying access..."
TEST_FILE="$ACTUAL_UPLOAD_PATH/photos/test-emergency-fix.txt"
echo "Emergency fix test file created at $(date)" > "$TEST_FILE"
chmod 644 "$TEST_FILE"

# Test HTTP access
sleep 2
print_status "Testing HTTP access to uploads..."

TEST_URLS=(
    "http://localhost/uploads/photos/test-emergency-fix.txt"
    "https://10.15.0.120/uploads/photos/test-emergency-fix.txt" 
    "http://10.15.0.120/uploads/photos/test-emergency-fix.txt"
)

SUCCESS_COUNT=0
for url in "${TEST_URLS[@]}"; do
    if curl -s -f "$url" > /dev/null 2>&1; then
        print_success "✅ Accessible: $url"
        ((SUCCESS_COUNT++))
    else
        print_error "❌ Not accessible: $url"
    fi
done

# Clean up test file
rm -f "$TEST_FILE"

# Step 7: Test specific problematic file
print_status "Step 7: Testing specific problematic files..."
PROBLEM_FILES=(
    "1754543894378_photo_Rena_Yuliana.png"
    "1754541464887_photo_Agus.png"
)

for file in "${PROBLEM_FILES[@]}"; do
    file_path="$ACTUAL_UPLOAD_PATH/photos/$file"
    if [[ -f "$file_path" ]]; then
        print_success "Found: $file"
        
        # Test web access
        url="https://10.15.0.120/uploads/photos/$file"
        if curl -s -f -I "$url" > /dev/null 2>&1; then
            print_success "✅ Web accessible: $file"
        else
            print_error "❌ Still not web accessible: $file"
            
            # Show file details
            ls -la "$file_path"
        fi
    else
        print_warning "Physical file missing: $file"
        
        # Search for it in other locations
        find "$ACTUAL_UPLOAD_PATH" -name "$file" -type f 2>/dev/null || \
        print_status "File not found anywhere in uploads directory"
    fi
done

# Step 8: Restart PM2 application
print_status "Step 8: Restarting Node.js application..."
if command -v pm2 &> /dev/null; then
    PM2_PROCESS=$(pm2 list 2>/dev/null | grep -E "(ult|fpeb|backend)" | head -1 | awk '{print $2}' | tr -d '│' | xargs)
    
    if [[ -n "$PM2_PROCESS" ]]; then
        print_status "Restarting PM2 process: $PM2_PROCESS"
        pm2 restart "$PM2_PROCESS"
        sleep 3
        print_success "PM2 process restarted"
    else
        pm2 restart all
        print_success "All PM2 processes restarted"
    fi
else
    print_warning "PM2 not found - manual application restart may be needed"
fi

# Final verification
print_status "Step 9: Final verification..."
echo ""
print_status "📊 EMERGENCY FIX RESULTS:"
echo "========================="
echo "📁 Uploads directory: $ACTUAL_UPLOAD_PATH"
echo "🔧 Nginx config updated: $(test -n "$NGINX_CONFIG" && echo "Yes" || echo "No")"
echo "🌐 HTTP tests passed: $SUCCESS_COUNT/3"
echo "🔄 Services restarted: Yes"

# Show current file count
if [[ -d "$ACTUAL_UPLOAD_PATH/photos" ]]; then
    PHOTO_COUNT=$(find "$ACTUAL_UPLOAD_PATH/photos" -type f | wc -l)
    echo "📷 Photos in directory: $PHOTO_COUNT files"
    
    # Show recent photos
    echo ""
    print_status "📋 Recent photo files:"
    ls -lt "$ACTUAL_UPLOAD_PATH/photos" | head -5
fi

echo ""
print_status "🔧 TROUBLESHOOTING COMMANDS:"
echo "sudo nginx -t                    # Test nginx config"
echo "sudo systemctl status nginx     # Check nginx status"  
echo "pm2 logs --lines 50             # Check application logs"
echo "ls -la $ACTUAL_UPLOAD_PATH/photos # Check files"
echo "curl -I https://10.15.0.120/uploads/photos/test.png  # Test access"

if [[ $SUCCESS_COUNT -gt 0 ]]; then
    print_success "🎉 EMERGENCY FIX COMPLETED - Some files should now be accessible!"
else
    print_error "⚠️ EMERGENCY FIX COMPLETED BUT ISSUES REMAIN"
    print_status "Additional steps may be needed:"
    print_status "1. Check if files physically exist in the uploads directory"
    print_status "2. Verify Nginx is serving the correct document root"  
    print_status "3. Check if there are multiple Nginx configs conflicting"
    print_status "4. Verify Node.js app is serving static files correctly"
fi

echo ""
print_success "Emergency fix script completed! 🚨"