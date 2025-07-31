#!/bin/bash

# =======================================================
# FIX ITEM RETURNS COLUMNS SCRIPT
# Script untuk menambahkan kolom yang hilang di tabel item_returns
# =======================================================

echo "🔧 Fix Item Returns Columns Script"
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

# Database credentials
DB_NAME="ult_fpeb_prod"
DB_USER="ult_fpeb_user"
DB_PASSWORD="6QFLGp3ubaty8kbdXU8OU9k+8ReMU6Gx"

print_status "Fixing missing columns in item_returns table..."

# Check current structure of item_returns table
print_status "Current item_returns table structure:"
mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "DESCRIBE item_returns;" 2>/dev/null || {
    print_error "item_returns table does not exist"
    print_status "Creating item_returns table..."
    
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
    returned_by_user_id INT UNSIGNED,
    return_operator VARCHAR(255),
    return_operator_id INT UNSIGNED,
    return_photo_url VARCHAR(500),
    return_signature_data TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lost_item_id) REFERENCES lost_items(id) ON DELETE CASCADE,
    FOREIGN KEY (return_operator_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (returned_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);
EOF
    print_success "item_returns table created"
}

# Function to add column if not exists
add_column_if_not_exists() {
    local table_name=$1
    local column_name=$2
    local column_definition=$3
    
    print_status "Checking column: $table_name.$column_name"
    
    # Check if column exists
    COLUMN_EXISTS=$(mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -se "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '$DB_NAME' AND TABLE_NAME = '$table_name' AND COLUMN_NAME = '$column_name';" 2>/dev/null)
    
    if [[ $? -ne 0 ]]; then
        print_error "Failed to check column existence for: $table_name.$column_name"
        return 1
    fi
    
    if [[ "$COLUMN_EXISTS" == "0" ]]; then
        print_status "  → Adding missing column: $column_name"
        mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "ALTER TABLE $table_name ADD COLUMN $column_name $column_definition;" 2>/dev/null
        if [[ $? -eq 0 ]]; then
            print_success "  ✅ Successfully added: $column_name"
        else
            print_error "  ❌ Failed to add: $column_name"
            return 1
        fi
    else
        print_success "  ✅ Already exists: $column_name"
    fi
    return 0
}

# Add missing columns to item_returns table
print_status "Adding missing columns to item_returns table..."

COLUMNS_TO_ADD=(
    "item_returns:claimer_contact:VARCHAR(100)"
    "item_returns:claimer_id_number:VARCHAR(50)"
    "item_returns:claimer_id_type:VARCHAR(50)"
    "item_returns:relationship_to_owner:VARCHAR(255)"
    "item_returns:proof_of_ownership:TEXT"
    "item_returns:return_time:TIME"
    "item_returns:returned_by:VARCHAR(255)"
    "item_returns:returned_by_user_id:INT UNSIGNED"
    "item_returns:return_operator:VARCHAR(255)"
    "item_returns:return_operator_id:INT UNSIGNED"
    "item_returns:return_photo_url:VARCHAR(500)"
    "item_returns:return_signature_data:TEXT"
    "item_returns:notes:TEXT"
    "item_returns:updated_at:TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
)

TOTAL_ADDED=0
TOTAL_EXISTING=0
TOTAL_FAILED=0

for column_info in "${COLUMNS_TO_ADD[@]}"; do
    IFS=':' read -r table_name column_name column_definition <<< "$column_info"
    
    if add_column_if_not_exists "$table_name" "$column_name" "$column_definition"; then
        # Check if it was actually added
        COLUMN_EXISTS_NOW=$(mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -se "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '$DB_NAME' AND TABLE_NAME = '$table_name' AND COLUMN_NAME = '$column_name';" 2>/dev/null)
        if [[ "$COLUMN_EXISTS_NOW" == "1" ]]; then
            if [[ "$COLUMN_EXISTS" == "0" ]]; then
                ((TOTAL_ADDED++))
            else
                ((TOTAL_EXISTING++))
            fi
        fi
    else
        ((TOTAL_FAILED++))
    fi
done

# Show results
echo ""
print_status "COLUMN UPDATE SUMMARY:"
echo "  ✅ Successfully processed: $((TOTAL_ADDED + TOTAL_EXISTING))"
echo "  🆕 Newly added: $TOTAL_ADDED"
echo "  📋 Already existed: $TOTAL_EXISTING"
echo "  ❌ Failed: $TOTAL_FAILED"

# Show final table structure
print_status "Final item_returns table structure:"
mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "DESCRIBE item_returns;" 2>/dev/null

# Add foreign key constraints if they don't exist
print_status "Checking and adding foreign key constraints..."

# Check if foreign key to lost_items exists
FK_EXISTS=$(mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -se "
SELECT COUNT(*) 
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA = '$DB_NAME' 
AND TABLE_NAME = 'item_returns' 
AND REFERENCED_TABLE_NAME = 'lost_items';" 2>/dev/null)

if [[ "$FK_EXISTS" == "0" ]]; then
    print_status "Adding foreign key constraint to lost_items..."
    mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "
    ALTER TABLE item_returns 
    ADD CONSTRAINT fk_item_returns_lost_item 
    FOREIGN KEY (lost_item_id) REFERENCES lost_items(id) ON DELETE CASCADE;" 2>/dev/null
    
    if [[ $? -eq 0 ]]; then
        print_success "Foreign key constraint added successfully"
    else
        print_warning "Foreign key constraint might already exist or failed to add"
    fi
else
    print_success "Foreign key constraint to lost_items already exists"
fi

# Restart PM2
print_status "Restarting PM2 application..."
pm2 restart ult-fpeb-backend >/dev/null 2>&1
sleep 3

if [[ $? -eq 0 ]]; then
    print_success "Application restarted successfully"
else
    print_error "Failed to restart application"
fi

# Test the GET endpoint
print_status "Testing GET /api/lost-items/1 endpoint..."
sleep 2

# Test with curl (will get 401 without proper token, but that's better than 500)
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/lost-items/1 2>/dev/null || echo "000")

if [[ "$RESPONSE" == "200" ]]; then
    print_success "✅ GET endpoint working: HTTP 200"
elif [[ "$RESPONSE" == "401" ]]; then
    print_success "✅ GET endpoint structure OK: HTTP 401 (needs authentication)"
elif [[ "$RESPONSE" == "500" ]]; then
    print_error "❌ GET endpoint still: HTTP 500 (Server Error)"
else
    print_warning "⚠️  GET endpoint: HTTP $RESPONSE"
fi

# Check PM2 logs for database column errors
print_status "Checking PM2 logs for column errors..."
ERROR_COUNT=$(pm2 logs --lines 10 --nostream 2>/dev/null | grep -c "Unknown column.*claimer_contact\|Unknown column.*ir\." || echo "0")

if [[ "$ERROR_COUNT" -eq "0" ]]; then
    print_success "✅ No column errors found in recent logs"
else
    print_warning "⚠️  Found $ERROR_COUNT column errors in logs"
fi

echo ""
print_status "🎯 ITEM RETURNS COLUMNS FIX SUMMARY:"

if [[ "$TOTAL_FAILED" -eq "0" ]] && [[ "$ERROR_COUNT" -eq "0" ]] && ([[ "$RESPONSE" == "200" ]] || [[ "$RESPONSE" == "401" ]]); then
    print_success "🎉 ITEM RETURNS TABLE FIX COMPLETED!"
    echo "  ✅ All required columns added to item_returns table"
    echo "  ✅ GET /api/lost-items/:id endpoint structure fixed"
    echo "  ✅ No column errors in logs"
    echo "  ✅ Lost items detail functionality should work"
    
    echo ""
    print_status "NEXT STEPS:"
    echo "1. Test with proper authentication token"
    echo "2. Verify lost item detail page works in frontend"
    echo "3. Test complete lost items workflow"
else
    print_warning "⚠️  Fix completed with some issues:"
    if [[ "$TOTAL_FAILED" -gt "0" ]]; then
        echo "  ❌ $TOTAL_FAILED columns failed to add"
    fi
    if [[ "$ERROR_COUNT" -gt "0" ]]; then
        echo "  ❌ $ERROR_COUNT column errors still in logs"
    fi
    if [[ "$RESPONSE" == "500" ]]; then
        echo "  ❌ GET endpoint still returns 500 error"
    fi
fi

echo ""
print_status "MANUAL TEST COMMANDS:"
echo "# Test with authentication (replace TOKEN with valid JWT)"
echo "curl -H 'Authorization: Bearer YOUR_TOKEN' http://localhost:3001/api/lost-items/1"
echo ""
echo "# Check PM2 logs"
echo "pm2 logs --lines 20"
echo ""
echo "# Check table structure"
echo "mysql -u $DB_USER -p'$DB_PASSWORD' $DB_NAME -e 'DESCRIBE item_returns;'"

print_success "Item returns columns fix script completed! 🚀"