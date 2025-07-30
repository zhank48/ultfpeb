# ULT FPEB Visitor Management - Deployment Guide

## 🚀 Quick Start

### Production Deployment with Git Integration

1. **Fresh Installation:**
   ```bash
   # Download deployment script
   wget https://raw.githubusercontent.com/zhank48/ultfpeb/main/scripts/deploy-with-git.sh
   chmod +x deploy-with-git.sh
   
   # Deploy with your server IP
   sudo ./deploy-with-git.sh 192.168.1.100 https://github.com/zhank48/ultfpeb.git
   ```

2. **Update Existing Installation:**
   ```bash
   # Simple one-command update
   ult-update
   
   # Or manual update
   sudo ./deploy-with-git.sh update
   ```

## 🔧 Bug Fixes Applied

### Database Issues Fixed:
- ✅ **Column Count Mismatch**: Fixed INSERT statement in `Visitor.js` (removed `location` from VALUES)
- ✅ **Field Name Mismatch**: Updated database schema (`phone` → `phone_number`)
- ✅ **Missing Fields**: Added `photo_url`, `signature_url` fields
- ✅ **Generated Column**: Added `location` as computed field from `unit` + `person_to_meet`

### Validation Issues Fixed:
- ✅ **Photo/Signature Required**: Made photo and signature optional in validation
- ✅ **PM2 Configuration**: Fixed ecosystem config with correct script path

### Environment Management:
- ✅ **Multiple Environments**: Added support for dev, production, laragon
- ✅ **Automatic Environment Setup**: Scripts auto-generate `.env` files

## 📋 Pre-Deployment Checklist

### Server Requirements:
- [x] Ubuntu/Debian Linux server
- [x] Root or sudo access
- [x] Internet connection
- [x] Minimum 4GB RAM, 20GB storage

### Network Requirements:
- [x] Open ports: 80 (HTTP), 443 (HTTPS), 22 (SSH)
- [x] Static IP address or domain name
- [x] SSL certificate (auto-generated self-signed)

## 🛠️ Manual Installation Steps

If automated script fails, follow these manual steps:

### 1. System Dependencies
```bash
# Update system
apt update && apt upgrade -y

# Install required packages
apt install -y curl wget git nginx mysql-server nodejs npm

# Install PM2
npm install -g pm2
```

### 2. Database Setup
```bash
# Secure MySQL installation
mysql_secure_installation

# Create database and user
mysql -u root -p << EOF
CREATE DATABASE ult_fpeb_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'ult_fpeb_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON ult_fpeb_prod.* TO 'ult_fpeb_user'@'localhost';
FLUSH PRIVILEGES;
EOF
```

### 3. Application Setup
```bash
# Clone repository
git clone https://github.com/zhank48/ultfpeb.git /opt/ult-fpeb
cd /opt/ult-fpeb

# Setup environment
bash scripts/manage-environment.sh production [YOUR_IP]

# Update database password in backend/.env
nano backend/.env

# Install dependencies
npm install

# Build application
npm run build

# Setup database
npm run setup-db

# Start with PM2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### 4. Nginx Configuration
```bash
# Copy provided nginx config
cp configs/nginx-site.conf /etc/nginx/sites-available/ult-fpeb
ln -s /etc/nginx/sites-available/ult-fpeb /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# Test and reload
nginx -t
systemctl reload nginx
```

## 🔄 Git Workflow for Updates

### Development to Production:
1. **Local Development:**
   ```bash
   # Setup local environment
   npm run deploy:env:dev
   npm run setup-db:dev
   npm run dev
   ```

2. **Commit Changes:**
   ```bash
   git add .
   git commit -m "fix: your changes"
   git push origin main
   ```

3. **Deploy to Production:**
   ```bash
   # On production server
   ult-update
   ```

### Rollback Process:
```bash
# If something goes wrong
ult-rollback

# This will:
# 1. Show recent commits
# 2. Ask which commit to rollback to
# 3. Automatically rollback and restart services
```

## 📊 Monitoring & Maintenance

### System Status:
```bash
# Check overall system status
ult-status

# Check PM2 processes
pm2 status
pm2 logs

# Check Nginx
systemctl status nginx
tail -f /var/log/nginx/ult-fpeb-error.log

# Check database
mysql -u ult_fpeb_user -p ult_fpeb_prod -e "SELECT COUNT(*) FROM visitors;"
```

### Backup & Restore:
```bash
# Create backup (runs daily via cron)
ult-backup

# Manual backup
mysqldump -u ult_fpeb_user -p ult_fpeb_prod > backup.sql
tar -czf app-backup.tar.gz /opt/ult-fpeb --exclude=node_modules

# Restore from backup
mysql -u ult_fpeb_user -p ult_fpeb_prod < backup.sql
```

## 🔐 Security Configuration

### Default Credentials:
- **Admin**: admin@ultfpeb.upi.edu / admin123
- **Receptionist**: receptionist@ultfpeb.upi.edu / receptionist123

⚠️ **IMPORTANT**: Change default passwords after first login!

### Security Features:
- JWT authentication with 24-hour expiry
- Password hashing with bcrypt
- Rate limiting for login attempts
- HTTPS with SSL certificates
- CORS configuration
- SQL injection prevention

## 📱 Access URLs

After successful deployment:
- **Application**: https://[YOUR_IP]
- **API Health**: https://[YOUR_IP]/api/health
- **Admin Login**: https://[YOUR_IP]/login

## 🆘 Troubleshooting

### Common Issues:

#### 1. 502 Bad Gateway
```bash
# Check PM2 processes
pm2 status
pm2 restart all

# Check backend logs
pm2 logs ult-fpeb-backend --lines 50
```

#### 2. Database Connection Error
```bash
# Check MySQL service
systemctl status mysql

# Test database connection
mysql -u ult_fpeb_user -p ult_fpeb_prod -e "SELECT 1;"

# Check backend environment
cat /opt/ult-fpeb/backend/.env | grep DB_
```

#### 3. File Permission Issues
```bash
# Fix ownership
chown -R ult-deploy:ult-deploy /opt/ult-fpeb

# Fix upload directory
mkdir -p /opt/ult-fpeb/backend/uploads
chmod 755 /opt/ult-fpeb/backend/uploads
```

#### 4. SSL Certificate Issues
```bash
# Regenerate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/server.key \
    -out /etc/nginx/ssl/server.crt \
    -subj "/C=ID/ST=West Java/L=Bandung/O=UPI/OU=FPEB/CN=[YOUR_IP]"

systemctl reload nginx
```

## 📞 Support

For issues or questions:
1. Check this deployment guide
2. Review application logs: `pm2 logs`
3. Check system status: `ult-status`
4. Create GitHub issue with error details

## 🎯 Next Steps After Deployment

1. **Change Default Passwords**
2. **Setup Regular Backups**
3. **Configure Domain Name** (optional)
4. **Setup Let's Encrypt SSL** (optional)
5. **Configure Email Notifications** (optional)
6. **Setup Monitoring Dashboard** (optional)

---

## 📝 Version History

- **v1.0.4**: Fixed database column mismatches, added Git integration
- **v1.0.3**: Added photo/signature optional validation
- **v1.0.2**: Initial production deployment
- **v1.0.1**: Development version
- **v1.0.0**: Initial release