#!/bin/bash

#===============================================================================
# ULT FPEB Deployment Verification Script
# 
# This script verifies that the ULT FPEB application was deployed correctly
#===============================================================================

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

APP_NAME="ult-fpeb"
DOMAIN="localhost"

echo -e "${BLUE}🔍 ULT FPEB Deployment Verification${NC}"
echo "=================================="

# Check system services
echo -e "\n${BLUE}📊 System Services${NC}"
services=("nginx" "mysql" "$APP_NAME")
for service in "${services[@]}"; do
    if systemctl is-active --quiet "$service"; then
        echo -e "  ✅ $service: ${GREEN}Running${NC}"
    else
        echo -e "  ❌ $service: ${RED}Not running${NC}"
    fi
done

# Check PM2 processes
echo -e "\n${BLUE}🔄 PM2 Processes${NC}"
if sudo -u "$APP_NAME" pm2 list 2>/dev/null | grep -q "online"; then
    echo -e "  ✅ PM2: ${GREEN}Application running${NC}"
    sudo -u "$APP_NAME" pm2 list --no-color | grep -E "(name|online|stopped)"
else
    echo -e "  ❌ PM2: ${RED}Application not running${NC}"
fi

# Check database connection
echo -e "\n${BLUE}💾 Database Connection${NC}"
if mysql -u ult_fpeb_user -pULT_FPEB_2025_SecurePass! -h localhost ult_fpeb_db -e "SELECT 1;" &>/dev/null; then
    echo -e "  ✅ Database: ${GREEN}Connected${NC}"
    
    # Check table count
    table_count=$(mysql -u ult_fpeb_user -pULT_FPEB_2025_SecurePass! -h localhost ult_fpeb_db -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'ult_fpeb_db';" -s -N)
    echo -e "  📊 Tables: ${BLUE}$table_count found${NC}"
    
    # Check user count
    user_count=$(mysql -u ult_fpeb_user -pULT_FPEB_2025_SecurePass! -h localhost ult_fpeb_db -e "SELECT COUNT(*) FROM users;" -s -N 2>/dev/null)
    if [[ $? -eq 0 ]]; then
        echo -e "  👥 Users: ${BLUE}$user_count created${NC}"
    fi
else
    echo -e "  ❌ Database: ${RED}Connection failed${NC}"
fi

# Check web server response
echo -e "\n${BLUE}🌐 Web Server${NC}"
http_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null)
if [[ "$http_status" =~ ^(200|301|302)$ ]]; then
    echo -e "  ✅ HTTP: ${GREEN}Server responding ($http_status)${NC}"
else
    echo -e "  ❌ HTTP: ${RED}Server not responding ($http_status)${NC}"
fi

# Check API endpoint
api_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health 2>/dev/null)
if [[ "$api_status" =~ ^(200|301|302)$ ]]; then
    echo -e "  ✅ API: ${GREEN}Endpoint responding ($api_status)${NC}"
else
    echo -e "  ❌ API: ${RED}Endpoint not responding ($api_status)${NC}"
fi

# Check SSL certificate (if not localhost)
if [[ "$DOMAIN" != "localhost" && "$DOMAIN" != "127.0.0.1" ]]; then
    echo -e "\n${BLUE}🔒 SSL Certificate${NC}"
    if openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" </dev/null 2>/dev/null | openssl x509 -noout -dates 2>/dev/null; then
        echo -e "  ✅ SSL: ${GREEN}Certificate valid${NC}"
    else
        echo -e "  ❌ SSL: ${RED}Certificate invalid or not found${NC}"
    fi
fi

# Check ports
echo -e "\n${BLUE}🔌 Port Status${NC}"
ports=("80:HTTP" "443:HTTPS" "3001:Backend" "3306:MySQL")
for port_info in "${ports[@]}"; do
    port="${port_info%:*}"
    name="${port_info#*:}"
    if netstat -tulpn 2>/dev/null | grep -q ":$port "; then
        echo -e "  ✅ Port $port ($name): ${GREEN}Open${NC}"
    else
        echo -e "  ⚠️  Port $port ($name): ${YELLOW}Not listening${NC}"
    fi
done

# Check firewall
echo -e "\n${BLUE}🛡️  Firewall Status${NC}"
if ufw status 2>/dev/null | grep -q "Status: active"; then
    echo -e "  ✅ UFW: ${GREEN}Active${NC}"
    ufw status numbered 2>/dev/null | grep -E "(80|443|22)" | head -3
else
    echo -e "  ⚠️  UFW: ${YELLOW}Inactive${NC}"
fi

# Check disk space
echo -e "\n${BLUE}💽 Disk Usage${NC}"
disk_usage=$(df -h /var/www 2>/dev/null | tail -1 | awk '{print $5}' | sed 's/%//')
if [[ $disk_usage -lt 80 ]]; then
    echo -e "  ✅ Disk: ${GREEN}${disk_usage}% used${NC}"
elif [[ $disk_usage -lt 90 ]]; then
    echo -e "  ⚠️  Disk: ${YELLOW}${disk_usage}% used${NC}"
else
    echo -e "  ❌ Disk: ${RED}${disk_usage}% used (Warning!)${NC}"
fi

# Check memory usage
echo -e "\n${BLUE}🧠 Memory Usage${NC}"
memory_info=$(free | grep Mem)
total_mem=$(echo $memory_info | awk '{print $2}')
used_mem=$(echo $memory_info | awk '{print $3}')
memory_percent=$((used_mem * 100 / total_mem))

if [[ $memory_percent -lt 80 ]]; then
    echo -e "  ✅ Memory: ${GREEN}${memory_percent}% used${NC}"
elif [[ $memory_percent -lt 90 ]]; then
    echo -e "  ⚠️  Memory: ${YELLOW}${memory_percent}% used${NC}"
else
    echo -e "  ❌ Memory: ${RED}${memory_percent}% used (Warning!)${NC}"
fi

# Check log files
echo -e "\n${BLUE}📝 Log Files${NC}"
log_dirs=("/var/log/$APP_NAME" "/var/log/nginx" "/var/log/mysql")
for log_dir in "${log_dirs[@]}"; do
    if [[ -d "$log_dir" && $(ls -A "$log_dir" 2>/dev/null) ]]; then
        echo -e "  ✅ Logs: ${GREEN}$log_dir ($(ls $log_dir | wc -l) files)${NC}"
    else
        echo -e "  ⚠️  Logs: ${YELLOW}$log_dir (empty or missing)${NC}"
    fi
done

# Final summary
echo -e "\n${BLUE}📋 Summary${NC}"
echo "=================================="

# Count successful checks
checks_passed=0
total_checks=0

# You can extend this with more detailed checking logic
if systemctl is-active --quiet nginx; then ((checks_passed++)); fi; ((total_checks++))
if systemctl is-active --quiet mysql; then ((checks_passed++)); fi; ((total_checks++))
if systemctl is-active --quiet "$APP_NAME"; then ((checks_passed++)); fi; ((total_checks++))

echo -e "System Health: $checks_passed/$total_checks services running"

if [[ $checks_passed -eq $total_checks ]]; then
    echo -e "${GREEN}🎉 Deployment appears to be successful!${NC}"
    echo -e "${BLUE}Next steps:${NC}"
    echo -e "  • Visit http://localhost to access the application"
    echo -e "  • Login with default credentials"
    echo -e "  • Change default passwords"
    echo -e "  • Configure domain name and SSL if needed"
else
    echo -e "${YELLOW}⚠️  Some issues detected. Please check the output above.${NC}"
    echo -e "${BLUE}Troubleshooting:${NC}"
    echo -e "  • Check service logs: sudo journalctl -u <service-name> -f"
    echo -e "  • Check PM2 logs: sudo -u $APP_NAME pm2 logs"
    echo -e "  • Check Nginx config: sudo nginx -t"
fi

echo -e "\n${BLUE}💡 Useful commands:${NC}"
echo -e "  • View this verification: sudo ./verify-deployment.sh"
echo -e "  • Check PM2 status: sudo -u $APP_NAME pm2 status"
echo -e "  • Restart services: sudo systemctl restart nginx mysql $APP_NAME"
echo -e "  • View logs: sudo -u $APP_NAME pm2 logs"
