# 🚀 ULT FPEB Ubuntu Server Deployment Guide

## 📋 Overview

Panduan lengkap untuk deployment otomatis sistem ULT FPEB ke Ubuntu Server dengan MySQL, Nginx, PM2, dan SSL certificate.

## 🎯 Features

### ✅ Automated Installation
- **System packages**: Node.js, MySQL, Nginx, PM2, Certbot
- **Security tools**: UFW firewall, Fail2ban, SSL certificates
- **Process management**: PM2 with cluster mode and auto-restart
- **Reverse proxy**: Nginx with optimization and security headers

### ✅ Production Ready
- **Database**: MySQL with secure configuration
- **Environment**: Production environment variables
- **SSL**: Automatic Let's Encrypt certificate
- **Logging**: Comprehensive application and error logs
- **Monitoring**: Health checks and status monitoring

### ✅ Security Features
- **Firewall**: UFW with restricted access
- **SSL/TLS**: HTTPS with strong ciphers
- **Headers**: Security headers (HSTS, CSP, etc.)
- **Access control**: Restricted file access
- **User isolation**: Dedicated application user

## 🔧 Prerequisites

### Server Requirements
- **OS**: Ubuntu 20.04+ LTS
- **RAM**: Minimum 2GB (4GB recommended)
- **Storage**: Minimum 20GB free space
- **CPU**: 2+ cores recommended
- **Network**: Public IP address for SSL setup

### Access Requirements
- **Root access**: sudo privileges required
- **Domain name**: For SSL certificate (optional)
- **Firewall**: Ports 80, 443, 22 accessible

## 🚀 Quick Deployment

### 1. Download and Prepare

```bash
# Clone or download the ULT FPEB project
git clone <repository-url> ult-fpeb
cd ult-fpeb

# Make deployment script executable
chmod +x deploy-ubuntu.sh
```

### 2. Configure Deployment (Optional)

Edit `deploy-config.env` to customize settings:

```bash
nano deploy-config.env
```

Key settings to change:
- `DOMAIN`: Your domain name
- `DB_PASSWORD`: Strong database password
- `SSL_EMAIL`: Your email for SSL certificate

### 3. Run Deployment

```bash
# Run as root or with sudo
sudo ./deploy-ubuntu.sh
```

The script will automatically:
1. ✅ Update system packages
2. ✅ Install Node.js, MySQL, Nginx
3. ✅ Configure database with secure settings
4. ✅ Deploy application code
5. ✅ Install dependencies and build frontend
6. ✅ Configure PM2 process management
7. ✅ Setup Nginx reverse proxy
8. ✅ Configure firewall and security
9. ✅ Setup SSL certificate (if domain provided)
10. ✅ Verify deployment and provide summary

## 📁 Directory Structure

```
/var/www/ult-fpeb/
├── backend/                 # Backend API server
│   ├── src/                # Source code
│   ├── server.js           # Main server file
│   └── .env               # Environment variables
├── frontend/              # Frontend React app
│   └── dist/             # Built production files
├── scripts/              # Deployment and utility scripts
├── uploads/              # File uploads directory
├── ecosystem.config.js   # PM2 configuration
└── package.json         # Project dependencies
```

## 🔧 Configuration Files

### Nginx Configuration
- **Location**: `/etc/nginx/sites-available/ult-fpeb`
- **Features**: Reverse proxy, static file serving, security headers
- **SSL**: Automatic HTTPS redirect

### PM2 Configuration
- **Location**: `/var/www/ult-fpeb/ecosystem.config.js`
- **Mode**: Cluster mode with auto-scaling
- **Logs**: `/var/log/ult-fpeb/`

### Database Configuration
- **Host**: localhost
- **Database**: ult_fpeb_db
- **User**: ult_fpeb_user
- **Encoding**: utf8mb4_unicode_ci

## 🔐 Security Features

### Firewall Rules
```bash
# Check firewall status
sudo ufw status

# Allowed ports:
# 22/tcp (SSH)
# 80,443/tcp (HTTP/HTTPS)
# 3306/tcp (MySQL - localhost only)
```

### SSL Certificate
- **Provider**: Let's Encrypt (Certbot)
- **Auto-renewal**: Configured automatically
- **Security**: Strong TLS configuration

### Application Security
- **Headers**: CSP, HSTS, X-Frame-Options
- **File access**: Restricted sensitive files
- **Process isolation**: Dedicated user account

## 📊 Monitoring and Management

### Service Status
```bash
# Check all services
sudo systemctl status nginx mysql ult-fpeb

# Check PM2 status
sudo -u ult-fpeb pm2 status
sudo -u ult-fpeb pm2 monit
```

### View Logs
```bash
# Application logs
sudo -u ult-fpeb pm2 logs

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -u ult-fpeb -f
```

### Restart Services
```bash
# Restart application
sudo systemctl restart ult-fpeb

# Restart Nginx
sudo systemctl restart nginx

# Restart MySQL
sudo systemctl restart mysql

# PM2 operations
sudo -u ult-fpeb pm2 restart all
sudo -u ult-fpeb pm2 reload all
```

## 🔄 Backup and Maintenance

### Database Backup
```bash
# Create backup
sudo mysqldump -u ult_fpeb_user -p ult_fpeb_db > backup_$(date +%Y%m%d).sql

# Restore backup
sudo mysql -u ult_fpeb_user -p ult_fpeb_db < backup_file.sql
```

### Application Update
```bash
# Stop application
sudo systemctl stop ult-fpeb

# Update code (example with git)
cd /var/www/ult-fpeb
sudo git pull origin main

# Install dependencies
sudo -u ult-fpeb npm install --production
cd frontend && sudo -u ult-fpeb npm run build

# Restart application
sudo systemctl start ult-fpeb
```

### SSL Certificate Renewal
```bash
# Check certificate status
sudo certbot certificates

# Test renewal
sudo certbot renew --dry-run

# Manual renewal (if needed)
sudo certbot renew
```

## 🚨 Troubleshooting

### Common Issues

**Application won't start:**
```bash
# Check logs
sudo -u ult-fpeb pm2 logs
sudo journalctl -u ult-fpeb -n 50

# Check configuration
sudo -u ult-fpeb pm2 show ult-fpeb-backend
```

**Database connection failed:**
```bash
# Check MySQL status
sudo systemctl status mysql

# Test connection
mysql -u ult_fpeb_user -p -h localhost ult_fpeb_db

# Check configuration
cat /var/www/ult-fpeb/backend/.env
```

**Nginx configuration error:**
```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log

# Reload configuration
sudo systemctl reload nginx
```

**SSL certificate issues:**
```bash
# Check certificate status
sudo certbot certificates

# Check Nginx SSL configuration
sudo nginx -t

# Renew certificate
sudo certbot renew --force-renewal
```

### Performance Issues

**High memory usage:**
```bash
# Check PM2 processes
sudo -u ult-fpeb pm2 monit

# Restart application
sudo systemctl restart ult-fpeb
```

**Slow database queries:**
```bash
# Check MySQL performance
sudo mysql -u root -p -e "SHOW PROCESSLIST;"

# Check slow query log
sudo tail -f /var/log/mysql/slow.log
```

## 🔐 Post-Deployment Security

### 1. Change Default Passwords
- Login to application and change admin passwords
- Update database password if needed
- Change JWT secret in production

### 2. Configure Backups
```bash
# Setup automated backups
sudo crontab -e

# Add backup cron job (daily at 2 AM)
0 2 * * * /usr/bin/mysqldump -u ult_fpeb_user -p'password' ult_fpeb_db > /var/backups/ult-fpeb/db_$(date +\%Y\%m\%d).sql
```

### 3. Monitor Security
```bash
# Check failed login attempts
sudo tail -f /var/log/auth.log

# Monitor application logs
sudo -u ult-fpeb pm2 logs --lines 100
```

## 📞 Support

### Log Files Location
- **Application**: `/var/log/ult-fpeb/`
- **Nginx**: `/var/log/nginx/`
- **MySQL**: `/var/log/mysql/`
- **System**: `journalctl -u ult-fpeb`

### Configuration Files
- **Nginx**: `/etc/nginx/sites-available/ult-fpeb`
- **PM2**: `/var/www/ult-fpeb/ecosystem.config.js`
- **Application**: `/var/www/ult-fpeb/backend/.env`

### Useful Commands
```bash
# Service management
sudo systemctl {start|stop|restart|status} {nginx|mysql|ult-fpeb}

# PM2 management
sudo -u ult-fpeb pm2 {start|stop|restart|status|logs|monit}

# Check ports
sudo netstat -tulpn | grep -E ':80|:443|:3001|:3306'

# Check disk space
df -h

# Check memory usage
free -h
```

---

## ✅ Deployment Checklist

After deployment, verify:

- [ ] ✅ Web application accessible at http://your-domain.com
- [ ] ✅ HTTPS redirect working (if SSL configured)
- [ ] ✅ Login functionality working
- [ ] ✅ Database operations successful
- [ ] ✅ File uploads working
- [ ] ✅ API endpoints responding
- [ ] ✅ Logs being generated properly
- [ ] ✅ Services auto-start on reboot
- [ ] ✅ Firewall configured correctly
- [ ] ✅ SSL certificate valid (if configured)

**🎉 Deployment completed successfully!**

*For additional support or custom configurations, refer to the troubleshooting section or check the application logs.*
