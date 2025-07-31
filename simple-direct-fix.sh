#!/bin/bash

# =======================================================
# SIMPLE DIRECT FIX - No complications
# =======================================================

echo "🛠️  Simple Direct Database Fix"
echo "=============================="

# Basic info
echo "This script will:"
echo "1. Ask for your database credentials"
echo "2. Run simple SQL commands to fix the database"
echo "3. Show you the results"
echo ""

# Get credentials
read -p "Database host [localhost]: " host
host=${host:-localhost}

read -p "Database name [ult_fpeb_prod]: " dbname
dbname=${dbname:-ult_fpeb_prod}

read -p "Database user [ult_fpeb_user]: " user
user=${user:-ult_fpeb_user}

echo -n "Database password: "
read -s password
echo ""

echo ""
echo "Testing connection..."

# Quick connection test
if mysql -h "$host" -u "$user" -p"$password" -e "USE $dbname; SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Connection successful!"
else
    echo "❌ Connection failed! Please check your credentials."
    exit 1
fi

echo ""
echo "Running database fixes..."
echo "Note: Some commands may show 'ERROR' if columns/tables already exist - this is normal!"
echo ""

# Run the direct SQL file with error handling
mysql -h "$host" -u "$user" -p"$password" "$dbname" < backend/sql/direct_fix.sql

echo ""
echo "Verifying results..."

# Check what we accomplished
echo ""
echo "=== CHECKOUT COLUMNS ==="
mysql -h "$host" -u "$user" -p"$password" "$dbname" -e "SHOW COLUMNS FROM visitors" | grep checkout || echo "No checkout columns found"

echo ""
echo "=== VISITOR_EDIT_HISTORY TABLE ==="
mysql -h "$host" -u "$user" -p"$password" "$dbname" -e "DESCRIBE visitor_edit_history" 2>/dev/null || echo "Table visitor_edit_history does not exist"

echo ""
echo "✅ Database fix attempt completed!"
echo ""
echo "Next steps:"
echo "1. Restart your application (pm2 restart <process_name>)"
echo "2. Test visitor checkout functionality"
echo "3. Test login and password change"
echo ""

# Show PM2 processes if available
if command -v pm2 &> /dev/null; then
    echo "Current PM2 processes:"
    pm2 list 2>/dev/null || echo "No PM2 processes running"
fi