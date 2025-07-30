#!/bin/bash

# ==============================================
# ULT FPEB Service Management Script
# ==============================================
# 
# Unified service management for the ULT FPEB application
# Manages: PM2 processes, Nginx, MySQL, SSL certificates
# 
# Usage: ./service-manager.sh [action] [service] [environment]
# Actions: start, stop, restart, status, logs, backup, update
# Services: all, backend, frontend, nginx, mysql, ssl
# ==============================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
APP_DIR="/opt/ult-fpeb"
DEPLOY_USER="ult-deploy"
BACKUP_DIR="/var/backups/ult-fpeb"

# Default values
ACTION="${1:-status}"
SERVICE="${2:-all}"
ENVIRONMENT="${3:-production}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Check if running as root for system services
check_permissions() {
    if [[ "$SERVICE" =~ ^(nginx|mysql|ssl|all)$ ]] && [[ $EUID -ne 0 ]]; then
        error "Managing $SERVICE requires root privileges. Use sudo."
    fi
}

# Get PM2 port for environment
get_backend_port() {
    case $ENVIRONMENT in
        "staging") echo "3002" ;;
        "development") echo "3003" ;;
        *) echo "3001" ;;
    esac
}

# Backend service management
manage_backend() {
    local action=$1
    local backend_port=$(get_backend_port)
    
    case $action in
        "start")
            log "Starting backend service for $ENVIRONMENT environment..."
            if [[ -f "$APP_DIR/ecosystem.$ENVIRONMENT.config.js" ]]; then
                sudo -u "$DEPLOY_USER" pm2 start "$APP_DIR/ecosystem.$ENVIRONMENT.config.js"
            else
                sudo -u "$DEPLOY_USER" pm2 start "$APP_DIR/backend/src/index.js" \
                    --name "ult-fpeb-backend-$ENVIRONMENT" \
                    --env "$ENVIRONMENT"
            fi
            ;;
        "stop")
            log "Stopping backend service..."
            sudo -u "$DEPLOY_USER" pm2 stop "ult-fpeb-backend-$ENVIRONMENT" || true
            ;;
        "restart")
            log "Restarting backend service..."
            sudo -u "$DEPLOY_USER" pm2 restart "ult-fpeb-backend-$ENVIRONMENT" || manage_backend start
            ;;
        "status")
            info "Backend service status:"
            sudo -u "$DEPLOY_USER" pm2 show "ult-fpeb-backend-$ENVIRONMENT" || echo "Service not running"
            echo
            info "Backend port check:"
            if netstat -tlnp 2>/dev/null | grep ":$backend_port " >/dev/null; then
                echo "✓ Backend is listening on port $backend_port"
            else
                echo "✗ Backend is not listening on port $backend_port"
            fi
            ;;
        "logs")
            log "Showing backend logs..."
            sudo -u "$DEPLOY_USER" pm2 logs "ult-fpeb-backend-$ENVIRONMENT" --lines 50
            ;;
    esac
}

# Frontend service management (build and deployment)
manage_frontend() {
    local action=$1
    
    case $action in
        "start"|"restart")
            log "Building frontend for $ENVIRONMENT environment..."
            cd "$APP_DIR"
            sudo -u "$DEPLOY_USER" npm run build
            log "Frontend built and deployed to Nginx"
            ;;
        "status")
            info "Frontend status:"
            if [[ -d "$APP_DIR/frontend/dist" ]] && [[ -f "$APP_DIR/frontend/dist/index.html" ]]; then
                echo "✓ Frontend build exists"
                echo "Build date: $(stat -c %y "$APP_DIR/frontend/dist/index.html")"
            else
                echo "✗ Frontend build not found"
            fi
            ;;
        "logs")
            log "Showing Nginx access logs for frontend..."
            tail -n 50 "/var/log/nginx/ult-fpeb-$ENVIRONMENT-access.log" 2>/dev/null || echo "No logs found"
            ;;
    esac
}

# Nginx service management
manage_nginx() {
    local action=$1
    
    case $action in
        "start")
            log "Starting Nginx..."
            systemctl start nginx
            ;;
        "stop")
            log "Stopping Nginx..."
            systemctl stop nginx
            ;;
        "restart")
            log "Restarting Nginx..."
            nginx -t && systemctl restart nginx
            ;;
        "status")
            info "Nginx status:"
            systemctl status nginx --no-pager -l
            echo
            info "Nginx configuration test:"
            nginx -t
            echo
            info "Active sites:"
            ls -la /etc/nginx/sites-enabled/
            ;;
        "logs")
            log "Showing Nginx logs..."
            echo "=== Error Logs ==="
            tail -n 25 /var/log/nginx/error.log 2>/dev/null || echo "No error logs"
            echo
            echo "=== Access Logs ==="
            tail -n 25 "/var/log/nginx/ult-fpeb-$ENVIRONMENT-access.log" 2>/dev/null || echo "No access logs"
            ;;
    esac
}

# MySQL service management
manage_mysql() {
    local action=$1
    
    case $action in
        "start")
            log "Starting MySQL..."
            systemctl start mysql
            ;;
        "stop")
            log "Stopping MySQL..."
            systemctl stop mysql
            ;;
        "restart")
            log "Restarting MySQL..."
            systemctl restart mysql
            ;;
        "status")
            info "MySQL status:"
            systemctl status mysql --no-pager -l
            echo
            info "MySQL connection test:"
            if [[ -f /root/.mysql_credentials ]]; then
                source /root/.mysql_credentials
                if mysql -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" -e "SELECT 1;" >/dev/null 2>&1; then
                    echo "✓ Database connection successful"
                    mysql -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" -e "SELECT 
                        COUNT(*) as total_visitors,
                        COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as active_visitors,
                        COUNT(CASE WHEN DATE(check_in_time) = CURDATE() THEN 1 END) as today_visitors
                        FROM visitors;" "$MYSQL_DATABASE" 2>/dev/null || echo "Could not fetch visitor stats"
                else
                    echo "✗ Database connection failed"
                fi
            else
                echo "✗ MySQL credentials not found"
            fi
            ;;
        "logs")
            log "Showing MySQL logs..."
            tail -n 50 /var/log/mysql/error.log 2>/dev/null || echo "No MySQL logs found"
            ;;
    esac
}

# SSL certificate management
manage_ssl() {
    local action=$1
    local local_ip=$(hostname -I | awk '{print $1}')
    
    case $action in
        "start"|"restart")
            log "Regenerating SSL certificates..."
            openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
                -keyout /etc/nginx/ssl/server.key \
                -out /etc/nginx/ssl/server.crt \
                -subj "/C=ID/ST=West Java/L=Bandung/O=UPI/OU=FPEB/CN=$local_ip" \
                -addext "subjectAltName=IP:$local_ip,DNS:ult-fpeb.local,DNS:localhost"
            
            chmod 600 /etc/nginx/ssl/server.key
            chmod 644 /etc/nginx/ssl/server.crt
            
            # Restart nginx to use new certificates
            systemctl restart nginx
            log "SSL certificates regenerated"
            ;;
        "status")
            info "SSL certificate status:"
            if [[ -f /etc/nginx/ssl/server.crt ]]; then
                echo "✓ SSL certificate exists"
                echo "Certificate details:"
                openssl x509 -in /etc/nginx/ssl/server.crt -text -noout | grep -E "(Subject:|Not Before|Not After|DNS:|IP Address:)" || true
            else
                echo "✗ SSL certificate not found"
            fi
            ;;
    esac
}

# System-wide backup
perform_backup() {
    log "Creating system backup..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_path="$BACKUP_DIR/full_backup_$timestamp"
    
    mkdir -p "$backup_path"
    
    # Database backup
    if [[ -f /root/.mysql_credentials ]]; then
        source /root/.mysql_credentials
        log "Backing up database..."
        mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" > "$backup_path/database.sql"
        log "Database backup completed"
    fi
    
    # Application files backup
    log "Backing up application files..."
    tar -czf "$backup_path/application.tar.gz" \
        -C /opt ult-fpeb \
        --exclude=node_modules \
        --exclude=logs \
        --exclude='*.log'
    
    # Configuration backup
    log "Backing up configuration files..."
    mkdir -p "$backup_path/config"
    cp -r /etc/nginx/sites-available/ult-fpeb* "$backup_path/config/" 2>/dev/null || true
    cp /etc/nginx/ssl/* "$backup_path/config/" 2>/dev/null || true
    
    # System info
    cat > "$backup_path/system_info.txt" << EOF
Backup Date: $(date)
Environment: $ENVIRONMENT
Server IP: $(hostname -I | awk '{print $1}')
OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2 | tr -d '"')
Disk Usage: $(df -h / | tail -1)
Memory: $(free -h | grep Mem:)
EOF
    
    log "Backup completed: $backup_path"
    
    # Clean old backups (keep last 7 days)
    find "$BACKUP_DIR" -name "full_backup_*" -mtime +7 -exec rm -rf {} \; 2>/dev/null || true
}

# Application update
perform_update() {
    log "Updating ULT FPEB application..."
    
    # Stop services
    manage_backend stop
    
    # Backup before update
    perform_backup
    
    # Update code (if using git)
    cd "$APP_DIR"
    if [[ -d .git ]]; then
        log "Pulling latest code from git..."
        sudo -u "$DEPLOY_USER" git pull origin main
    fi
    
    # Install dependencies
    log "Installing dependencies..."
    sudo -u "$DEPLOY_USER" npm install
    
    # Build frontend
    log "Building frontend..."
    sudo -u "$DEPLOY_USER" npm run build
    
    # Database migrations (if any)
    log "Running database migrations..."
    sudo -u "$DEPLOY_USER" npm run setup-db 2>/dev/null || true
    
    # Start services
    manage_backend start
    manage_nginx restart
    
    log "Update completed successfully"
}

# Health check
perform_health_check() {
    log "Performing health check..."
    
    local issues=0
    
    # Check backend
    local backend_port=$(get_backend_port)
    if curl -s "http://localhost:$backend_port/api/health" >/dev/null; then
        echo "✓ Backend API is responding"
    else
        echo "✗ Backend API is not responding"
        ((issues++))
    fi
    
    # Check frontend
    if curl -s "https://localhost/health" -k >/dev/null; then
        echo "✓ Frontend is accessible"
    else
        echo "✗ Frontend is not accessible"
        ((issues++))
    fi
    
    # Check database
    if [[ -f /root/.mysql_credentials ]]; then
        source /root/.mysql_credentials
        if mysql -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" -e "SELECT 1;" >/dev/null 2>&1; then
            echo "✓ Database is accessible"
        else
            echo "✗ Database is not accessible"
            ((issues++))
        fi
    fi
    
    # Check disk space
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
    if [[ $disk_usage -lt 90 ]]; then
        echo "✓ Disk space OK ($disk_usage% used)"
    else
        echo "⚠ Disk space warning ($disk_usage% used)"
        ((issues++))
    fi
    
    # Check memory
    local mem_usage=$(free | grep Mem: | awk '{print int($3/$2 * 100)}')
    if [[ $mem_usage -lt 90 ]]; then
        echo "✓ Memory usage OK ($mem_usage% used)"
    else
        echo "⚠ Memory usage warning ($mem_usage% used)"
    fi
    
    if [[ $issues -eq 0 ]]; then
        log "All health checks passed"
        return 0
    else
        warn "$issues issues found"
        return 1
    fi
}

# Show system status
show_status() {
    info "=== ULT FPEB System Status ==="
    echo
    
    case $SERVICE in
        "backend")
            manage_backend status
            ;;
        "frontend") 
            manage_frontend status
            ;;
        "nginx")
            manage_nginx status
            ;;
        "mysql")
            manage_mysql status
            ;;
        "ssl")
            manage_ssl status
            ;;
        "all")
            manage_backend status
            echo
            manage_frontend status
            echo
            manage_nginx status
            echo
            manage_mysql status
            echo
            manage_ssl status
            echo
            perform_health_check
            ;;
    esac
}

# Main service management
main() {
    log "ULT FPEB Service Manager - Action: $ACTION, Service: $SERVICE, Environment: $ENVIRONMENT"
    
    check_permissions
    
    case $ACTION in
        "start"|"stop"|"restart")
            case $SERVICE in
                "backend")
                    manage_backend "$ACTION"
                    ;;
                "frontend")
                    manage_frontend "$ACTION"
                    ;;
                "nginx")
                    manage_nginx "$ACTION"
                    ;;
                "mysql")
                    manage_mysql "$ACTION"
                    ;;
                "ssl")
                    manage_ssl "$ACTION"
                    ;;
                "all")
                    if [[ "$ACTION" == "start" ]]; then
                        manage_mysql start
                        sleep 2
                        manage_backend start
                        sleep 2
                        manage_frontend start
                        manage_nginx start
                    elif [[ "$ACTION" == "stop" ]]; then
                        manage_nginx stop
                        manage_backend stop
                        manage_mysql stop
                    else # restart
                        manage_mysql restart
                        sleep 2
                        manage_backend restart
                        sleep 2
                        manage_frontend restart
                        manage_nginx restart
                    fi
                    ;;
                *)
                    error "Unknown service: $SERVICE"
                    ;;
            esac
            ;;
        "status")
            show_status
            ;;
        "logs")
            case $SERVICE in
                "backend")
                    manage_backend logs
                    ;;
                "frontend"|"nginx")
                    manage_nginx logs
                    ;;
                "mysql")
                    manage_mysql logs
                    ;;
                "all")
                    echo "=== Backend Logs ==="
                    manage_backend logs | head -20
                    echo
                    echo "=== Nginx Logs ==="
                    manage_nginx logs | head -20
                    ;;
                *)
                    error "Cannot show logs for service: $SERVICE"
                    ;;
            esac
            ;;
        "backup")
            perform_backup
            ;;
        "update")
            perform_update
            ;;
        "health")
            perform_health_check
            ;;
        *)
            error "Unknown action: $ACTION"
            echo
            echo "Usage: $0 [action] [service] [environment]"
            echo "Actions: start, stop, restart, status, logs, backup, update, health"
            echo "Services: all, backend, frontend, nginx, mysql, ssl"
            echo "Environments: production, staging, development"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"