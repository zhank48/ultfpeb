# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ULT FPEB Visitor Management System - A comprehensive full-stack visitor management application for Unit Layanan Terpadu Fakultas Pendidikan Ekonomi dan Bisnis UPI, built with React 19 + Vite frontend and Node.js + Express + MySQL backend.

## Essential Commands

### Development
```bash
# Start development servers (both frontend & backend)
npm run dev

# Start individual services
npm run dev:frontend      # React dev server on port 5173
npm run dev:backend       # Node.js server on port 3001

# Alternative individual starts
npm run dev:frontend-only # Frontend only
npm run dev:backend-only  # Backend only
```

### Building & Production
```bash
# Build frontend for production
npm run build

# Build everything for production
npm run build:production

# Start production servers
npm start
```

### Database Operations
```bash
# Setup database (creates tables, seeds data)
npm run setup-db

# Development database setup
npm run setup-db:dev

# Reset database (drops and recreates)
npm run reset-db

# Check database connection
npm run check-db

# Seed sample data
npm run seed
```

### Environment Management
```bash
# Switch to development environment
npm run env:dev

# Switch to production environment
npm run env:prod
```

### Maintenance
```bash
# Install all dependencies (root + workspaces)
npm run install:all

# Clean all build artifacts and node_modules
npm run clean

# View logs
npm run logs           # Combined logs
npm run logs:error     # Error logs only
```

### Testing & Linting
```bash
# Run linting (frontend only)
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Run tests (frontend only, currently not configured)
npm run test
```

## Architecture Overview

### Technology Stack
**Frontend:**
- React 19 + Vite 6 + React Router DOM 7
- Tailwind CSS 4 + CoreUI React 5 for UI components
- Axios for API communication + React Context for state management
- Recharts for analytics, SweetAlert2 for notifications

**Backend:**
- Node.js + Express.js 4 with ES modules
- MySQL 8 with mysql2 connection pooling
- JWT authentication + bcrypt password hashing
- Multer + Sharp for file uploads and image processing
- Docxtemplater for Word document generation

### Project Structure
```
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── config/         # Database & environment configuration
│   │   ├── middleware/     # Auth, upload, validation middleware
│   │   ├── models/         # Data access layer (User, Visitor, etc)
│   │   ├── routes/         # API endpoints by feature
│   │   ├── services/       # Business logic & document generation
│   │   └── utils/          # Helper utilities
│   ├── sql/                # Database schemas and migrations
│   ├── templates/          # Word document templates (.docx)
│   └── uploads/            # File storage (photos, signatures, reports)
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route-specific page components
│   │   ├── context/        # React Context providers (Auth, Visitor)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── utils/          # API clients and utilities
│   │   └── styles/         # Global styles and themes
├── configs/                # Docker and deployment configurations
├── docs/                   # API.md and DEPLOYMENT.md documentation
└── scripts/                # Deployment and production scripts
```

### Key Architectural Patterns

**Backend - Layered Architecture:**
- **Routes** → **Middleware** → **Models** → **Services** → **Database**
- JWT-based authentication with role-based access control (Admin/Receptionist)
- File upload system with organized directory structure in `uploads/`
- Document generation services using Word templates with image embedding

**Frontend - Context + Hooks Pattern:**
- `AuthContext` for user authentication and session management
- `VisitorContext` for global visitor data synchronization  
- Protected routes with role-based access control
- API integration with Axios interceptors for token management

**Database Schema:**
- Core entities: Users, Visitors, Complaints, Feedback, Lost Items, Configurations
- Soft delete pattern with audit trails
- Hierarchical configuration system for dynamic form fields

## Development Guidelines

### Authentication Flow
1. Users authenticate via `/api/auth/login` with email/password
2. Backend returns JWT token valid for 24 hours
3. Frontend stores token in localStorage and includes in API requests
4. Protected routes check authentication status via AuthContext
5. Role-based permissions control access to admin features

### File Upload Pattern
- Photos and signatures stored in organized directories under `uploads/`
- Backend middleware handles multipart/form-data with 5MB size limit
- Sharp library processes images (resize, optimize)
- Frontend captures images via webcam or file input

### Document Generation
- Word templates in `backend/templates/` with placeholders
- DocxService processes templates with visitor data and images
- Generated documents stored in `uploads/reports/`
- Frontend can download generated documents via blob responses

### API Integration
- All API calls go through `frontend/src/utils/api.js`
- Axios interceptors handle authentication headers automatically
- Error handling with user-friendly messages via SweetAlert2
- Loading states managed at component level

### Database Operations
- Models use static methods with MySQL2 connection pooling
- Parameterized queries prevent SQL injection
- Connection configuration in `backend/src/config/database.js`
- Database setup script creates tables and seeds initial data

## Common Development Tasks

### Adding New API Endpoints
1. Create route handler in `backend/src/routes/[feature].js`
2. Add authentication middleware if needed
3. Implement business logic in models or services
4. Update API documentation in `docs/API.md`

### Adding New Frontend Pages
1. Create page component in `frontend/src/pages/`
2. Add route to `App.jsx` with appropriate protection
3. Update navigation in `LayoutCoreUILight.jsx` if needed
4. Implement API integration using existing patterns

### Database Schema Changes
1. Create SQL migration in `backend/sql/`
2. Update relevant models in `backend/src/models/`
3. Test with `npm run setup-db:dev`
4. Update documentation as needed

### Environment Configuration
- Backend: `.env.development`, `.env.production` in `backend/`
- Frontend: `.env.development`, `.env.production` in `frontend/`
- Use `npm run env:dev` or `npm run env:prod` to switch environments
- Database auto-detection works with Laragon, XAMPP, WAMP, or system PATH

## Deployment Information

**Production Deployment:**
- Use provided scripts in `scripts/` directory
- Docker Compose configuration in `configs/`
- PM2 process management with ecosystem.config.cjs
- Nginx reverse proxy configuration included
- SSL certificate setup with Let's Encrypt

**Environment Requirements:**
- Node.js 18+ and npm 9+
- MySQL 8.0+ (Laragon, XAMPP, WAMP, or standalone)
- 4GB RAM minimum, 8GB recommended

**Default Login Credentials:**
- Admin: admin@ultfpeb.up.edu / admin123
- Receptionist: receptionist@ultfpeb.up.edu / receptionist123

**Key URLs:**
- Development Frontend: http://localhost:5173
- Development Backend: http://localhost:3001
- API Health Check: http://localhost:3001/api/health

## Testing Strategy

Currently tests are not configured. When implementing:
- Use Vitest for unit testing (already in frontend package.json)
- Test API endpoints with authentication flows
- Test file upload and document generation
- Test responsive UI components

## Important Notes

- The system uses ES modules (`"type": "module"`) in both frontend and backend
- File uploads require proper CORS configuration for cross-origin access
- Database connection pools should be monitored in production
- JWT tokens expire in 24 hours and require refresh mechanism
- All sensitive operations require authentication and role-based authorization