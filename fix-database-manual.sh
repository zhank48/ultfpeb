#!/bin/bash

# =======================================================
# MANUAL DATABASE FIX SCRIPT
# Script untuk memperbaiki database secara manual
# =======================================================

echo "🔧 Manual Database Fix Script"
echo "============================="

# Database credentials
DB_NAME="ult_fpeb_prod"
DB_USER="ult_fpeb_user"
DB_PASSWORD="6QFLGp3ubaty8kbdXU8OU9k+8ReMU6Gx"

echo "Step 1: Check current table structure"
echo "======================================"
mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "DESCRIBE lost_items;"

echo ""
echo "Step 2: Check which columns are missing"
echo "======================================="
echo "Required columns: item_name, description, category, found_location, found_date, found_time, finder_name, finder_contact, found_by, condition_status, handover_photo_url, handover_signature_data, notes, input_by_user_id, received_by_operator, received_by_operator_id"

echo ""
echo "Step 3: Add missing columns one by one"
echo "======================================"

# Function to add column if not exists
add_column_if_not_exists() {
    local column_name=$1
    local column_definition=$2
    
    echo "Checking column: $column_name"
    
    # Check if column exists
    COLUMN_EXISTS=$(mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -se "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '$DB_NAME' AND TABLE_NAME = 'lost_items' AND COLUMN_NAME = '$column_name';" 2>/dev/null)
    
    if [[ "$COLUMN_EXISTS" == "0" ]]; then
        echo "  → Adding column: $column_name"
        mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "ALTER TABLE lost_items ADD COLUMN $column_name $column_definition;" 2>/dev/null
        if [[ $? -eq 0 ]]; then
            echo "  ✅ Added: $column_name"
        else
            echo "  ❌ Failed to add: $column_name"
        fi
    else
        echo "  ✅ Already exists: $column_name"
    fi
}

# Add missing columns
add_column_if_not_exists "description" "TEXT"
add_column_if_not_exists "category" "VARCHAR(100) DEFAULT NULL"
add_column_if_not_exists "status" "ENUM('found','returned','disposed') DEFAULT 'found'"
add_column_if_not_exists "notes" "TEXT"
add_column_if_not_exists "handover_signature_data" "TEXT"
add_column_if_not_exists "received_by_operator" "VARCHAR(255) DEFAULT NULL"
add_column_if_not_exists "received_by_operator_id" "INT UNSIGNED DEFAULT NULL"

echo ""
echo "Step 4: Final table structure"
echo "============================="
mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "DESCRIBE lost_items;"

echo ""
echo "Step 5: Restart PM2"
echo "==================="
pm2 restart ult-fpeb-backend

echo ""
echo "Step 6: Test database connection"
echo "==============================="
sleep 3
pm2 logs --lines 5 --nostream | grep -E "(error|Error|ERROR)" | tail -5

echo ""
echo "Manual database fix completed!"