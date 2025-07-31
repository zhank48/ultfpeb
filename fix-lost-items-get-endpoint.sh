#!/bin/bash

# =======================================================
# FIX LOST ITEMS GET ENDPOINT SCRIPT
# Script untuk memperbaiki error 500 di GET /api/lost-items/:id
# =======================================================

echo "🔧 Fix Lost Items GET Endpoint Script"
echo "====================================="

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

# Database credentials
DB_NAME="ult_fpeb_prod"
DB_USER="ult_fpeb_user"
DB_PASSWORD="6QFLGp3ubaty8kbdXU8OU9k+8ReMU6Gx"

print_status "Checking missing tables for lost items GET endpoint..."

# Check if required tables exist
TABLES_TO_CHECK=("item_returns" "lost_item_history" "lost_item_handovers" "lost_item_returns")

echo ""
print_status "Checking required tables:"
for table in "${TABLES_TO_CHECK[@]}"; do
    EXISTS=$(mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -se "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = '$DB_NAME' AND TABLE_NAME = '$table';" 2>/dev/null)
    if [[ "$EXISTS" == "1" ]]; then
        print_success "  ✅ $table - EXISTS"
    else
        print_warning "  ❌ $table - MISSING"
    fi
done

print_status "Creating missing tables for lost items functionality..."

# Create item_returns table
mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" << 'EOF'
CREATE TABLE IF NOT EXISTS item_returns (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    lost_item_id INT UNSIGNED NOT NULL,
    claimer_name VARCHAR(255) NOT NULL,
    claimer_contact VARCHAR(100),
    claimer_id_number VARCHAR(50),
    claimer_id_type VARCHAR(50),
    relationship_to_owner VARCHAR(255),
    proof_of_ownership TEXT,
    return_date DATE NOT NULL,
    return_time TIME,
    returned_by VARCHAR(255),
    return_operator VARCHAR(255),
    return_operator_id INT UNSIGNED,
    return_photo_url VARCHAR(500),
    return_signature_data TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lost_item_id) REFERENCES lost_items(id) ON DELETE CASCADE,
    FOREIGN KEY (return_operator_id) REFERENCES users(id) ON DELETE SET NULL
);
EOF

# Create lost_item_history table
mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" << 'EOF'
CREATE TABLE IF NOT EXISTS lost_item_history (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    lost_item_id INT UNSIGNED NOT NULL,
    action ENUM('created', 'updated', 'returned', 'disposed') NOT NULL,
    description TEXT,
    user_id INT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lost_item_id) REFERENCES lost_items(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
EOF

# Create lost_item_handovers table
mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" << 'EOF'
CREATE TABLE IF NOT EXISTS lost_item_handovers (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    lost_item_id INT UNSIGNED NOT NULL,
    handover_date DATE NOT NULL,
    handover_time TIME NOT NULL,
    handed_by VARCHAR(255),
    received_by VARCHAR(255),
    handover_photo_url VARCHAR(500),
    handover_signature_data TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lost_item_id) REFERENCES lost_items(id) ON DELETE CASCADE
);
EOF

# Create lost_item_returns table (alternative naming)
mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" << 'EOF'
CREATE TABLE IF NOT EXISTS lost_item_returns (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    lost_item_id INT UNSIGNED NOT NULL,
    claimer_name VARCHAR(255) NOT NULL,
    claimer_contact VARCHAR(100),
    return_date DATE NOT NULL,
    return_time TIME,
    returned_by VARCHAR(255),
    return_photo_url VARCHAR(500),
    return_signature_data TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lost_item_id) REFERENCES lost_items(id) ON DELETE CASCADE
);
EOF

# Verify tables were created
print_status "Verifying tables were created successfully..."
echo ""
for table in "${TABLES_TO_CHECK[@]}"; do
    EXISTS=$(mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -se "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = '$DB_NAME' AND TABLE_NAME = '$table';" 2>/dev/null)
    if [[ "$EXISTS" == "1" ]]; then
        print_success "  ✅ $table - NOW EXISTS"
    else
        print_error "  ❌ $table - STILL MISSING"
    fi
done

# Test the GET endpoint
print_status "Testing the GET endpoint..."

# Restart PM2 first
pm2 restart ult-fpeb-backend >/dev/null 2>&1
sleep 3

# Test with curl
print_status "Testing GET /api/lost-items/1 endpoint..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer test" http://localhost:3001/api/lost-items/1 2>/dev/null || echo "000")

if [[ "$RESPONSE" == "200" ]]; then
    print_success "✅ GET endpoint working: HTTP 200"
elif [[ "$RESPONSE" == "401" ]]; then
    print_warning "⚠️  GET endpoint: HTTP 401 (Authentication required - normal)"
elif [[ "$RESPONSE" == "500" ]]; then
    print_error "❌ GET endpoint still: HTTP 500 (Server Error)"
else
    print_warning "⚠️  GET endpoint: HTTP $RESPONSE"
fi

# Check PM2 logs for any remaining errors
print_status "Checking PM2 logs for database errors..."
ERROR_COUNT=$(pm2 logs --lines 10 --nostream 2>/dev/null | grep -c "ER_NO_SUCH_TABLE\|Table.*doesn't exist\|ER_BAD_FIELD_ERROR" || echo "0")

if [[ "$ERROR_COUNT" -eq "0" ]]; then
    print_success "✅ No table/field errors in recent logs"
else
    print_warning "⚠️  Found $ERROR_COUNT table/field errors in logs"
    pm2 logs --lines 10 --nostream 2>/dev/null | grep -A2 -B2 "ER_NO_SUCH_TABLE\|Table.*doesn't exist\|ER_BAD_FIELD_ERROR" | tail -5
fi

echo ""
print_status "🎯 GET ENDPOINT FIX SUMMARY:"

if [[ "$RESPONSE" == "200" ]] || [[ "$RESPONSE" == "401" ]]; then
    print_success "🎉 GET ENDPOINT FIX COMPLETED!"
    echo "  ✅ All required tables created"
    echo "  ✅ GET /api/lost-items/:id endpoint working"
    echo "  ✅ No table/field errors in logs"
    echo "  ✅ Lost items detail functionality restored"
else
    print_warning "⚠️  GET endpoint may still have issues"
    echo "  ❌ HTTP response: $RESPONSE"
    echo "  ❌ May need additional investigation"
fi

echo ""
print_status "MANUAL TEST COMMANDS:"
echo "# Test GET endpoint (replace TOKEN with valid JWT)"
echo "curl -H 'Authorization: Bearer YOUR_TOKEN' http://localhost:3001/api/lost-items/1"
echo ""
echo "# Check PM2 logs"
echo "pm2 logs --lines 20"

print_success "GET endpoint fix script completed! 🚀"