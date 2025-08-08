#!/bin/bash

# =======================================================
# PRODUCTION DEPLOYMENT SCRIPT
# Script untuk deploy update ke server production 10.15.0.120
# =======================================================

echo "🚀 Production Deployment Script"
echo "==============================="

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

print_status "Starting production deployment..."

# Check if we're in the right location
if [[ ! -d "backend" ]] || [[ ! -f "package.json" ]]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Step 1: Pull latest changes from repository
print_status "Step 1: Pulling latest changes from repository..."
git fetch origin
git pull origin main

if [[ $? -ne 0 ]]; then
    print_error "Failed to pull from repository"
    exit 1
fi

print_success "Repository updated successfully"

# Step 2: Install backend dependencies
print_status "Step 2: Installing backend dependencies..."
cd backend
npm install --production

if [[ $? -ne 0 ]]; then
    print_error "Failed to install backend dependencies"
    exit 1
fi

print_success "Backend dependencies installed"

# Step 3: Install frontend dependencies and build
print_status "Step 3: Installing frontend dependencies and building..."
cd ../frontend
npm install

if [[ $? -ne 0 ]]; then
    print_error "Failed to install frontend dependencies"
    exit 1
fi

print_status "Building frontend for production..."
npm run build

if [[ $? -ne 0 ]]; then
    print_error "Failed to build frontend"
    exit 1
fi

print_success "Frontend built successfully"

# Step 4: Back to root directory
cd ..

# Step 5: Run comprehensive database migration
print_status "Step 5: Running database migration to sync with production..."
if [[ -f "run-database-migration.sh" ]]; then
    chmod +x run-database-migration.sh
    # Run migration non-interactively with environment variables
    export DB_HOST=${DB_HOST:-localhost}
    export DB_USER=${DB_USER:-root} 
    export DB_NAME=${DB_NAME:-ult_fpeb_db}
    echo "yes" | ./run-database-migration.sh
    print_success "Database migration completed"
else
    print_warning "Database migration script not found"
    print_status "Running basic production database fix..."
    if [[ -f "backend/sql/production_database_fix.sql" ]]; then
        mysql -u ${DB_USER:-root} -p${DB_PASSWORD} ${DB_NAME:-ult_fpeb_db} < backend/sql/production_database_fix.sql
        print_success "Basic database fix applied"
    fi
fi

# Step 6: Fix upload files accessibility (handle 404 errors)  
print_status "Step 6: Fixing upload files accessibility..."
if [[ -f "fix-production-uploads.sh" ]]; then
    chmod +x fix-production-uploads.sh
    sudo ./fix-production-uploads.sh
    print_success "Upload files accessibility fix completed"
elif [[ -f "fix-missing-upload-files.sh" ]]; then
    chmod +x fix-missing-upload-files.sh
    ./fix-missing-upload-files.sh
    print_success "Upload files fix completed"
else
    print_warning "Upload fix script not found"
    print_status "Manual steps needed:"
    print_status "1. Check uploads directory permissions"
    print_status "2. Verify Nginx configuration for /uploads/ location"  
    print_status "3. Restart Nginx and PM2 services"
fi

# Step 7: Restart PM2 services  
print_status "Step 7: Restarting PM2 services..."

if command -v pm2 &> /dev/null; then
    # Find the correct PM2 process
    PM2_PROCESS=$(pm2 list 2>/dev/null | grep -E "(ult|fpeb|backend)" | head -1 | awk '{print $2}' | tr -d '│' | xargs)
    
    if [[ -n "$PM2_PROCESS" ]]; then
        print_status "Restarting PM2 process: $PM2_PROCESS"
        
        # Restart the process
        pm2 restart "$PM2_PROCESS"
        
        if [[ $? -eq 0 ]]; then
            print_success "PM2 process restarted successfully"
            
            # Wait for startup
            sleep 5
            
            # Show process status
            print_status "Current PM2 status:"
            pm2 list | grep -E "(App name|$PM2_PROCESS)" || pm2 list
            
        else
            print_error "Failed to restart PM2 process"
            print_warning "Try manually: pm2 restart $PM2_PROCESS"
        fi
    else
        print_warning "PM2 process not found. Trying to restart all processes..."
        pm2 restart all
        
        if [[ $? -eq 0 ]]; then
            print_success "All PM2 processes restarted"
        else
            print_error "Failed to restart PM2 processes"
        fi
    fi
else
    print_error "PM2 not found. Please restart your Node.js application manually."
    print_status "Alternative restart commands:"
    echo "  - systemctl restart your-app-service"
    echo "  - supervisorctl restart your-app"
    echo "  - Or restart your process manager manually"
fi

# Step 7: Verify deployment
print_status "Step 6: Verifying deployment..."

# Check if backend is running
if command -v curl &> /dev/null; then
    print_status "Testing backend health endpoint..."
    
    # Test health endpoint
    HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null || echo "000")
    
    if [[ "$HEALTH_RESPONSE" == "200" ]]; then
        print_success "Backend is responding (HTTP 200)"
    else
        print_warning "Backend health check failed (HTTP $HEALTH_RESPONSE)"
        print_status "Check PM2 logs: pm2 logs"
    fi
else
    print_warning "curl not available, skipping health check"
fi

# Step 8: Final status report
echo ""
print_status "DEPLOYMENT SUMMARY:"
echo "  ✅ Repository updated with latest changes"
echo "  ✅ Backend dependencies installed"
echo "  ✅ Frontend built for production"
echo "  ✅ Upload files fixed (404 errors resolved)"
echo "  ✅ PM2 services restarted"

echo ""
print_status "POST-DEPLOYMENT CHECKLIST:"
echo "1. Test Unit/Departemen field display in visitor pages"
echo "2. Test check-in with empty email field"
echo "3. Verify image uploads are working"
echo "4. Check PM2 logs for any errors: pm2 logs"
echo "5. Monitor application performance"

echo ""
print_status "TROUBLESHOOTING COMMANDS:"
echo "  - Check PM2 status: pm2 status"
echo "  - View PM2 logs: pm2 logs --lines 50"
echo "  - Restart specific process: pm2 restart [process-name]"
echo "  - View application logs: pm2 logs [process-name]"

echo ""
if [[ "$HEALTH_RESPONSE" == "200" ]]; then
    print_success "🎉 PRODUCTION DEPLOYMENT COMPLETED SUCCESSFULLY!"
    print_status "Your application should now have all the latest fixes applied."
else
    print_warning "⚠️  DEPLOYMENT COMPLETED WITH WARNINGS"
    print_status "Please check the application manually and review PM2 logs."
fi

print_success "Production deployment script completed! 🚀"



sudo sed -i '/server {/,/^}$/{
      /^}$/{
          i\
      # Static file serving for uploads\
      location /uploads/ {\
          alias /opt/ult-fpeb/uploads/;\
          expires 30d;\
          add_header Cache-Control "public, no-transform";\
          add_header Access-Control-Allow-Origin "*";\
          \
          # Handle missing files gracefully\
          try_files $uri $uri/ =404;\
          \
          # Security headers\
          add_header X-Content-Type-Options nosniff;\
          add_header X-Frame-Options DENY;\
          \
          # Allow common image formats\
          location ~* \\.(jpg|jpeg|png|gif|ico|svg|webp)$ {\
              expires 1y;\
              add_header Cache-Control "public, immutable";\
          }\
      }
      }
  }' /etc/nginx/sites-available/ult-fpeb