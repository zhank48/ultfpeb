# ULT FPEB Visitor Management - Linux Server Deployment Guide

## Overview

This document provides comprehensive instructions for deploying the ULT FPEB Visitor Management System on Linux servers (Ubuntu/Debian) with automated SSL certificates for local IP addresses.

## Quick Start (Recommended)

For a fresh Ubuntu/Debian server, use the one-command deployment:

```bash
# Download and run the quick deployment script
sudo ./scripts/quick-deploy.sh [YOUR_LOCAL_IP]

# Example:
sudo ./scripts/quick-deploy.sh 192.168.1.100
```

This will automatically:
- Install Node.js, MySQL, Nginx, SSL certificates
- Configure the database and application
- Set up PM2 process management
- Configure firewall and security
- Create maintenance scripts

## Manual Deployment Steps

### 1. Prerequisites

- Fresh Ubuntu 20.04+ or Debian 11+ server
- Root access (sudo privileges)
- Minimum 2GB RAM, 20GB disk space
- Network access for package downloads

### 2. Step-by-Step Deployment

#### 2.1. Clone/Copy Project Files

```bash
# Copy project to server
scp -r ./ult-fpeb-project root@your-server:/root/
```

#### 2.2. Run Main Deployment Script

```bash
cd /root/ult-fpeb-project/scripts
chmod +x *.sh

# Run deployment with your local IP
sudo ./deploy-linux-server.sh 192.168.1.100
```

#### 2.3. Configure Environment (Optional)

```bash
# Configure for production (default)
sudo ./configure-environment.sh production 192.168.1.100

# Or configure for staging
sudo ./configure-environment.sh staging 192.168.1.100
```

### 3. Post-Deployment Configuration

#### 3.1. Access the Application

1. Add to your client's `/etc/hosts` file:
   ```
   192.168.1.100 ult-fpeb.local
   ```

2. Access via web browser:
   - **HTTPS (Recommended):** https://192.168.1.100 or https://ult-fpeb.local
   - **HTTP (Development):** http://192.168.1.100

#### 3.2. Default Login Credentials

- **Admin:** admin@ultfpeb.upi.edu / admin123
- **Receptionist:** receptionist@ultfpeb.upi.edu / receptionist123

**⚠️ IMPORTANT: Change these passwords immediately after first login!**

## Service Management

### Using the Service Manager

The deployment creates a unified service management tool:

```bash
# Check all services status
ult-service status all production

# Start all services
ult-service start all production

# Restart backend service
ult-service restart backend production

# View backend logs
ult-service logs backend production

# Create system backup
ult-service backup

# Update application
ult-service update

# Health check
ult-service health
```

### Available Commands

| Command | Description |
|---------|-------------|
| `start` | Start specified service(s) |
| `stop` | Stop specified service(s) |
| `restart` | Restart specified service(s) |
| `status` | Show service status |
| `logs` | Show service logs |
| `backup` | Create full system backup |
| `update` | Update application code |
| `health` | Perform health check |

### Available Services

| Service | Description |
|---------|-------------|
| `all` | All services |
| `backend` | Node.js API server |
| `frontend` | Frontend build/deployment |
| `nginx` | Web server and reverse proxy |
| `mysql` | Database server |
| `ssl` | SSL certificate management |

### Available Environments

| Environment | Description | Backend Port |
|-------------|-------------|--------------|
| `production` | Production deployment | 3001 |
| `staging` | Staging environment | 3002 |
| `development` | Development environment | 3003 |

## SSL Certificate Management

### Self-Signed Certificates (Default)

The deployment automatically creates self-signed SSL certificates for your local IP address. These certificates include:

- **Common Name (CN):** Your local IP address
- **Subject Alternative Names (SAN):** 
  - IP: Your local IP
  - DNS: ult-fpeb.local
  - DNS: localhost

### Regenerating SSL Certificates

```bash
# Regenerate SSL certificates
sudo ult-service restart ssl production

# Or manually:
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/server.key \
    -out /etc/nginx/ssl/server.crt \
    -subj "/C=ID/ST=West Java/L=Bandung/O=UPI/OU=FPEB/CN=192.168.1.100" \
    -addext "subjectAltName=IP:192.168.1.100,DNS:ult-fpeb.local,DNS:localhost"
```

### Using Let's Encrypt (Production)

For production deployments with public domain names:

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get Let's Encrypt certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal (already configured)
sudo crontab -l | grep certbot
```

## Database Management

### Database Credentials

Credentials are stored securely in `/root/.mysql_credentials`:

```bash
# View database credentials
sudo cat /root/.mysql_credentials
```

### Database Operations

```bash
# Connect to database
sudo mysql -u root -p$(grep MYSQL_ROOT_PASSWORD /root/.mysql_credentials | cut -d= -f2 | tr -d '"')

# Application database connection
sudo mysql -u ult_fpeb_user -p$(grep MYSQL_PASSWORD /root/.mysql_credentials | cut -d= -f2 | tr -d '"') ult_fpeb_prod

# Run database migrations
cd /opt/ult-fpeb && sudo -u ult-deploy npm run setup-db

# Create database backup
sudo /usr/local/bin/ult-backup
```

## File Structure

After deployment, the file structure will be:

```
/opt/ult-fpeb/                     # Application directory
├── backend/                       # Backend Node.js application
│   ├── src/                      # Source code
│   ├── uploads/                  # File uploads
│   └── .env                      # Backend environment config
├── frontend/                     # Frontend React application
│   ├── dist/                     # Built frontend files
│   └── .env                      # Frontend environment config
├── logs/                         # Application logs
├── ecosystem.config.js           # PM2 configuration
└── ecosystem.production.config.js # Environment-specific PM2 config

/etc/nginx/
├── sites-available/ult-fpeb      # Nginx configuration
├── sites-enabled/ult-fpeb        # Enabled site
└── ssl/                          # SSL certificates
    ├── server.crt
    └── server.key

/var/backups/ult-fpeb/            # Backup directory
/usr/local/bin/                   # Management scripts
├── ult-backup
├── ult-update
├── ult-status
└── ult-service
```

## Firewall Configuration

The deployment configures UFW firewall with the following rules:

```bash
# View current firewall status
sudo ufw status

# Default rules created:
# - Allow SSH (22/tcp)
# - Allow HTTP (80/tcp)
# - Allow HTTPS (443/tcp)
# - Allow SSH from local networks
```

## Monitoring and Logs

### Log Locations

| Service | Log Location |
|---------|--------------|
| Backend | `/opt/ult-fpeb/logs/backend-*.log` |
| Nginx Access | `/var/log/nginx/ult-fpeb-*-access.log` |
| Nginx Error | `/var/log/nginx/ult-fpeb-*-error.log` |
| MySQL | `/var/log/mysql/error.log` |
| System | `/var/log/syslog` |

### PM2 Monitoring

```bash
# View PM2 processes
sudo -u ult-deploy pm2 status

# View detailed process info
sudo -u ult-deploy pm2 show ult-fpeb-backend-production

# View real-time logs
sudo -u ult-deploy pm2 logs ult-fpeb-backend-production

# Monitor with web interface
sudo -u ult-deploy pm2 web
```

## Backup and Recovery

### Automated Backups

The deployment sets up daily automated backups:

```bash
# View backup cron job
sudo cat /etc/cron.d/ult-backup

# Manual backup
sudo /usr/local/bin/ult-backup

# List backups
ls -la /var/backups/ult-fpeb/
```

### Backup Contents

Each backup includes:
- Database dump (SQL)
- Application files (tar.gz)
- Configuration files
- System information

### Recovery Process

```bash
# Stop services
sudo ult-service stop all production

# Restore database
sudo mysql -u root -p < /var/backups/ult-fpeb/db_YYYYMMDD_HHMMSS.sql

# Restore application files
cd /opt && sudo tar -xzf /var/backups/ult-fpeb/app_YYYYMMDD_HHMMSS.tar.gz

# Start services
sudo ult-service start all production
```

## Troubleshooting

### Common Issues

#### 1. Services Not Starting

```bash
# Check service status
sudo ult-service status all production

# Check system resources
free -h
df -h

# Check logs
sudo ult-service logs backend production
sudo ult-service logs nginx production
```

#### 2. Database Connection Issues

```bash
# Test database connection
sudo mysql -u ult_fpeb_user -p ult_fpeb_prod

# Check MySQL service
sudo systemctl status mysql

# Reset database password
sudo mysql -u root -p -e "ALTER USER 'ult_fpeb_user'@'localhost' IDENTIFIED BY 'new_password';"
```

#### 3. SSL Certificate Issues

```bash
# Check certificate validity
sudo openssl x509 -in /etc/nginx/ssl/server.crt -text -noout

# Regenerate certificates
sudo ult-service restart ssl production

# Test HTTPS connection
curl -k https://localhost/health
```

#### 4. Port Conflicts

```bash
# Check what's using ports
sudo netstat -tlnp | grep :3001
sudo netstat -tlnp | grep :443

# Kill conflicting processes
sudo kill -9 <PID>
```

### Health Check Script

```bash
#!/bin/bash
# Run comprehensive health check
sudo ult-service health production

# Check specific endpoints
curl -k https://localhost/health
curl http://localhost:3001/api/health
```

## Performance Optimization

### For Production Environments

```bash
# Optimize MySQL
sudo mysql_secure_installation

# Configure MySQL for production
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
# Add:
# innodb_buffer_pool_size = 512M
# max_connections = 100

# Restart MySQL
sudo systemctl restart mysql

# Optimize Nginx
sudo nano /etc/nginx/nginx.conf
# Adjust worker_processes and worker_connections

# Enable Nginx caching (already configured)
sudo nginx -s reload
```

### Monitoring Resources

```bash
# Install htop for better monitoring
sudo apt install htop

# Monitor system resources
htop

# Monitor disk usage
sudo du -sh /opt/ult-fpeb/*
sudo du -sh /var/log/*
sudo du -sh /var/backups/*
```

## Security Considerations

### Implemented Security Measures

1. **Firewall:** UFW configured with minimal required ports
2. **SSL/TLS:** HTTPS encryption for all connections
3. **Database:** Dedicated user with limited privileges
4. **File Permissions:** Proper file ownership and permissions
5. **Process Isolation:** Services run under dedicated user account
6. **Input Validation:** Application-level input sanitization
7. **Rate Limiting:** Nginx rate limiting configured

### Additional Security Recommendations

```bash
# Update system regularly
sudo apt update && sudo apt upgrade

# Configure fail2ban for SSH protection
sudo apt install fail2ban

# Regular security audits
sudo lynis audit system

# Monitor log files
sudo logwatch --detail Med --mailto admin@example.com --service All --range today
```

## Scaling and High Availability

### Horizontal Scaling

For multiple server deployments:

1. **Database:** Use MySQL master-slave replication
2. **Load Balancer:** Configure Nginx upstream servers
3. **Shared Storage:** Use NFS for file uploads
4. **Session Management:** Configure Redis for session storage

### Vertical Scaling

```bash
# Increase PM2 instances for backend
sudo -u ult-deploy pm2 scale ult-fpeb-backend-production +2

# Monitor performance
sudo -u ult-deploy pm2 monit
```

## Updates and Maintenance

### Application Updates

```bash
# Automated update process
sudo ult-service update

# Manual update process
sudo ult-service stop backend production
cd /opt/ult-fpeb
sudo -u ult-deploy git pull origin main
sudo -u ult-deploy npm install
sudo -u ult-deploy npm run build
sudo ult-service start backend production
```

### System Maintenance

```bash
# Weekly maintenance script
#!/bin/bash
sudo apt update && sudo apt upgrade -y
sudo ult-service restart all production
sudo /usr/local/bin/ult-backup
sudo systemctl restart mysql
sudo systemctl restart nginx
```

## Support and Documentation

- **Application Logs:** `/opt/ult-fpeb/logs/`
- **System Logs:** `/var/log/syslog`
- **Configuration:** `/opt/ult-fpeb/.env`
- **Database Schema:** `/opt/ult-fpeb/backend/sql/`

For additional support, check:
- Application health: `sudo ult-service health production`
- Service status: `sudo ult-service status all production`
- Recent logs: `sudo ult-service logs all production`