# 🏫 ULT FPEB - Visitor Management System

Sistema manajemen pengunjung modern untuk Unit Layanan Terpadu Fakultas Pendidikan Ekonomi dan Bisnis.

## 🌟 Features

- **Visitor Check-in/Check-out** dengan foto dan tanda tangan digital
- **Dashboard Analytics** dengan real-time statistics
- **User Management** dengan role-based access control
- **Document Generation** untuk laporan dan tanda terima
- **Feedback System** terintegrasi
- **Lost Items Management**
- **Complaint Management**

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
├── .git/                  # Git repository
├── .github/               # GitHub workflows dan templates  
├── .gitignore             # Git ignore rules
├── .vscode/               # VS Code workspace settings
├── backend/               # Express.js API server
│   ├── src/              # Backend source code
│   ├── uploads/          # File uploads
│   └── package.json      # Backend dependencies
├── configs/               # Configuration files (Docker, Nginx)
├── database.sql           # Main database schema
├── docs/                  # API & feature documentation
├── documentation/         # Project documentation
├── frontend/              # React frontend application
│   ├── src/              # Frontend source code
│   ├── public/           # Static assets
│   ├── dist/             # Build output
│   └── package.json      # Frontend dependencies
├── scripts/               # Deployment dan setup scripts
├── node_modules/          # Root dependencies (from monorepo)
├── package.json           # Root monorepo configuration
├── package-lock.json      # Lock file
├── README.md              # Project documentation
├── SETUP-COMPLETE.md      # Setup completion guide
├── start-dev.bat          # Windows development script
└── start-dev.ps1          # PowerShell development script
```

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- MySQL 8.0+

### 1. Install All Dependencies
```bash
```

### 2. Environment Setup

Create environment files:

**Frontend** (`frontend/.env`):

```env
VITE_API_URL=http://localhost:3000/api
VITE_APP_TITLE=ULT FPEB - Development
```

**Backend** (`backend/.env`):

```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=ult_fpeb_db
JWT_SECRET=your_jwt_secret_key
```

### 3. Database Setup

```bash
# Setup and seed the database
npm run setup-db
npm run seed
```

### 4. Run the Application

```bash
# Start both frontend and backend
npm run dev

# Or run them separately
npm run dev:frontend  # Frontend only (port 5173)
npm run dev:backend   # Backend only (port 3000)
```

## 📜 Available Scripts

### Root Level Commands

- `npm run dev` - Start both frontend and backend in development mode
- `npm run start` - Start both in production mode
- `npm run build` - Build the frontend for production
- `npm run install:all` - Install all dependencies
- `npm run clean` - Clean all node_modules and build artifacts
- `npm run setup-db` - Setup database schema
- `npm run seed` - Seed database with initial data

### Frontend Commands

- `npm run dev:frontend` - Start frontend development server
- `npm run build:frontend` - Build frontend for production
- `npm run lint` - Run ESLint

### Backend Commands

- `npm run dev:backend` - Start backend development server
- `npm run start:backend` - Start backend in production mode

## 🔑 Default Credentials

```
Email: admin@ult-fpeb.ac.id
Password: admin123
```

⚠️ **Change default password after first login**

## 📚 Documentation

- [API Documentation](./docs/)
- [Deployment Guide](./documentation/)

- [Feature Guides](./docs/)

## 🐳 Docker Deployment

```bash
# Development
docker-compose up -d

# Production
docker-compose -f configs/docker-compose.prod.yml up -d
```

## 📱 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express + MySQL
- **DevOps**: Docker + PM2 + Nginx

---

**ULT FPEB Visitor Management System** - Modern, Secure, Scalable 🚀
