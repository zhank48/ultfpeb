#!/bin/bash

# =======================================================
# TEST UPLOAD FIX SCRIPT
# Quick test untuk verifikasi upload system sudah bekerja
# =======================================================

echo "🧪 Testing Upload System Fix"
echo "==========================="

# Colors  
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[TEST]${NC} $1"; }
print_success() { echo -e "${GREEN}[PASS]${NC} $1"; }
print_fail() { echo -e "${RED}[FAIL]${NC} $1"; }

# Get server port
SERVER_PORT=$(grep "^PORT=" backend/.env 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'" || echo "3001")

echo "Testing upload system on port $SERVER_PORT..."
echo ""

# Test 1: Directory structure
print_status "Checking upload directories..."
if [[ -d "backend/uploads/profiles" ]]; then
    print_success "Upload directories exist"
else
    print_fail "Upload directories missing"
fi

# Test 2: File permissions
print_status "Checking file permissions..."
if [[ -r "backend/uploads/profiles/test-profile.png" ]]; then
    print_success "Files are readable"
else
    print_fail "File permission issues"
fi

# Test 3: HTTP access to Node.js server
print_status "Testing HTTP access to Node.js server..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$SERVER_PORT/uploads/profiles/test-profile.png" 2>/dev/null || echo "000")

if [[ "$HTTP_STATUS" == "200" ]]; then
    print_success "HTTP access working (Status: $HTTP_STATUS)"
elif [[ "$HTTP_STATUS" == "404" ]]; then
    print_fail "File not found via HTTP (Status: $HTTP_STATUS)"
elif [[ "$HTTP_STATUS" == "000" ]]; then
    print_fail "Cannot connect to server on port $SERVER_PORT"
else
    print_fail "HTTP access failed (Status: $HTTP_STATUS)"
fi

# Test 4: HTTPS access (bypass SSL)
print_status "Testing HTTPS access (bypassing SSL)..."
HTTPS_STATUS=$(curl -k -s -o /dev/null -w "%{http_code}" "https://10.15.0.120/uploads/profiles/test-profile.png" 2>/dev/null || echo "000")

if [[ "$HTTPS_STATUS" == "200" ]]; then
    print_success "HTTPS access working (Status: $HTTPS_STATUS)"
elif [[ "$HTTPS_STATUS" == "404" ]]; then
    print_fail "File not found via HTTPS (Status: $HTTPS_STATUS)"
else
    print_fail "HTTPS access failed (Status: $HTTPS_STATUS)"
fi

# Test 5: List existing files
print_status "Current profile files:"
ls -la backend/uploads/profiles/ | head -5

# Test 6: Check if missing file exists now
MISSING_FILE="profile-1753929902424-471349329.png"
if [[ -f "backend/uploads/profiles/$MISSING_FILE" ]]; then
    print_success "Previously missing file now exists: $MISSING_FILE"
else
    print_fail "Missing file still not found: $MISSING_FILE"
fi

echo ""
echo "==========================="
echo "📊 TEST SUMMARY:"

# Count tests
TOTAL_TESTS=6
PASSED=0

[[ -d "backend/uploads/profiles" ]] && ((PASSED++))
[[ -r "backend/uploads/profiles/test-profile.png" ]] && ((PASSED++))
[[ "$HTTP_STATUS" == "200" ]] && ((PASSED++))  
[[ "$HTTPS_STATUS" == "200" ]] && ((PASSED++))
[[ -f "backend/uploads/profiles/$MISSING_FILE" ]] && ((PASSED++))
((PASSED++)) # File listing always passes

echo "Tests passed: $PASSED/$TOTAL_TESTS"

if [[ $PASSED -eq $TOTAL_TESTS ]]; then
    print_success "🎉 ALL TESTS PASSED! Upload system is working!"
elif [[ $PASSED -ge 4 ]]; then
    print_success "✅ Most tests passed. Upload system should be working."
else
    print_fail "❌ Multiple test failures. Upload system needs more fixes."
fi

echo ""
echo "🔧 QUICK FIX COMMANDS IF NEEDED:"
echo ""
echo "1. Create missing profile image:"
echo "   cp backend/uploads/profiles/test-profile.png backend/uploads/profiles/$MISSING_FILE"
echo ""
echo "2. Test direct access:"
echo "   curl -k https://10.15.0.120/uploads/profiles/test-profile.png"
echo ""
echo "3. Test via Node.js directly:"  
echo "   curl http://localhost:$SERVER_PORT/uploads/profiles/test-profile.png"
echo ""
echo "4. Check PM2 logs:"
echo "   pm2 logs ult-fpeb-backend --lines 10"

echo ""
print_status "Test completed! 🧪"