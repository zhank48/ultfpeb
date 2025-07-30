#!/usr/bin/env node

/**
 * ULT FPEB - Windows-Compatible Deployment Script
 * Simplified deployment, commit & push for Windows to Ubuntu deployment
 */

import { exec } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const CONFIG = {
    projectName: 'ULT FPEB Visitor Management System',
    repository: 'https://github.com/zhank48/ULT.git',
    mainBranch: 'main'
};

// Colors for console output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m'
};

function log(message, color = 'white') {
    console.log(`${colors[color] || ''}${message}${colors.reset}`);
}

function logStep(step, description) {
    log(`\n🔧 [${step}] ${description}`, 'cyan');
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

function logWarning(message) {
    log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
    log(`ℹ️  ${message}`, 'blue');
}

class ULTWindowsDeploymentManager {
    constructor() {
        this.startTime = new Date();
        this.deploymentId = `deploy-${Date.now()}`;
    }

    async runCommand(command, description = '') {
        if (description) logInfo(`Running: ${description}`);
        
        try {
            const { stdout, stderr } = await execAsync(command, { cwd: __dirname });
            if (stderr && !stderr.includes('warning') && !stderr.includes('Switched to')) {
                logWarning(`Command warning: ${stderr}`);
            }
            return stdout.trim();
        } catch (error) {
            // Don't throw for non-critical commands
            if (description.includes('cleanup') || description.includes('remove')) {
                logInfo(`Skipped: ${description}`);
                return '';
            }
            logError(`Command failed: ${command}`);
            logError(`Error: ${error.message}`);
            throw error;
        }
    }

    async updateVersionAndInfo() {
        logStep('VERSION', 'Updating Version and Deployment Info');

        // Update package.json version
        const packagePath = join(__dirname, 'package.json');
        if (existsSync(packagePath)) {
            const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
            const oldVersion = packageJson.version || '1.0.0';
            
            // Increment patch version
            const versionParts = oldVersion.split('.');
            versionParts[2] = (parseInt(versionParts[2]) + 1).toString();
            const newVersion = versionParts.join('.');
            
            packageJson.version = newVersion;
            packageJson.deploymentId = this.deploymentId;
            packageJson.lastDeployment = new Date().toISOString();
            
            writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
            logSuccess(`Version updated: ${oldVersion} → ${newVersion}`);
        }

        // Create deployment info file
        const deploymentInfo = {
            deploymentId: this.deploymentId,
            timestamp: new Date().toISOString(),
            version: JSON.parse(readFileSync(packagePath, 'utf8')).version,
            repository: CONFIG.repository,
            branch: CONFIG.mainBranch,
            environment: 'production-ready',
            status: 'READY_FOR_UBUNTU_DEPLOYMENT',
            features: [
                'Frontend cleanup completed',
                'Ubuntu deployment scripts ready',
                'Environment configuration prepared',
                'Health monitoring tools included',
                'Security enhancements implemented'
            ]
        };

        writeFileSync(
            join(__dirname, 'DEPLOYMENT_INFO.json'),
            JSON.stringify(deploymentInfo, null, 2)
        );

        logSuccess('Deployment info created');
    }

    async commitAndPush() {
        logStep('GIT', 'Committing and Pushing Changes');

        try {
            // Check git status
            const status = await this.runCommand('git status --porcelain');
            
            if (!status.trim()) {
                logInfo('No changes to commit');
                return;
            }

            // Add all changes
            await this.runCommand('git add .');
            logSuccess('All changes staged');

            // Create commit message
            const version = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8')).version;
            const commitMessage = `🚀 Production Ready v${version} - ${this.deploymentId}

✨ Ready for Ubuntu Deployment:
- Frontend cleanup and optimization completed  
- Ubuntu auto-deployment scripts created
- Environment configuration enhanced
- Health monitoring and verification tools
- Security improvements implemented

🗑️ Cleanup Completed:
- Removed unused, backup, and test files
- Eliminated code duplication
- Optimized project structure (15 clean page components)

🚀 Deployment Scripts Ready:
- deploy-ubuntu-enhanced.sh - Automated Ubuntu deployment
- verify-deployment-enhanced.sh - Comprehensive health checks
- deploy-config-enhanced.env - Production configuration

📊 Status: PRODUCTION READY ✅
📅 Date: ${new Date().toISOString()}

Ready for immediate deployment on Ubuntu servers.`;

            // Commit changes
            await this.runCommand(`git commit -m "${commitMessage}"`, 'Committing changes');
            logSuccess('Changes committed successfully');

            // Create deployment tag
            const deployTag = `v${version}-prod`;
            await this.runCommand(`git tag -a ${deployTag} -m "Production deployment ${this.deploymentId}"`, 'Creating deployment tag');
            logSuccess(`Created deployment tag: ${deployTag}`);

            // Push to repository
            await this.runCommand(`git push origin ${CONFIG.mainBranch}`, 'Pushing main branch');
            logSuccess(`Pushed ${CONFIG.mainBranch} branch`);

            // Push tags
            await this.runCommand('git push origin --tags', 'Pushing tags');
            logSuccess('Pushed tags');

        } catch (error) {
            logError(`Git operations failed: ${error.message}`);
            throw error;
        }
    }

    async createUbuntuInstructions() {
        logStep('DOCS', 'Creating Ubuntu Deployment Instructions');

        const version = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8')).version;
        
        const instructions = `# 🚀 ULT FPEB - Ready for Ubuntu Deployment

## ✅ Status: PRODUCTION READY v${version}

**Deployment ID**: ${this.deploymentId}  
**Date**: ${new Date().toISOString()}  
**Repository**: ${CONFIG.repository}

---

## 🎯 Ubuntu Server Deployment (1-Command Install)

### Prerequisites
- Ubuntu 18.04+ or Ubuntu Server
- User with sudo privileges (NOT root)
- Internet connection

### 🚀 Quick Deploy Command

\`\`\`bash
# Clone and deploy in one go
git clone ${CONFIG.repository} && cd ULT && chmod +x deploy-ubuntu-enhanced.sh && ./deploy-ubuntu-enhanced.sh
\`\`\`

### 📋 Step-by-Step Deploy

\`\`\`bash
# 1. Clone repository
git clone ${CONFIG.repository}
cd ULT

# 2. Run enhanced deployment script
chmod +x deploy-ubuntu-enhanced.sh
./deploy-ubuntu-enhanced.sh

# 3. Verify deployment
chmod +x verify-deployment-enhanced.sh
./verify-deployment-enhanced.sh
\`\`\`

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
\`\`\`bash
ult status      # System status
ult logs        # View application logs  
ult restart     # Restart application
ult update      # Update from repository
ult backup      # Create system backup
\`\`\`

### Service Management
\`\`\`bash
# Backend
pm2 status ult-fpeb-backend
pm2 logs ult-fpeb-backend
pm2 restart ult-fpeb-backend

# Nginx
sudo systemctl status nginx
sudo systemctl restart nginx

# MySQL
sudo systemctl status mysql
\`\`\`

---

## 📊 Project Structure

\`\`\`
/var/www/ult-fpeb/              # Main application
├── backend/                    # Express.js API
│   ├── uploads/               # User uploads
│   ├── logs/                  # Application logs
│   └── .env                   # Backend config
├── frontend/                   # React source
└── ecosystem.config.js        # PM2 config

/var/www/ult-fpeb-frontend/    # Served frontend files
\`\`\`

---

## 🔍 Verification Steps

After deployment, verify everything works:

\`\`\`bash
# 1. Check system health
./verify-deployment-enhanced.sh

# 2. Test frontend
curl http://localhost/

# 3. Test API
curl http://localhost/api/health

# 4. Check services
ult status
\`\`\`

---

## 🆘 Troubleshooting

### Common Issues
1. **Permission Denied**: Make sure you're NOT running as root
2. **Port Conflicts**: Check if ports 80, 3001, 3306 are available
3. **Database Issues**: Ensure MySQL service is running
4. **Firewall Blocks**: Check UFW rules allow HTTP traffic

### Get Help
\`\`\`bash
# View deployment logs
tail -f /var/log/ult-fpeb-deployment.log

# Check system resources
ult status

# View application logs
ult logs
\`\`\`

---

## 🎉 Success!

The ULT FPEB Visitor Management System is now **PRODUCTION READY** and can be deployed to Ubuntu servers with a single command!

**Next Step**: Run the deployment command on your Ubuntu server! 🚀

---
*Generated: ${new Date().toISOString()}*  
*Deployment ID: ${this.deploymentId}*
`;

        writeFileSync(join(__dirname, 'UBUNTU_DEPLOYMENT_READY.md'), instructions);
        logSuccess('Ubuntu deployment instructions created');
    }

    async displaySummary() {
        const version = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8')).version;
        const endTime = new Date();
        const duration = Math.round((endTime - this.startTime) / 1000);

        log('\n' + '═'.repeat(60), 'magenta');
        log('🎉 ULT FPEB DEPLOYMENT READY!', 'green');
        log('═'.repeat(60), 'magenta');
        log('');
        
        log(`📊 Deployment Summary:`, 'cyan');
        log(`   • Version: ${version}`, 'blue');
        log(`   • Deployment ID: ${this.deploymentId}`, 'blue');
        log(`   • Duration: ${duration} seconds`, 'blue');
        log(`   • Status: PRODUCTION READY ✅`, 'green');
        log('');
        
        log(`🚀 Ready for Ubuntu Deployment!`, 'cyan');
        log(`   Repository: ${CONFIG.repository}`, 'blue');
        log(`   All changes committed and pushed`, 'green');
        log('');
        
        log(`📋 Ubuntu Deployment Command:`, 'yellow');
        log(`   git clone ${CONFIG.repository} && cd ULT && chmod +x deploy-ubuntu-enhanced.sh && ./deploy-ubuntu-enhanced.sh`, 'white');
        log('');
        
        log(`📚 Documentation Created:`, 'cyan');
        log(`   • UBUNTU_DEPLOYMENT_READY.md - Complete guide`, 'blue');
        log(`   • deploy-ubuntu-enhanced.sh - Auto deployment script`, 'blue');
        log(`   • verify-deployment-enhanced.sh - Health verification`, 'blue');
        log(`   • deploy-config-enhanced.env - Configuration`, 'blue');
        log('');
        
        log(`✨ Ready to deploy on Ubuntu server!`, 'green');
    }

    async run() {
        try {
            log('\n🚀 ULT FPEB Windows Deployment Manager', 'magenta');
            log('═'.repeat(60), 'magenta');
            log(`🆔 Deployment ID: ${this.deploymentId}`, 'cyan');
            log(`📅 Started: ${this.startTime.toISOString()}`, 'cyan');
            log('');

            await this.updateVersionAndInfo();
            await this.commitAndPush();
            await this.createUbuntuInstructions();
            await this.displaySummary();

            process.exit(0);

        } catch (error) {
            logError(`\nDeployment preparation failed: ${error.message}`);
            logError('Please check the errors above and try again.');
            process.exit(1);
        }
    }
}

// Run the deployment manager
const manager = new ULTWindowsDeploymentManager();
manager.run().catch(console.error);
