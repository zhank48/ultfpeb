# 🚀 ULT FPEB - Ready for Ubuntu Deployment

## ✅ Status: PRODUCTION READY v1.0.4

**Deployment ID**: deploy-1751421070727  
**Date**: 2025-07-02T01:51:16.615Z  
**Repository**: https://github.com/zhank48/ULT.git

---

## 🎯 Ubuntu Server Deployment (1-Command Install)

### Prerequisites
- Ubuntu 18.04+ or Ubuntu Server
- User with sudo privileges (NOT root)
- Internet connection

### 🚀 Quick Deploy Command

```bash
# Clone and deploy in one go
git clone https://github.com/zhank48/ULT.git && cd ULT && chmod +x deploy-ubuntu-enhanced.sh && ./deploy-ubuntu-enhanced.sh
```

### 📋 Step-by-Step Deploy

```bash
# 1. Clone repository
git clone https://github.com/zhank48/ULT.git
cd ULT

# 2. Run enhanced deployment script
chmod +x deploy-ubuntu-enhanced.sh
./deploy-ubuntu-enhanced.sh

# 3. Verify deployment
chmod +x verify-deployment-enhanced.sh
./verify-deployment-enhanced.sh
```

---

## 🌟 What Gets Installed

### 🔧 System Components
- ✅ Node.js 18+ with npm
- ✅ MySQL Server with secure configuration
- ✅ Nginx reverse proxy
- ✅ PM2 process manager
- ✅ UFW Firewall with security rules
- ✅ SSL-ready configuration

### 📱 Application Features
- ✅ **Frontend**: React 18 with Tailwind CSS
- ✅ **Backend**: Express.js REST API
- ✅ **Database**: MySQL with optimized schema
- ✅ **Auth**: JWT-based authentication
- ✅ **Upload**: File handling for visitor photos
- ✅ **Security**: Rate limiting, CORS, validation

### 🎛️ Management Tools
- ✅ **Health Monitoring**: Comprehensive system checks
- ✅ **Auto Updates**: Git-based update system
- ✅ **Backup System**: Database and file backups
- ✅ **Log Management**: Centralized logging
- ✅ **Firewall**: Network security rules

---

## 🌐 Access After Deployment

### URLs (Replace YOUR_SERVER_IP)
- **Frontend**: http://YOUR_SERVER_IP/
- **API**: http://YOUR_SERVER_IP/api/
- **Health Check**: http://YOUR_SERVER_IP/health

### 🔑 Default Admin Login
- **Email**: admin@ult-fpeb.ac.id
- **Password**: admin123
- **⚠️ CHANGE PASSWORD IMMEDIATELY AFTER FIRST LOGIN!**

---

## 🔧 Management Commands

### Application Management
```bash
ult status      # System status
ult logs        # View application logs  
ult restart     # Restart application
ult update      # Update from repository
ult backup      # Create system backup
```

### Service Management
```bash
# Backend
pm2 status ult-fpeb-backend
pm2 logs ult-fpeb-backend
pm2 restart ult-fpeb-backend

# Nginx
sudo systemctl status nginx
sudo systemctl restart nginx

# MySQL
sudo systemctl status mysql
```

---

## 📊 Project Structure

```
/var/www/ult-fpeb/              # Main application
├── backend/                    # Express.js API
│   ├── uploads/               # User uploads
│   ├── logs/                  # Application logs
│   └── .env                   # Backend config
├── frontend/                   # React source
└── ecosystem.config.js        # PM2 config

/var/www/ult-fpeb-frontend/    # Served frontend files
```

---

## 🔍 Verification Steps

After deployment, verify everything works:

```bash
# 1. Check system health
./verify-deployment-enhanced.sh

# 2. Test frontend
curl http://localhost/

# 3. Test API
curl http://localhost/api/health

# 4. Check services
ult status
```

---

## 🆘 Troubleshooting

### Common Issues
1. **Permission Denied**: Make sure you're NOT running as root
2. **Port Conflicts**: Check if ports 80, 3001, 3306 are available
3. **Database Issues**: Ensure MySQL service is running
4. **Firewall Blocks**: Check UFW rules allow HTTP traffic

### Get Help
```bash
# View deployment logs
tail -f /var/log/ult-fpeb-deployment.log

# Check system resources
ult status

# View application logs
ult logs
```

---

## 🎉 Success!

The ULT FPEB Visitor Management System is now **PRODUCTION READY** and can be deployed to Ubuntu servers with a single command!

**Next Step**: Run the deployment command on your Ubuntu server! 🚀

---
*Generated: 2025-07-02T01:51:16.615Z*  
*Deployment ID: deploy-1751421070727*
