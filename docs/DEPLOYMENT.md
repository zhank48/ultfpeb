# 🚀 ULT FPEB - Deployment Guide

## 📋 Prerequisites

### System Requirements
- **OS:** Ubuntu 20.04+ / CentOS 8+ / Windows Server 2019+
- **RAM:** 4GB minimum, 8GB recommended
- **Storage:** 20GB minimum, 50GB recommended
- **Network:** Public IP with ports 80, 443, 3000-3001 open

### Software Requirements
- **Node.js:** 18.x or higher
- **npm:** 9.x or higher
- **MySQL:** 8.0 or higher
- **Nginx:** 1.18 or higher (recommended)
- **PM2:** Latest version
- **SSL Certificate:** For HTTPS (recommended)

## 🐳 Docker Deployment (Recommended)

### 1. Quick Docker Deployment

```bash
# Clone repository
git clone <repository-url>
cd ult-fpeb-visitor-management

# Copy production environment
cp backend/.env.example backend/.env.production
cp frontend/.env.example frontend/.env.production

# Edit environment files
nano backend/.env.production
nano frontend/.env.production

# Start with Docker Compose
docker-compose -f configs/docker-compose.prod.yml up -d
```

### 2. Docker Environment Variables

**Backend (.env.production):**
```env
NODE_ENV=production
PORT=3001
DB_HOST=mysql
DB_PORT=3306
DB_NAME=ult_fpeb_prod
DB_USER=root
DB_PASSWORD=your_secure_password
JWT_SECRET=your_very_long_and_secure_jwt_secret_key
CORS_ORIGIN=https://your-domain.com
FRONTEND_URL=https://your-domain.com
```

**Frontend (.env.production):**
```env
VITE_API_URL=https://your-domain.com/api
VITE_APP_TITLE=ULT FPEB - Visitor Management
VITE_APP_ENV=production
```

## 🔧 Manual Deployment

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MySQL
sudo apt install -y mysql-server
sudo mysql_secure_installation

# Install Nginx
sudo apt install -y nginx

# Install PM2
sudo npm install -g pm2
```

### 2. Database Setup

```bash
# Login to MySQL
sudo mysql -u root -p

# Create database and user
CREATE DATABASE ult_fpeb_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'ult_fpeb_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON ult_fpeb_prod.* TO 'ult_fpeb_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Import database schema
mysql -u ult_fpeb_user -p ult_fpeb_prod < database-exports/database-backup-full_20250704_095944.sql
```

### 3. Application Deployment

```bash
# Create application directory
sudo mkdir -p /var/www/ult-fpeb
cd /var/www/ult-fpeb

# Clone repository
git clone <repository-url> .

# Install dependencies
npm install --production
cd backend && npm install --production
cd ../frontend && npm install --production && npm run build

# Set up environment files
cp backend/.env.example backend/.env.production
cp frontend/.env.example frontend/.env.production

# Edit environment files
nano backend/.env.production
nano frontend/.env.production

# Set permissions
sudo chown -R www-data:www-data /var/www/ult-fpeb
sudo chmod -R 755 /var/www/ult-fpeb
```

### 4. PM2 Configuration

Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'ult-fpeb-backend',
      script: './backend/server.js',
      cwd: '/var/www/ult-fpeb',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      error_file: './backend/logs/err.log',
      out_file: './backend/logs/out.log',
      log_file: './backend/logs/combined.log',
      time: true
    }
  ]
};
```

Start application:
```bash
# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Set up PM2 startup
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
```

### 5. Nginx Configuration

Create `/etc/nginx/sites-available/ult-fpeb`:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL Configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self'" always;
    
    # Frontend
    location / {
        root /var/www/ult-fpeb/frontend/dist;
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API Backend
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # File uploads
    location /uploads {
        alias /var/www/ult-fpeb/uploads;
        expires 1M;
        add_header Cache-Control "public";
    }
    
    # Security
    location ~ /\. {
        deny all;
    }
    
    # File size limit
    client_max_body_size 10M;
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/ult-fpeb /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔒 SSL Certificate Setup

### Using Let's Encrypt (Free)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

## 🔧 Environment Configuration

### Production Environment Variables

**Backend (.env.production):**
```env
# Application
NODE_ENV=production
PORT=3001
DEBUG=false

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ult_fpeb_prod
DB_USER=ult_fpeb_user
DB_PASSWORD=your_secure_database_password

# Security
JWT_SECRET=your_very_long_and_secure_jwt_secret_minimum_32_characters
JWT_EXPIRES_IN=7d

# CORS & URLs
CORS_ORIGIN=https://your-domain.com,https://www.your-domain.com
FRONTEND_URL=https://your-domain.com

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=uploads/

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
```

**Frontend (.env.production):**
```env
VITE_API_URL=https://your-domain.com/api
VITE_APP_TITLE=ULT FPEB - Visitor Management System
VITE_APP_ENV=production
VITE_APP_VERSION=1.0.0
```

## 📊 Monitoring & Logging

### 1. PM2 Monitoring

```bash
# Check status
pm2 status

# View logs
pm2 logs ult-fpeb-backend

# Monitor resources
pm2 monit

# Restart application
pm2 restart ult-fpeb-backend
```

### 2. Log Rotation

Create `/etc/logrotate.d/ult-fpeb`:
```
/var/www/ult-fpeb/backend/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 3. Health Monitoring

Create health check script `/usr/local/bin/ult-fpeb-health.sh`:
```bash
#!/bin/bash
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health)
if [ $response != "200" ]; then
    echo "Backend is down, restarting..."
    pm2 restart ult-fpeb-backend
    # Send notification (optional)
fi
```

Add to crontab:
```bash
# Check every 5 minutes
*/5 * * * * /usr/local/bin/ult-fpeb-health.sh
```

## 🔄 Database Backup

### Automated Backup Script

Create `/usr/local/bin/ult-fpeb-backup.sh`:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/ult-fpeb"
DB_NAME="ult_fpeb_prod"
DB_USER="ult_fpeb_user"
DB_PASS="your_database_password"

mkdir -p $BACKUP_DIR

# Database backup
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME > $BACKUP_DIR/db_backup_$DATE.sql

# Application backup
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz -C /var/www ult-fpeb

# Keep only last 30 days
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
```

Add to crontab:
```bash
# Daily backup at 2 AM
0 2 * * * /usr/local/bin/ult-fpeb-backup.sh
```

## 🚀 Deployment Script

Use the provided deployment script:
```bash
# Make executable
chmod +x scripts/deploy-production.bat

# Run deployment
./scripts/deploy-production.bat
```

## 🔧 Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   sudo netstat -tlnp | grep :3001
   sudo kill -9 <PID>
   ```

2. **Permission Issues**
   ```bash
   sudo chown -R www-data:www-data /var/www/ult-fpeb
   sudo chmod -R 755 /var/www/ult-fpeb
   ```

3. **Database Connection**
   ```bash
   mysql -u ult_fpeb_user -p -h localhost ult_fpeb_prod
   ```

4. **Nginx Configuration**
   ```bash
   sudo nginx -t
   sudo systemctl status nginx
   ```

### Log Locations
- **Application Logs:** `/var/www/ult-fpeb/backend/logs/`
- **Nginx Logs:** `/var/log/nginx/`
- **PM2 Logs:** `~/.pm2/logs/`
- **System Logs:** `/var/log/syslog`

## 📈 Performance Optimization

### 1. Database Optimization
```sql
-- Add indexes for better performance
ALTER TABLE visitors ADD INDEX idx_created_at (created_at);
ALTER TABLE visitors ADD INDEX idx_status (status);
ALTER TABLE complaints ADD INDEX idx_status (status);
ALTER TABLE feedback ADD INDEX idx_created_at (created_at);
```

### 2. Nginx Caching
Add to Nginx configuration:
```nginx
# Browser caching
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# API caching (for static endpoints)
location /api/public {
    proxy_pass http://localhost:3001;
    proxy_cache my_cache;
    proxy_cache_valid 200 5m;
}
```

### 3. PM2 Cluster Mode
Update `ecosystem.config.js`:
```javascript
{
  instances: 'max',
  exec_mode: 'cluster'
}
```

## ✅ Post-Deployment Checklist

- [ ] Application accessible via domain
- [ ] SSL certificate installed and working
- [ ] Database connection successful
- [ ] File uploads working
- [ ] API endpoints responding
- [ ] PM2 process running
- [ ] Nginx configuration correct
- [ ] Backup script configured
- [ ] Monitoring setup
- [ ] Log rotation configured
- [ ] Health check working
- [ ] Security headers present
- [ ] Performance optimized

## 🆘 Support

For deployment issues:
1. Check application logs
2. Verify environment configuration
3. Test database connectivity
4. Confirm nginx configuration
5. Monitor system resources
