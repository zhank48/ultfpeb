#!/bin/bash

# =======================================================
# PRODUCTION UPLOADS DIAGNOSTIC SCRIPT
# Diagnose dan fix masalah upload files 404 error
# =======================================================

echo "🔍 Production Uploads Diagnostic Tool"
echo "===================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[✅]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[⚠️]${NC} $1"; }
print_error() { echo -e "${RED}[❌]${NC} $1"; }
print_debug() { echo -e "${PURPLE}[DEBUG]${NC} $1"; }

# Function to test file access
test_file_access() {
    local file_path="$1"
    local url="$2"
    
    echo ""
    print_debug "Testing file: $(basename "$file_path")"
    
    # Check if file exists physically
    if [[ -f "$file_path" ]]; then
        print_success "Physical file exists: $file_path"
        
        # Check file permissions
        local perms=$(stat -c "%a" "$file_path" 2>/dev/null)
        local owner=$(stat -c "%U:%G" "$file_path" 2>/dev/null)
        print_status "Permissions: $perms | Owner: $owner"
        
        # Check file size
        local size=$(stat -c "%s" "$file_path" 2>/dev/null)
        print_status "File size: $size bytes"
        
    else
        print_error "Physical file missing: $file_path"
    fi
    
    # Test HTTP access
    print_status "Testing HTTP access: $url"
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    
    if [[ "$http_code" == "200" ]]; then
        print_success "HTTP 200 - File accessible via web"
    else
        print_error "HTTP $http_code - File not accessible via web"
        
        # Test different URL variations
        print_debug "Testing URL variations..."
        local base_url="https://10.15.0.120"
        local filename=$(basename "$file_path")
        local dir=$(dirname "$file_path" | sed 's/.*uploads/uploads/')
        
        local test_urls=(
            "$base_url/$dir/$filename"
            "$base_url/uploads/photos/$filename"
            "http://10.15.0.120/$dir/$filename"
            "http://10.15.0.120/uploads/photos/$filename"
        )
        
        for test_url in "${test_urls[@]}"; do
            local test_code=$(curl -s -o /dev/null -w "%{http_code}" "$test_url" 2>/dev/null)
            print_debug "  $test_url -> HTTP $test_code"
        done
    fi
}

# Start diagnostic
print_status "Starting comprehensive uploads diagnostic..."

# Step 1: Find possible uploads directories
print_status "Step 1: Searching for uploads directories..."
POSSIBLE_DIRS=(
    "/opt/ult-fpeb/backend/uploads"
    "/opt/ult-fpeb/uploads" 
    "/var/www/ult-fpeb/backend/uploads"
    "/var/www/ult-fpeb/uploads"
    "/home/ubuntu/ult-fpeb/backend/uploads"
    "/home/ubuntu/ult-fpeb/uploads"
    "/root/ult-fpeb/backend/uploads"
    "/usr/local/ult-fpeb/backend/uploads"
)

FOUND_DIRS=()
for dir in "${POSSIBLE_DIRS[@]}"; do
    if [[ -d "$dir" ]]; then
        print_success "Found uploads directory: $dir"
        FOUND_DIRS+=("$dir")
    fi
done

if [[ ${#FOUND_DIRS[@]} -eq 0 ]]; then
    print_error "No uploads directories found!"
    print_status "Searching entire system for 'uploads' directories..."
    find / -name "uploads" -type d 2>/dev/null | head -10
    exit 1
fi

# Step 2: Check for the specific problematic file
print_status "Step 2: Looking for problematic files..."
PROBLEM_FILES=(
    "1754543894378_photo_Rena_Yuliana.png"
    "1754541464887_photo_Agus.png"
    "1754540260444_photo_Dondik_Susanto.png"
    "1754536243617_photo_Topan.png"
)

for upload_dir in "${FOUND_DIRS[@]}"; do
    print_status "Checking directory: $upload_dir"
    
    for problem_file in "${PROBLEM_FILES[@]}"; do
        # Search for the file
        file_found=$(find "$upload_dir" -name "$problem_file" -type f 2>/dev/null | head -1)
        
        if [[ -n "$file_found" ]]; then
            print_success "Found: $file_found"
            
            # Test access to this file
            test_file_access "$file_found" "https://10.15.0.120/uploads/photos/$problem_file"
        else
            print_warning "Not found: $problem_file in $upload_dir"
            
            # Search in subdirectories
            find "$upload_dir" -name "*.png" -type f | grep -E "(175454|175454)" | head -3
        fi
    done
    
    # Show recent files in photos directory
    if [[ -d "$upload_dir/photos" ]]; then
        print_status "Recent files in $upload_dir/photos:"
        ls -la "$upload_dir/photos" | tail -5
    fi
done

# Step 3: Test Nginx configuration
print_status "Step 3: Checking Nginx configuration..."
NGINX_CONFIGS=(
    "/etc/nginx/sites-available/ult-fpeb"
    "/etc/nginx/sites-available/default"
    "/etc/nginx/conf.d/ult-fpeb.conf"
)

for config in "${NGINX_CONFIGS[@]}"; do
    if [[ -f "$config" ]]; then
        print_success "Found Nginx config: $config"
        
        # Check for uploads location
        if grep -q "location.*uploads" "$config"; then
            print_success "Has uploads location block"
            grep -A 5 "location.*uploads" "$config"
        else
            print_warning "No uploads location block found"
        fi
        
        # Check for alias or root
        if grep -q "alias.*uploads" "$config"; then
            local alias_path=$(grep "alias.*uploads" "$config" | awk '{print $2}' | tr -d ';')
            print_status "Nginx alias: $alias_path"
            
            if [[ -d "$alias_path" ]]; then
                print_success "Alias directory exists"
            else
                print_error "Alias directory missing: $alias_path"
            fi
        fi
    fi
done

# Step 4: Test Nginx
print_status "Step 4: Testing Nginx status..."
if command -v nginx &> /dev/null; then
    if nginx -t &> /dev/null; then
        print_success "Nginx configuration is valid"
    else
        print_error "Nginx configuration has errors:"
        nginx -t
    fi
    
    if systemctl is-active --quiet nginx; then
        print_success "Nginx is running"
    else
        print_error "Nginx is not running"
    fi
else
    print_warning "Nginx not found"
fi

# Step 5: Test PM2 and Node.js app
print_status "Step 5: Checking Node.js application..."
if command -v pm2 &> /dev/null; then
    print_status "PM2 processes:"
    pm2 list
    
    # Check if ULT app is running
    if pm2 list | grep -q -E "(ult|fpeb|backend)"; then
        print_success "ULT application is running in PM2"
    else
        print_warning "ULT application not found in PM2"
    fi
else
    print_warning "PM2 not found"
fi

# Step 6: Test direct file access
print_status "Step 6: Testing direct server file access..."
TEST_URLS=(
    "http://localhost:3000/uploads/photos/1754543894378_photo_Rena_Yuliana.png"
    "https://10.15.0.120/uploads/photos/1754543894378_photo_Rena_Yuliana.png"
    "http://10.15.0.120/uploads/photos/1754543894378_photo_Rena_Yuliana.png"
)

for test_url in "${TEST_URLS[@]}"; do
    local code=$(curl -s -o /dev/null -w "%{http_code}" "$test_url" 2>/dev/null)
    if [[ "$code" == "200" ]]; then
        print_success "✅ $test_url -> HTTP $code"
    else
        print_error "❌ $test_url -> HTTP $code"
    fi
done

# Step 7: Generate fix recommendations
echo ""
print_status "🔧 DIAGNOSTIC RESULTS & RECOMMENDATIONS:"
echo "======================================="

# Check what we found
if [[ ${#FOUND_DIRS[@]} -gt 0 ]]; then
    echo "📁 Uploads directories found: ${#FOUND_DIRS[@]}"
    for dir in "${FOUND_DIRS[@]}"; do
        echo "   • $dir"
    done
else
    print_error "❌ No uploads directories found - major issue!"
fi

echo ""
print_status "🚀 IMMEDIATE FIXES TO TRY:"

# Fix 1: Permission fix
echo "1. Fix permissions (run as root):"
for dir in "${FOUND_DIRS[@]}"; do
    echo "   sudo chown -R www-data:www-data $dir"
    echo "   sudo chmod -R 755 $dir"
done

# Fix 2: Nginx fix
echo ""
echo "2. Fix Nginx configuration:"
echo "   sudo nano /etc/nginx/sites-available/ult-fpeb"
echo "   Add this location block:"
echo '   location /uploads/ {'
for dir in "${FOUND_DIRS[@]}"; do
    echo "       alias $dir/;"
done
echo '       expires 30d;'
echo '       add_header Access-Control-Allow-Origin "*";'
echo '   }'

# Fix 3: Restart services
echo ""
echo "3. Restart services:"
echo "   sudo systemctl restart nginx"
echo "   pm2 restart all"

# Fix 4: Create symbolic link
echo ""
echo "4. Create symbolic link (if needed):"
if [[ ${#FOUND_DIRS[@]} -gt 0 ]]; then
    echo "   sudo ln -sf ${FOUND_DIRS[0]} /var/www/html/uploads"
fi

print_success "Diagnostic completed! Run the recommended fixes above."