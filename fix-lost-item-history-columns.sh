#!/bin/bash

# =======================================================
# FIX LOST ITEM HISTORY COLUMNS SCRIPT
# Script untuk memperbaiki kolom yang hilang di tabel lost_item_history
# =======================================================

echo "🔧 Fix Lost Item History Columns Script"
echo "========================================"

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

print_status "Fixing missing columns in lost_item_history table..."

# Check current structure of lost_item_history table
print_status "Current lost_item_history table structure:"
mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "DESCRIBE lost_item_history;" 2>/dev/null || {
    print_error "lost_item_history table does not exist"
    print_status "Creating lost_item_history table..."
    
    mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" << 'EOF'
CREATE TABLE IF NOT EXISTS lost_item_history (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    lost_item_id INT UNSIGNED NOT NULL,
    action ENUM('created', 'updated', 'returned', 'disposed') DEFAULT 'updated',
    action_type VARCHAR(100) DEFAULT 'update',
    old_data JSON,
    new_data JSON,
    changed_fields TEXT,
    description TEXT,
    user_id INT UNSIGNED,
    user_name VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lost_item_id) REFERENCES lost_items(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
EOF
    print_success "lost_item_history table created"
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

# Add missing columns to lost_item_history table
print_status "Adding missing columns to lost_item_history table..."

COLUMNS_TO_ADD=(
    "lost_item_history:action_type:VARCHAR(100) DEFAULT 'update'"
    "lost_item_history:old_data:JSON"
    "lost_item_history:new_data:JSON"
    "lost_item_history:changed_fields:TEXT"
    "lost_item_history:user_name:VARCHAR(255)"
    "lost_item_history:ip_address:VARCHAR(45)"
    "lost_item_history:user_agent:TEXT"
    "lost_item_history:notes:TEXT"
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
print_status "Final lost_item_history table structure:"
mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "DESCRIBE lost_item_history;" 2>/dev/null

# Restart PM2
print_status "Restarting PM2 application..."
pm2 restart ult-fpeb-backend >/dev/null 2>&1
sleep 3

if [[ $? -eq 0 ]]; then
    print_success "Application restarted successfully"
else
    print_error "Failed to restart application"
fi

# Check for database errors
print_status "Checking PM2 logs for action_type errors..."
ERROR_COUNT=$(pm2 logs --lines 10 --nostream 2>/dev/null | grep -c "Unknown column.*action_type\\|ER_BAD_FIELD_ERROR" || echo "0")

if [[ "$ERROR_COUNT" -eq "0" ]]; then
    print_success "✅ No action_type errors found in recent logs"
else
    print_warning "⚠️  Found $ERROR_COUNT action_type errors in logs"
fi

# Final summary
echo ""
print_status "🎯 LOST ITEM HISTORY FIX SUMMARY:"

if [[ "$TOTAL_FAILED" -eq "0" ]] && [[ "$ERROR_COUNT" -eq "0" ]]; then
    print_success "🎉 LOST ITEM HISTORY TABLE FIX COMPLETED!"
    echo "  ✅ All required columns added to lost_item_history table"
    echo "  ✅ No action_type errors in logs"
    echo "  ✅ Lost items history functionality should work"
else
    print_warning "⚠️  Fix completed with some issues:"
    if [[ "$TOTAL_FAILED" -gt "0" ]]; then
        echo "  ❌ $TOTAL_FAILED columns failed to add"
    fi
    if [[ "$ERROR_COUNT" -gt "0" ]]; then
        echo "  ❌ $ERROR_COUNT action_type errors still in logs"
    fi
fi

echo ""
print_status "MANUAL TEST COMMANDS:"
echo "# Check table structure"
echo "mysql -u $DB_USER -p'$DB_PASSWORD' $DB_NAME -e 'DESCRIBE lost_item_history;'"
echo ""
echo "# Check PM2 logs"
echo "pm2 logs --lines 20"

print_success "Lost item history columns fix script completed! 🚀"