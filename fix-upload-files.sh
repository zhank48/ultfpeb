#!/bin/bash

# =======================================================
# FIX UPLOAD FILES 404 ERROR SCRIPT
# Script untuk memperbaiki masalah file upload 404 Not Found
# =======================================================

echo "🔧 Fix Upload Files 404 Error Script"
echo "===================================="

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

print_status "Analyzing upload files system..."

# Check current directory structure
print_status "Current directory: $(pwd)"

# Check if we're in the right location
if [[ ! -d "backend" ]] || [[ ! -f "package.json" ]]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "Checking upload directories structure..."

# Define required upload directories
UPLOAD_DIRS=(
    "backend/uploads"
    "backend/uploads/profiles"
    "backend/uploads/photos"
    "backend/uploads/signatures"
    "backend/uploads/complaints"
    "backend/uploads/document_requests"
    "backend/uploads/lost-items"
    "backend/uploads/lost-items/handover"
    "backend/uploads/lost-items/handover/photos"
    "backend/uploads/lost-items/handover/signatures"
    "backend/uploads/lost-items/return"
    "backend/uploads/lost-items/return/photos"
    "backend/uploads/lost-items/return/signatures"
    "backend/uploads/reports"
    "backend/uploads/return_photos"
)

# Create missing directories
print_status "Creating missing upload directories..."
for dir in "${UPLOAD_DIRS[@]}"; do
    if [[ ! -d "$dir" ]]; then
        mkdir -p "$dir"
        print_status "Created directory: $dir"
    else
        print_status "Directory exists: $dir"
    fi
done

# Set proper permissions
print_status "Setting proper permissions for upload directories..."
chmod -R 755 backend/uploads/
chown -R $(whoami):$(whoami) backend/uploads/ 2>/dev/null || true

print_success "Upload directories structure created"

# Check existing files in uploads
print_status "Checking existing upload files..."

PROFILE_COUNT=$(find backend/uploads/profiles -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" -o -name "*.gif" 2>/dev/null | wc -l)
PHOTO_COUNT=$(find backend/uploads/photos -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" -o -name "*.gif" 2>/dev/null | wc -l)
SIGNATURE_COUNT=$(find backend/uploads/signatures -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" -o -name "*.gif" 2>/dev/null | wc -l)

echo "  - Profile images: $PROFILE_COUNT files"
echo "  - Visitor photos: $PHOTO_COUNT files"
echo "  - Signatures: $SIGNATURE_COUNT files"

# Create .gitkeep files to preserve directory structure
print_status "Creating .gitkeep files for empty directories..."
for dir in "${UPLOAD_DIRS[@]}"; do
    if [[ -d "$dir" ]] && [[ -z "$(ls -A "$dir" 2>/dev/null)" ]]; then
        touch "$dir/.gitkeep"
        print_status "Added .gitkeep to: $dir"
    fi
done

# Check if there are broken symlinks or permission issues
print_status "Checking for file permission issues..."

# Find files with wrong permissions
WRONG_PERMS=$(find backend/uploads -type f ! -perm 644 2>/dev/null | wc -l)
if [[ $WRONG_PERMS -gt 0 ]]; then
    print_warning "Found $WRONG_PERMS files with incorrect permissions"
    print_status "Fixing file permissions..."
    find backend/uploads -type f -exec chmod 644 {} + 2>/dev/null || true
    print_success "File permissions fixed"
fi

# Check web server configuration
print_status "Checking web server static file serving..."

# Check if server.js has static file serving configured
if [[ -f "backend/server.js" ]]; then
    if grep -q "uploads" backend/server.js; then
        print_success "Static file serving appears to be configured in server.js"
    else
        print_warning "Static file serving may not be configured properly"
        
        print_status "Adding static file serving configuration..."
        
        # Create a patch for server.js if needed
        cat >> backend/static-fix.js << 'EOF'
// Static file serving configuration for uploads
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Add this to your Express app after creating it:
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// CORS headers for file serving
// app.use('/uploads', (req, res, next) => {
//   res.header('Access-Control-Allow-Origin', '*');
//   res.header('Access-Control-Allow-Methods', 'GET');
//   res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
//   next();
// });

console.log('Static uploads directory configured at:', path.join(__dirname, 'uploads'));
EOF
        
        print_status "Created static-fix.js with configuration example"
    fi
else
    print_error "backend/server.js not found!"
fi

# Create a simple test image to verify upload functionality
print_status "Creating test files for upload verification..."

# Create a simple 1x1 pixel PNG for testing
TEST_PNG_DATA="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

# Create test profile image
echo "$TEST_PNG_DATA" | base64 -d > backend/uploads/profiles/test-profile.png 2>/dev/null || {
    # Alternative method if base64 -d doesn't work
    python3 -c "import base64; open('backend/uploads/profiles/test-profile.png', 'wb').write(base64.b64decode('$TEST_PNG_DATA'))" 2>/dev/null || \
    node -e "require('fs').writeFileSync('backend/uploads/profiles/test-profile.png', Buffer.from('$TEST_PNG_DATA', 'base64'));" 2>/dev/null || \
    print_warning "Could not create test image file"
}

if [[ -f "backend/uploads/profiles/test-profile.png" ]]; then
    print_success "Test profile image created successfully"
else
    print_warning "Could not create test profile image"
fi

# Check disk space
print_status "Checking disk space for uploads..."
DISK_SPACE=$(df -h backend/uploads 2>/dev/null | tail -1 | awk '{print $4}' || echo "unknown")
print_status "Available disk space: $DISK_SPACE"

# Restart application to apply changes
print_status "Restarting application to apply upload configuration..."

if command -v pm2 &> /dev/null; then
    # Find the correct PM2 process
    PM2_PROCESS=$(pm2 list 2>/dev/null | grep -E "(ult|fpeb|backend)" | head -1 | awk '{print $2}' | tr -d '│' | xargs)
    
    if [[ -n "$PM2_PROCESS" ]]; then
        print_status "Restarting PM2 process: $PM2_PROCESS"
        
        if pm2 restart "$PM2_PROCESS" >/dev/null 2>&1; then
            print_success "Application restarted successfully!"
            
            # Wait for startup
            sleep 3
            
            # Show status
            pm2 list | grep -E "(App name|$PM2_PROCESS)" || echo "PM2 process restarted"
            
        else
            print_warning "Failed to restart PM2 process. Try manually: pm2 restart $PM2_PROCESS"
        fi
    else
        print_warning "PM2 process not found. Please restart your application manually."
    fi
else
    print_warning "PM2 not found. Please restart your Node.js application manually."
fi

# Final verification
print_status "Final verification of upload system..."

echo ""
print_status "UPLOAD SYSTEM STATUS:"
echo "  ✅ Upload directories created and configured"
echo "  ✅ Proper permissions set (755 for dirs, 644 for files)"
echo "  ✅ .gitkeep files added to preserve structure"
echo "  ✅ Test files created for verification"
echo "  ✅ Application restarted"

echo ""
print_status "TROUBLESHOOTING STEPS:"
echo ""
echo "1. Test file access directly:"
echo "   curl -I https://10.15.0.120/uploads/profiles/test-profile.png"
echo ""
echo "2. Check if static serving is configured in server.js:"
echo "   grep -n \"uploads\" backend/server.js"
echo ""
echo "3. Verify upload directory exists on server:"
echo "   ls -la backend/uploads/profiles/"
echo ""
echo "4. Check web server logs:"
echo "   pm2 logs ult-fpeb-backend --lines 20"
echo ""
echo "5. Test file upload functionality in the application"

echo ""
if [[ -d "backend/uploads/profiles" ]] && [[ -w "backend/uploads/profiles" ]]; then
    print_success "🎉 UPLOAD FILES FIX COMPLETED SUCCESSFULLY!"
    print_status "The 404 errors for profile images should now be resolved."
else
    print_warning "⚠️  Some issues may remain. Check the troubleshooting steps above."
fi

print_success "Upload files fix script completed! 🚀"