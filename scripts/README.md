# ULT FPEB Deployment Scripts

This directory contains consolidated deployment and CI/CD automation scripts for the ULT FPEB Visitor Management System.

## 📋 Available Scripts

### 🚀 Master Deployment Script
- **`ult-deploy-master.sh`** - All-in-one deployment and CI/CD management script

### 🗄️ Database Scripts
- **`deploy-database-consolidated.js`** - Database deployment (Node.js)
- **`deploy-database-consolidated.sql`** - Database deployment (SQL)
- **`check-database.js`** - Database verification utility

## 🎯 Quick Start

### Initial Server Setup

```bash
# 1. Upload scripts to server
scp -r scripts/ user@your-server:/tmp/

# 2. Run initial deployment
ssh user@your-server
sudo chmod +x /tmp/scripts/ult-deploy-master.sh
sudo /tmp/scripts/ult-deploy-master.sh deploy your-domain.com admin@domain.com production
```

### Enable CI/CD Auto-Deployment

#### Option 1: GitHub Actions (Recommended)
1. **Setup GitHub Secrets** in your repository:
   ```
   HOST: your-server-ip
   USERNAME: your-ssh-username  
   SSH_PRIVATE_KEY: your-ssh-private-key
   PORT: 22 (optional)
   ```

2. **GitHub Actions workflow** is already configured in `.github/workflows/deploy.yml`

3. **Push to main branch** - deployment will trigger automatically

#### Option 2: GitHub Webhooks
1. **Setup webhook on server:**
   ```bash
   sudo /var/www/ult-fpeb/scripts/ult-deploy-master.sh webhook
   ```

2. **Configure GitHub webhook:**
   - Go to repository Settings → Webhooks
   - Add webhook URL: `http://your-server-ip/webhook`
   - Content type: `application/json`
   - Secret: (use the generated secret from setup script)
   - Events: Push events
   - Active: ✓

3. **Test deployment:**
   ```bash
   git push origin main
   # Monitor logs: /var/www/ult-fpeb/scripts/ult-deploy-master.sh logs webhook
   ```

## 📚 Master Script Usage

The `ult-deploy-master.sh` script consolidates all deployment functionality into a single command-line interface:

### Available Commands

#### Initial Deployment
```bash
# Production deployment
sudo ./ult-deploy-master.sh deploy example.com admin@example.com production

# Development deployment  
sudo ./ult-deploy-master.sh deploy localhost admin@local.com development

# IP-based deployment (self-signed SSL)
sudo ./ult-deploy-master.sh deploy 192.168.1.100 admin@company.com production
```

#### Auto-Update
```bash
# Update from main branch
./ult-deploy-master.sh update main production

# Update from develop branch
./ult-deploy-master.sh update develop staging
```

#### Webhook Setup
```bash
# Setup with auto-generated secret
sudo ./ult-deploy-master.sh webhook

# Setup with custom secret
sudo ./ult-deploy-master.sh webhook your-custom-secret
```

#### Database Operations
```bash
# Check database connection
./ult-deploy-master.sh database check

# Deploy database schema
./ult-deploy-master.sh database deploy

# Run migrations
./ult-deploy-master.sh database migrate
```

#### Backup & Recovery
```bash
# Create manual backup
./ult-deploy-master.sh backup

# Rollback to previous version
./ult-deploy-master.sh rollback
```

#### Monitoring
```bash
# Check application status
./ult-deploy-master.sh status

# View all logs
./ult-deploy-master.sh logs

# View specific service logs
./ult-deploy-master.sh logs webhook
./ult-deploy-master.sh logs pm2
```

## What the Auto-Deploy Script Does

The `auto-deploy.sh` script is a comprehensive deployment solution that:

### System Setup
- Detects OS (Ubuntu/Debian/CentOS/RHEL) and configures package manager
- Updates system packages
- Installs required dependencies (Node.js, MySQL, Nginx, etc.)
- Creates application user and directories

### Application Deployment
- Copies application files to production location
- Installs Node.js dependencies for backend and frontend
- Builds frontend for production
- Configures environment variables

### Database Setup
- Installs and secures MySQL
- Creates application database and user
- Initializes database schema with production data
- Creates default admin users

### Web Server Configuration
- Configures PM2 for process management
- Sets up Nginx reverse proxy
- Configures SSL certificates (Let's Encrypt or self-signed)
- Optimizes performance settings

### Security & System Configuration
- Configures firewall (UFW)
- Sets up Fail2ban for intrusion detection
- Creates systemd service for auto-startup
- Sets up log rotation
- Configures automatic backups

### Verification
- Performs comprehensive health checks
- Verifies all services are running
- Tests web and API endpoints
- Validates SSL configuration

## Script Arguments

```bash
./auto-deploy.sh [domain] [email] [environment]
```

**Parameters:**
- `domain` (optional): Domain name or IP address (default: localhost)
- `email` (optional): Email for Let's Encrypt notifications (default: admin@domain)
- `environment` (optional): production or development (default: production)

## SSL Configuration

The script automatically detects the deployment type and configures SSL accordingly:

- **Domain names**: Uses Let's Encrypt for free SSL certificates
- **IP addresses/localhost**: Offers choice between HTTP-only or self-signed SSL
- **Interactive mode**: Prompts user for SSL preferences

## File Structure After Deployment

```
/var/www/ult-fpeb/          # Application directory
├── backend/                # Backend Node.js application
├── frontend/dist/          # Built frontend files
└── ecosystem.config.cjs    # PM2 configuration

/var/log/ult-fpeb/          # Application logs
/var/backups/ult-fpeb/      # Automatic backups
/etc/nginx/sites-available/ult-fpeb  # Nginx configuration
/root/mysql_credentials.txt # Database credentials
```

## Post-Deployment Management

### Application Management
```bash
# View PM2 status
sudo -u ult-fpeb pm2 status

# View application logs
sudo -u ult-fpeb pm2 logs

# Restart application
sudo -u ult-fpeb pm2 restart all

# Reload application (zero downtime)
sudo -u ult-fpeb pm2 reload all
```

### System Services
```bash
# Check service status
sudo systemctl status nginx
sudo systemctl status mysql
sudo systemctl status ult-fpeb

# Restart services
sudo systemctl restart nginx
sudo systemctl restart mysql
```

### Backup and Maintenance
```bash
# Manual backup
sudo /usr/local/bin/ult-backup.sh

# View backup files
ls -la /var/backups/ult-fpeb/

# Check disk usage
df -h
```

### SSL Certificate Management
```bash
# Check Let's Encrypt certificate status
sudo certbot certificates

# Test certificate renewal (dry run)
sudo certbot renew --dry-run

# Force certificate renewal
sudo certbot renew --force-renewal
```

## Default Login Credentials

### Production Environment
- **Admin**: adminult@fpeb.upi.edu / AdminULT2025!
- **Arsip**: arsip@fpeb.upi.edu / ArsipFPEB2025!
- **Receptionist**: manper@upi.edu / ManperUPI2025!

### Development Environment
- **Admin**: adminult@fpeb.upi.edu / admin
- **Arsip**: arsip@fpeb.upi.edu / admin
- **Receptionist**: manper@upi.edu / manper123

**⚠️ Important: Change all default passwords immediately after first login!**

## Troubleshooting

### Application Won't Start
```bash
# Check PM2 logs
sudo -u ult-fpeb pm2 logs

# Check if database is running
sudo systemctl status mysql

# Verify environment configuration
cat /var/www/ult-fpeb/backend/.env
```

### Database Connection Issues
```bash
# Test database connection
mysql -u ult_fpeb_user -p ult_fpeb_production

# Check database credentials
cat /root/mysql_credentials.txt

# Restart MySQL service
sudo systemctl restart mysql
```

### Web Server Issues
```bash
# Check Nginx status
sudo systemctl status nginx

# Test Nginx configuration
sudo nginx -t

# View Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# View certificate details
openssl x509 -in /etc/letsencrypt/live/domain.com/fullchain.pem -text -noout

# For self-signed certificates
openssl x509 -in /etc/nginx/ssl/ult-fpeb.crt -text -noout
```

## Monitoring and Maintenance

### Regular Maintenance Tasks
1. **Daily**: Check application logs and system resources
2. **Weekly**: Review backup files and test restoration
3. **Monthly**: Update system packages and review security
4. **Quarterly**: Review and update SSL certificates

### Log Files to Monitor
- Application logs: `/var/log/ult-fpeb/`
- Nginx logs: `/var/log/nginx/`
- System logs: `journalctl -u ult-fpeb`
- MySQL logs: `/var/log/mysql/`

### Performance Monitoring
```bash
# Check system resources
htop

# Check disk usage
df -h

# Check memory usage
free -h

# Monitor application processes
sudo -u ult-fpeb pm2 monit
```

## Security Considerations

1. **Change all default passwords** immediately after deployment
2. **Keep system packages updated** regularly
3. **Monitor log files** for suspicious activity
4. **Review firewall rules** periodically
5. **Test backup restoration** regularly
6. **Update SSL certificates** before expiration
7. **Review user access permissions** quarterly

## Support and Documentation

For additional help:
- Check application logs: `/var/log/ult-fpeb/`
- Review Nginx configuration: `/etc/nginx/sites-available/ult-fpeb`
- Database credentials: `/root/mysql_credentials.txt`
- PM2 documentation: https://pm2.keymetrics.io/docs/
- Nginx documentation: https://nginx.org/en/docs/

## Legacy Files (Kept for Reference)

The following files are kept for reference and specific use cases:

- `database-init.sql` - Manual database initialization
- `database-migration.js` - Database schema migration utility
- `improved-production-deployment.cjs` - Node.js database setup script
- `production-deployment-schema.sql` - Complete database schema
- `seed-admin.js` - Admin user creation script
- `simple-database-init.sql` - Minimal database setup
- `PRODUCTION_DEPLOYMENT_GUIDE.md` - Detailed deployment guide

These files can be used for manual setup or customization if needed, but the `auto-deploy.sh` script should handle most deployment scenarios automatically.