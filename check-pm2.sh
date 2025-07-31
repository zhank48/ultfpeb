#!/bin/bash

# =======================================================
# PM2 Process Checker and Fixer
# Script untuk mengecek dan memperbaiki PM2 processes
# =======================================================

echo "🔍 PM2 Process Checker"
echo "====================="

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

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    print_error "PM2 not found! Installing PM2..."
    npm install -g pm2
    if [[ $? -ne 0 ]]; then
        print_error "Failed to install PM2. Please install manually: npm install -g pm2"
        exit 1
    fi
    print_success "PM2 installed successfully!"
fi

print_status "Current PM2 processes:"
pm2 list

echo ""
print_status "Looking for Node.js processes..."

# Find running Node.js processes that might be our app
NODE_PROCESSES=$(ps aux | grep -E "(node|npm)" | grep -v grep | grep -E "(server|backend|ult|fpeb)")

if [[ -n "$NODE_PROCESSES" ]]; then
    print_status "Found Node.js processes that might be your app:"
    echo "$NODE_PROCESSES"
    echo ""
fi

# Check if there's a package.json with scripts
if [[ -f "package.json" ]]; then
    print_status "Found package.json. Available scripts:"
    node -p "Object.keys(require('./package.json').scripts || {}).join(', ')" 2>/dev/null
    echo ""
fi

# Check backend package.json
if [[ -f "backend/package.json" ]]; then
    print_status "Found backend/package.json. Available scripts:"
    node -p "Object.keys(require('./backend/package.json').scripts || {}).join(', ')" 2>/dev/null
    echo ""
fi

# Check for ecosystem.config files
if [[ -f "ecosystem.config.cjs" ]]; then
    print_status "Found ecosystem.config.cjs"
    echo "Content:"
    head -20 ecosystem.config.cjs
    echo ""
fi

if [[ -f "backend/ecosystem.config.cjs" ]]; then
    print_status "Found backend/ecosystem.config.cjs"
    echo "Content:"
    head -20 backend/ecosystem.config.cjs
    echo ""
fi

# Offer solutions
echo ""
print_status "🛠️  SOLUTIONS:"
echo ""

echo "1. If your app is NOT running in PM2 yet:"
echo "   cd backend && pm2 start server.js --name ult-fpeb"
echo ""

echo "2. If you have ecosystem.config.cjs:"
echo "   pm2 start ecosystem.config.cjs"
echo ""

echo "3. To start with npm script:"
echo "   pm2 start npm --name ult-fpeb -- start"
echo ""

echo "4. To kill all PM2 processes and restart fresh:"
echo "   pm2 kill"
echo "   cd backend && pm2 start server.js --name ult-fpeb"
echo ""

echo "5. To see detailed PM2 info:"
echo "   pm2 show <process_name>"
echo ""

echo "6. To monitor PM2 logs:"
echo "   pm2 logs"
echo ""

# Try to detect the correct way to start
if [[ -f "backend/server.js" ]]; then
    print_status "✅ Found backend/server.js - This is likely your main file"
    echo ""
    read -p "Would you like to start the app now? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cd backend
        print_status "Starting app with PM2..."
        pm2 start server.js --name ult-fpeb
        
        if [[ $? -eq 0 ]]; then
            print_success "App started successfully!"
            pm2 list
        else
            print_error "Failed to start app. Check the output above."
        fi
    fi
fi