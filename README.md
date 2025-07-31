# 🏫 ULT FPEB - Visitor Management System

Sistema manajemen pengunjung modern untuk Unit Layanan Terpadu Fakultas Pendidikan Ekonomi dan Bisnis UPI.

> **Status Deployment**: GitHub Actions workflow telah dinonaktifkan untuk deployment manual dan kontrol yang lebih baik.

## 🚀 Quick Start

### Option 1: One-Click Setup (Recommended)
```bash
# Run master setup tool - provides guided setup options
master-setup.bat

# Or complete automated setup
quick-setup.bat
```

### Option 2: Step-by-Step Setup
```bash
# 1. Install dependencies
setup-complete.bat

# 2. Setup database  
setup-database.bat

# 3. Start development
start-dev.bat
```

### Option 3: Manual Setup
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
# Then run setup-database.bat
```

## 📋 Prerequisites

- **Node.js 18.x+** - [Download](https://nodejs.org/)
- **MySQL 5.7+** - via Laragon, XAMPP, WAMP, or standalone
- **Git** (optional)

## 🗃️ Database Setup

The system automatically detects and configures MySQL from:
- System PATH
- Laragon (`C:\laragon\bin\mysql\*`)
- XAMPP (`C:\xampp\mysql\bin\mysql.exe`)
- WAMP (`C:\wamp*\bin\mysql\*`)

### Default Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@ultfpeb.up.edu | admin123 |
| Receptionist | receptionist@ultfpeb.up.edu | receptionist123 |

## 🛠️ Available Scripts

### Essential Scripts
| Script | Purpose | Usage |
|--------|---------|-------|
| `development-setup.bat` | Complete development setup | **Start here** - Full setup |
| `start-dev.bat` | Start development servers | Daily development |
| `database-backup.bat` | Database backup utility | Data backup/restore |

### Package Scripts
| Command | Purpose | Usage |
|---------|---------|-------|
| `npm run dev` | Start both servers | Development |
| `npm run install:all` | Install all dependencies | Initial setup |
| `npm run build` | Build for production | Deployment |

## 🌟 Features

### Core Functionality
- **Visitor Management** - Registration, check-in/out, history
- **Complaint System** - Submit, track, resolve complaints  
- **Feedback Collection** - Visitor feedback and ratings
- **Lost Items** - Report and manage lost items
- **Event Management** - Schedule and manage events
- **User Authentication** - Role-based access control

### Technical Features
- **Auto-Detection** - MySQL installation detection
- **Environment Switching** - Dev/Prod/Laragon configurations
- **Database Verification** - Automated health checks
- **Backup/Restore** - Database management tools
- **Troubleshooting** - Automated diagnostics
- **Logging** - Comprehensive application logs

## 🏗️ Tech Stack

### Frontend
- **React 19** + **Vite 6** + **Tailwind CSS 4**
- **CoreUI React** untuk admin components
- **React Router DOM** untuk navigation
- **Recharts** untuk data visualization
- **Lucide React** untuk icons

### Backend
- **Node.js** + **Express.js**
- **MySQL** database dengan **MySQL2** driver
- **JWT** authentication dengan **bcryptjs**
- **Multer** + **Sharp** untuk file upload dan image processing
- **Express Rate Limit** untuk API protection

## 📁 Project Structure

```
ult-fpeb-visitor-management/
├── 📁 backend/               # Node.js/Express API server
│   ├── 📁 src/              # Backend source code
│   ├── 📁 uploads/          # File uploads storage
│   ├── 📁 logs/             # Application logs
│   ├── 📁 sql/              # Database scripts
│   ├── 📁 templates/        # Document templates
│   ├── .env                 # Environment configuration
│   ├── package.json         # Backend dependencies
│   └── server.js            # Main server file
├── 📁 frontend/              # React frontend application  
│   ├── 📁 src/              # Frontend source code
│   ├── 📁 public/           # Static assets
│   ├── 📁 dist/             # Build output
│   ├── .env.local           # Frontend environment
│   ├── package.json         # Frontend dependencies
│   └── index.html           # Entry point
├── 📁 configs/               # Deployment configurations
│   ├── docker-compose.yml   # Docker development
│   ├── docker-compose.prod.yml # Docker production
│   ├── Dockerfile           # Docker image
│   └── nginx.conf           # Nginx configuration
├── 📁 scripts/               # Deployment scripts
│   ├── deploy-production.bat
│   ├── improved-production-deployment.cjs
│   └── PRODUCTION_DEPLOYMENT_GUIDE.md
├── 📁 database-exports/      # Database backups
├── 📁 uploads/               # Shared file uploads
├── 📁 docs/                  # Documentation
│   ├── API.md               # API documentation
│   └── DEPLOYMENT.md        # Deployment guide
├── 📁 node_modules/          # Root dependencies
├── package.json              # Workspace configuration
├── package-lock.json         # Lock file
├── README.md                 # This file
├── .gitignore               # Git ignore rules
├── ecosystem.config.cjs      # PM2 configuration
├── development-setup.bat     # Development setup
├── start-dev.bat            # Start development servers
└── database-backup.bat      # Database backup utility
```

## 🚀 Getting Started

### Prerequisites

- **Node.js 18.x+** - [Download](https://nodejs.org/)
- **MySQL 5.7+** - via Laragon, XAMPP, WAMP, or standalone
- **Git** (optional)

### Quick Start

```bash
# 1. Complete development setup
development-setup.bat

# 2. Start development servers
start-dev.bat

# 3. Access application
# Frontend: http://localhost:5173
# Backend: http://localhost:3001/api
```

### Manual Setup

```bash
# Install dependencies
npm install
npm run install:all

# Setup environment
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# Start development
npm run dev
```

## � Documentation

- **[API Documentation](./docs/API.md)** - Complete API reference
- **[Deployment Guide](./docs/DEPLOYMENT.md)** - Production deployment guide

## �🐳 Docker Deployment

```bash
# Development
docker-compose up -d

# Production  
docker-compose -f configs/docker-compose.prod.yml up -d
```

## 🚀 Deployment Status

**GitHub Actions**: Dinonaktifkan untuk kontrol deployment manual yang lebih baik.

### Manual Deployment
Untuk deployment manual, gunakan script yang tersedia:
```bash
# Production deployment
npm run deploy:production

# Or using batch script
scripts/deploy-production.bat

# Database setup (use production database: ult_fpeb_prod)
mysql -u root -p ult_fpeb_prod < backend/sql/fix_location_column.sql
mysql -u root -p ult_fpeb_prod < backend/sql/create_configuration_tables.sql
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`) 
5. Open a Pull Request

**Note**: Automatic deployment via GitHub Actions telah dinonaktifkan. Deployment dilakukan secara manual untuk kontrol yang lebih baik.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**ULT FPEB Visitor Management System** - Modern, Secure, Scalable 🚀
