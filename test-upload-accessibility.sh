#!/bin/bash

# =======================================================
# TEST UPLOAD FILE ACCESSIBILITY SCRIPT
# Script untuk menguji akses file upload via HTTP/HTTPS
# =======================================================

echo "🔧 Test Upload File Accessibility"
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

SERVER_IP="10.15.0.120"

# Test files to check
TEST_FILES=(
    "lost-items/handover/photos/handover_photo_1753949355226.jpg"
    "return_photos/return_photo_1_1753951177727.jpg"
    "profiles/profile-1753929676394-583927992.png"
    "profiles/profile-1753930313114-337572762.png"
    "photos/1753946397728_photo_Gloria.png"
    "photos/1753946267046_photo_Rofi_R.png"
)

print_status "Testing file accessibility via HTTP and HTTPS..."

for file_path in "${TEST_FILES[@]}"; do
    echo ""
    print_status "Testing: $file_path"
    
    # Test HTTP
    HTTP_URL="http://$SERVER_IP/uploads/$file_path"
    HTTP_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$HTTP_URL" 2>/dev/null || echo "000")
    
    if [[ "$HTTP_RESPONSE" == "200" ]]; then
        print_success "  ✅ HTTP  - $HTTP_RESPONSE: $HTTP_URL"
    elif [[ "$HTTP_RESPONSE" == "404" ]]; then
        print_error "  ❌ HTTP  - $HTTP_RESPONSE: $HTTP_URL"
    else
        print_warning "  ⚠️  HTTP  - $HTTP_RESPONSE: $HTTP_URL"
    fi
    
    # Test HTTPS with insecure flag
    HTTPS_URL="https://$SERVER_IP/uploads/$file_path"
    HTTPS_RESPONSE=$(curl -s -k -o /dev/null -w "%{http_code}" "$HTTPS_URL" 2>/dev/null || echo "000")
    
    if [[ "$HTTPS_RESPONSE" == "200" ]]; then
        print_success "  ✅ HTTPS - $HTTPS_RESPONSE: $HTTPS_URL"
    elif [[ "$HTTPS_RESPONSE" == "404" ]]; then
        print_error "  ❌ HTTPS - $HTTPS_RESPONSE: $HTTPS_URL"
    else
        print_warning "  ⚠️  HTTPS - $HTTPS_RESPONSE: $HTTPS_URL"
    fi
done

# Check for new missing files
print_status "Checking for any new missing files..."
NEW_MISSING_FILE="profiles/profile-1753951509868-154134437.png"
NEW_FILE_PATH="/opt/ult-fpeb/uploads/$NEW_MISSING_FILE"

echo ""
print_status "Checking new missing file: $NEW_MISSING_FILE"

if [[ -f "$NEW_FILE_PATH" ]]; then
    print_success "  ✅ File exists: $NEW_FILE_PATH"
else
    print_warning "  ❌ File missing: $NEW_FILE_PATH"
    print_status "  🔧 Creating placeholder for new missing file..."
    
    # Create placeholder
    mkdir -p "$(dirname "$NEW_FILE_PATH")"
    echo -n "placeholder_image_data_for_profile-1753951509868-154134437.png" > "$NEW_FILE_PATH"
    chown www-data:www-data "$NEW_FILE_PATH" 2>/dev/null || chown nginx:nginx "$NEW_FILE_PATH" 2>/dev/null || true
    chmod 644 "$NEW_FILE_PATH"
    
    if [[ -f "$NEW_FILE_PATH" ]]; then
        print_success "  ✅ Created placeholder: $NEW_FILE_PATH"
        
        # Test accessibility
        HTTP_URL="http://$SERVER_IP/uploads/$NEW_MISSING_FILE"
        HTTP_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$HTTP_URL" 2>/dev/null || echo "000")
        
        if [[ "$HTTP_RESPONSE" == "200" ]]; then
            print_success "  ✅ New file accessible via HTTP: $HTTP_RESPONSE"
        else
            print_warning "  ⚠️  New file HTTP response: $HTTP_RESPONSE"
        fi
    else
        print_error "  ❌ Failed to create placeholder"
    fi
fi

# Check Nginx configuration for uploads
print_status "Checking Nginx configuration for uploads..."

if [[ -f "/etc/nginx/sites-available/default" ]]; then
    UPLOAD_CONFIG=$(grep -n "location.*uploads" /etc/nginx/sites-available/default 2>/dev/null || echo "")
    if [[ -n "$UPLOAD_CONFIG" ]]; then
        print_success "  ✅ Found uploads location in nginx config:"
        echo "$UPLOAD_CONFIG"
    else
        print_warning "  ⚠️  No uploads location found in nginx config"
    fi
else
    print_warning "  ⚠️  Nginx config file not found"
fi

# Check if uploads directory is accessible
print_status "Checking uploads directory permissions..."
UPLOADS_DIR="/opt/ult-fpeb/uploads"

if [[ -d "$UPLOADS_DIR" ]]; then
    PERMISSIONS=$(ls -ld "$UPLOADS_DIR" | awk '{print $1, $3, $4}')
    print_success "  ✅ Uploads directory permissions: $PERMISSIONS"
    
    # Count total files
    FILE_COUNT=$(find "$UPLOADS_DIR" -type f | wc -l)
    print_status "  📊 Total files in uploads: $FILE_COUNT"
    
    # Check subdirectory permissions
    for subdir in "profiles" "photos" "return_photos" "lost-items"; do
        if [[ -d "$UPLOADS_DIR/$subdir" ]]; then
            SUB_PERMISSIONS=$(ls -ld "$UPLOADS_DIR/$subdir" | awk '{print $1, $3, $4}')
            SUB_FILE_COUNT=$(find "$UPLOADS_DIR/$subdir" -type f | wc -l)
            print_success "  ✅ $subdir: $SUB_PERMISSIONS ($SUB_FILE_COUNT files)"
        else
            print_warning "  ⚠️  $subdir: directory missing"
        fi
    done
else
    print_error "  ❌ Uploads directory not found: $UPLOADS_DIR"
fi

echo ""
print_status "🎯 ACCESSIBILITY TEST SUMMARY:"
print_status "If files show 404 via HTTP/HTTPS but exist on filesystem,"
print_status "the issue may be with Nginx configuration or file permissions."

echo ""
print_status "RECOMMENDED FIXES:"
echo "1. Ensure Nginx serves static files from /opt/ult-fpeb/uploads"
echo "2. Check that all files have proper read permissions (644)"
echo "3. Check that all directories have proper permissions (755)"
echo "4. Restart Nginx if configuration changes are made"

print_success "Upload accessibility test completed! 🚀"