#!/bin/bash

# 🔍 ULT FPEB Comprehensive System Verification Script
# Verifies deployment health, performance, and security

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
APP_DIR="/var/www/ult-fpeb"
FRONTEND_DIR="/var/www/ult-fpeb-frontend"
DB_NAME="ult_fpeb_db"
DB_USER="ult_fpeb_user"

print_header() {
    clear
    echo -e "${MAGENTA}╔════════════════════════════════════════╗${NC}"
    echo -e "${MAGENTA}║     ULT FPEB System Verification      ║${NC}"
    echo -e "${MAGENTA}║    Comprehensive Health Check         ║${NC}"
    echo -e "${MAGENTA}╚════════════════════════════════════════╝${NC}"
    echo
    echo -e "${CYAN}📅 $(date '+%Y-%m-%d %H:%M:%S')${NC}"
    echo -e "${CYAN}🖥️  $(hostname) ($(hostname -I | awk '{print $1}'))${NC}"
    echo
}

log_check() {
    echo -e "${BLUE}[CHECK]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✅ PASS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠️  WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[❌ FAIL]${NC} $1"
}

log_info() {
    echo -e "${CYAN}[ℹ️  INFO]${NC} $1"
}

check_system_resources() {
    echo -e "\n${CYAN}═══ 🖥️  SYSTEM RESOURCES ═══${NC}"
    
    log_check "Checking system resources..."
    
    # CPU usage
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    if (( $(echo "$CPU_USAGE < 80" | bc -l) )); then
        log_success "CPU usage: ${CPU_USAGE}%"
    else
        log_warning "High CPU usage: ${CPU_USAGE}%"
    fi
    
    # Memory usage
    MEMORY_INFO=$(free -m)
    MEMORY_USED=$(echo "$MEMORY_INFO" | awk 'NR==2{print $3}')
    MEMORY_TOTAL=$(echo "$MEMORY_INFO" | awk 'NR==2{print $2}')
    MEMORY_PERCENT=$(echo "scale=1; $MEMORY_USED*100/$MEMORY_TOTAL" | bc)
    
    if (( $(echo "$MEMORY_PERCENT < 90" | bc -l) )); then
        log_success "Memory usage: ${MEMORY_PERCENT}% (${MEMORY_USED}MB/${MEMORY_TOTAL}MB)"
    else
        log_warning "High memory usage: ${MEMORY_PERCENT}%"
    fi
    
    # Disk usage
    DISK_USAGE=$(df -h / | awk 'NR==2{print $5}' | cut -d'%' -f1)
    if [ "$DISK_USAGE" -lt 90 ]; then
        log_success "Disk usage: ${DISK_USAGE}%"
    else
        log_warning "High disk usage: ${DISK_USAGE}%"
    fi
    
    # Load average
    LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | cut -d',' -f1 | tr -d ' ')
    log_info "Load average: $LOAD_AVG"
}

check_services() {
    echo -e "\n${CYAN}═══ 🔧 SYSTEM SERVICES ═══${NC}"
    
    # Nginx
    log_check "Checking Nginx service..."
    if systemctl is-active --quiet nginx; then
        log_success "Nginx is running"
    else
        log_error "Nginx is not running"
    fi
    
    # MySQL
    log_check "Checking MySQL service..."
    if systemctl is-active --quiet mysql; then
        log_success "MySQL is running"
    else
        log_error "MySQL is not running"
    fi
    
    # PM2
    log_check "Checking PM2 process..."
    if pm2 describe ult-fpeb-backend &>/dev/null; then
        PM2_STATUS=$(pm2 describe ult-fpeb-backend | grep -o 'online\|stopped\|errored' | head -1)
        if [ "$PM2_STATUS" = "online" ]; then
            log_success "PM2 process: $PM2_STATUS"
        else
            log_error "PM2 process: $PM2_STATUS"
        fi
    else
        log_error "PM2 process not found"
    fi
    
    # UFW Firewall
    log_check "Checking UFW firewall..."
    UFW_STATUS=$(sudo ufw status | grep "Status:" | awk '{print $2}')
    if [ "$UFW_STATUS" = "active" ]; then
        log_success "UFW firewall: active"
    else
        log_warning "UFW firewall: inactive"
    fi
}

check_network_connectivity() {
    echo -e "\n${CYAN}═══ 🌐 NETWORK CONNECTIVITY ═══${NC}"
    
    SERVER_IP=$(hostname -I | awk '{print $1}')
    
    # Frontend HTTP
    log_check "Testing frontend accessibility..."
    if curl -f -s -o /dev/null http://localhost/; then
        log_success "Frontend HTTP: accessible"
    else
        log_error "Frontend HTTP: not accessible"
    fi
    
    # API Health endpoint
    log_check "Testing API health endpoint..."
    if curl -f -s -o /dev/null http://localhost/api/health; then
        log_success "API health endpoint: responding"
    else
        log_error "API health endpoint: not responding"
    fi
    
    # Backend direct
    log_check "Testing backend direct connection..."
    if curl -f -s -o /dev/null http://localhost:3001/api/health; then
        log_success "Backend direct: accessible"
    else
        log_error "Backend direct: not accessible"
    fi
    
    # External connectivity
    log_check "Testing external connectivity..."
    if ping -c 1 google.com &>/dev/null; then
        log_success "External connectivity: available"
    else
        log_warning "External connectivity: limited"
    fi
    
    log_info "Server accessible at: http://$SERVER_IP/"
}

check_database() {
    echo -e "\n${CYAN}═══ 🗄️  DATABASE ═══${NC}"
    
    log_check "Testing database connection..."
    
    # Test connection (assuming password is stored or can be provided)
    if command -v mysql &>/dev/null; then
        # Test basic connection
        if mysql -u $DB_USER -p$DB_PASSWORD -e "USE $DB_NAME; SELECT 'Connection OK' as status;" &>/dev/null; then
            log_success "Database connection: working"
            
            # Check table counts
            TABLE_COUNT=$(mysql -u $DB_USER -p$DB_PASSWORD -e "USE $DB_NAME; SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$DB_NAME';" 2>/dev/null | tail -1)
            log_info "Database tables: $TABLE_COUNT"
            
            # Check if main tables exist
            MAIN_TABLES=("users" "visitors" "feedbacks")
            for table in "${MAIN_TABLES[@]}"; do
                if mysql -u $DB_USER -p$DB_PASSWORD -e "USE $DB_NAME; DESCRIBE $table;" &>/dev/null; then
                    log_success "Table '$table': exists"
                else
                    log_warning "Table '$table': missing"
                fi
            done
            
        else
            log_error "Database connection: failed"
        fi
    else
        log_warning "MySQL client not available for testing"
    fi
}

check_application_files() {
    echo -e "\n${CYAN}═══ 📁 APPLICATION FILES ═══${NC}"
    
    # Application directory
    log_check "Checking application directory..."
    if [ -d "$APP_DIR" ]; then
        log_success "Application directory: exists ($APP_DIR)"
    else
        log_error "Application directory: missing ($APP_DIR)"
    fi
    
    # Frontend directory
    log_check "Checking frontend directory..."
    if [ -d "$FRONTEND_DIR" ]; then
        log_success "Frontend directory: exists ($FRONTEND_DIR)"
    else
        log_error "Frontend directory: missing ($FRONTEND_DIR)"
    fi
    
    # Key files
    KEY_FILES=(
        "$APP_DIR/backend/server.js"
        "$APP_DIR/backend/.env"
        "$APP_DIR/backend/package.json"
        "$FRONTEND_DIR/index.html"
        "$APP_DIR/ecosystem.config.cjs"
    )
    
    for file in "${KEY_FILES[@]}"; do
        if [ -f "$file" ]; then
            log_success "File exists: $(basename $file)"
        else
            log_error "File missing: $(basename $file)"
        fi
    done
    
    # Uploads directory
    log_check "Checking uploads directory..."
    UPLOADS_DIR="$APP_DIR/backend/uploads"
    if [ -d "$UPLOADS_DIR" ]; then
        UPLOADS_SIZE=$(du -sh "$UPLOADS_DIR" | cut -f1)
        log_success "Uploads directory: exists ($UPLOADS_SIZE)"
    else
        log_warning "Uploads directory: missing"
    fi
    
    # Logs directory
    log_check "Checking logs directory..."
    LOGS_DIR="$APP_DIR/backend/logs"
    if [ -d "$LOGS_DIR" ]; then
        LOG_COUNT=$(find "$LOGS_DIR" -name "*.log" | wc -l)
        log_success "Logs directory: exists ($LOG_COUNT files)"
    else
        log_warning "Logs directory: missing"
    fi
}

check_security() {
    echo -e "\n${CYAN}═══ 🔒 SECURITY ═══${NC}"
    
    # File permissions
    log_check "Checking file permissions..."
    
    if [ -f "$APP_DIR/backend/.env" ]; then
        ENV_PERMS=$(stat -c "%a" "$APP_DIR/backend/.env")
        if [ "$ENV_PERMS" = "600" ] || [ "$ENV_PERMS" = "644" ]; then
            log_success "Environment file permissions: $ENV_PERMS"
        else
            log_warning "Environment file permissions: $ENV_PERMS (should be 600 or 644)"
        fi
    fi
    
    # Check for default passwords
    log_check "Checking for default credentials..."
    if [ -f "$APP_DIR/backend/.env" ]; then
        if grep -q "admin123\|password123\|default" "$APP_DIR/backend/.env" 2>/dev/null; then
            log_warning "Default credentials detected in .env file"
        else
            log_success "No obvious default credentials found"
        fi
    fi
    
    # Check SSL/TLS
    log_check "Checking SSL configuration..."
    if [ -f "/etc/nginx/sites-available/ult-fpeb" ]; then
        if grep -q "ssl_certificate" "/etc/nginx/sites-available/ult-fpeb"; then
            log_success "SSL configuration detected"
        else
            log_info "No SSL configuration (HTTP only)"
        fi
    fi
    
    # Check fail2ban
    log_check "Checking fail2ban..."
    if systemctl is-active --quiet fail2ban; then
        log_success "Fail2ban is active"
    else
        log_warning "Fail2ban is not active"
    fi
}

check_performance() {
    echo -e "\n${CYAN}═══ ⚡ PERFORMANCE ═══${NC}"
    
    # Response time test
    log_check "Testing response times..."
    
    # Frontend response time
    FRONTEND_TIME=$(curl -o /dev/null -s -w "%{time_total}" http://localhost/ 2>/dev/null || echo "0")
    if (( $(echo "$FRONTEND_TIME < 2.0" | bc -l) )); then
        log_success "Frontend response time: ${FRONTEND_TIME}s"
    else
        log_warning "Frontend response time: ${FRONTEND_TIME}s (slow)"
    fi
    
    # API response time
    API_TIME=$(curl -o /dev/null -s -w "%{time_total}" http://localhost/api/health 2>/dev/null || echo "0")
    if (( $(echo "$API_TIME < 1.0" | bc -l) )); then
        log_success "API response time: ${API_TIME}s"
    else
        log_warning "API response time: ${API_TIME}s (slow)"
    fi
    
    # PM2 memory usage
    if command -v pm2 &>/dev/null; then
        PM2_MEMORY=$(pm2 describe ult-fpeb-backend 2>/dev/null | grep -o "[0-9]*\.[0-9]* MB" | head -1 || echo "N/A")
        log_info "Backend memory usage: $PM2_MEMORY"
    fi
}

check_logs() {
    echo -e "\n${CYAN}═══ 📋 LOGS ANALYSIS ═══${NC}"
    
    # Check for recent errors
    log_check "Analyzing recent logs..."
    
    # Nginx error logs
    if [ -f "/var/log/nginx/ult-fpeb_error.log" ]; then
        ERROR_COUNT=$(tail -100 /var/log/nginx/ult-fpeb_error.log 2>/dev/null | grep -c "error" || echo "0")
        if [ "$ERROR_COUNT" -eq 0 ]; then
            log_success "Nginx errors (last 100 lines): none"
        else
            log_warning "Nginx errors (last 100 lines): $ERROR_COUNT"
        fi
    fi
    
    # PM2 logs
    if command -v pm2 &>/dev/null; then
        PM2_ERRORS=$(pm2 logs ult-fpeb-backend --lines 50 --nostream 2>/dev/null | grep -ci "error\|fail\|exception" || echo "0")
        if [ "$PM2_ERRORS" -eq 0 ]; then
            log_success "PM2 errors (last 50 lines): none"
        else
            log_warning "PM2 errors (last 50 lines): $PM2_ERRORS"
        fi
    fi
    
    # System logs
    SYSTEM_ERRORS=$(journalctl --since "1 hour ago" --no-pager | grep -ci "error\|fail\|critical" || echo "0")
    if [ "$SYSTEM_ERRORS" -lt 5 ]; then
        log_success "System errors (last hour): $SYSTEM_ERRORS"
    else
        log_warning "System errors (last hour): $SYSTEM_ERRORS"
    fi
}

generate_report() {
    echo -e "\n${CYAN}═══ 📊 VERIFICATION SUMMARY ═══${NC}"
    
    SERVER_IP=$(hostname -I | awk '{print $1}')
    
    echo
    echo -e "${BLUE}🖥️  System Information:${NC}"
    echo -e "   Server: $(hostname) ($SERVER_IP)"
    echo -e "   OS: $(lsb_release -d | cut -f2)"
    echo -e "   Uptime: $(uptime -p)"
    echo -e "   Load: $(uptime | awk -F'load average:' '{print $2}')"
    echo
    echo -e "${BLUE}🌐 Access Points:${NC}"
    echo -e "   Frontend: ${GREEN}http://$SERVER_IP/${NC}"
    echo -e "   API: ${GREEN}http://$SERVER_IP/api/${NC}"
    echo -e "   Health: ${GREEN}http://$SERVER_IP/health${NC}"
    echo
    echo -e "${BLUE}📊 Service Status:${NC}"
    echo -e "   Nginx: $(systemctl is-active nginx)"
    echo -e "   MySQL: $(systemctl is-active mysql)"
    echo -e "   PM2: $(pm2 describe ult-fpeb-backend &>/dev/null && echo "online" || echo "offline")"
    echo -e "   UFW: $(sudo ufw status | grep "Status:" | awk '{print $2}')"
    echo
    echo -e "${BLUE}🔧 Management Commands:${NC}"
    echo -e "   Status: ${YELLOW}ult status${NC}"
    echo -e "   Logs: ${YELLOW}ult logs${NC}"
    echo -e "   Restart: ${YELLOW}ult restart${NC}"
    echo
}

# Main verification function
main() {
    print_header
    
    log_info "Starting comprehensive system verification..."
    
    check_system_resources
    check_services
    check_network_connectivity
    check_database
    check_application_files
    check_security
    check_performance
    check_logs
    generate_report
    
    echo -e "${GREEN}🎉 Verification completed!${NC}"
    echo -e "${CYAN}Use this information to assess system health and performance.${NC}"
    echo
}

# Run main function
main "$@"
