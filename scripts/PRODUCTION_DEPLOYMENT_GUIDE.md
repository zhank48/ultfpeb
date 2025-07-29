# 🚀 ULT FPEB PRODUCTION DEPLOYMENT GUIDE

## 📋 Overview

Panduan lengkap untuk deployment sistem ULT FPEB ke server production. Script ini mencakup inisialisasi database lengkap dengan schema terbaru, foreign keys, indexes, data default, dan user accounts yang diperlukan.

## 🎯 Features Yang Diinisialisasi

### ✅ Database Schema (15 Tabel)
1. **Core System** (2 tabel): `users`, `visitors`
2. **Complaint Management** (4 tabel): `complaint_categories`, `complaint_fields`, `complaints`, `complaint_responses`
3. **Feedback System** (2 tabel): `feedback_categories`, `feedbacks`
4. **Lost Items** (2 tabel): `lost_items`, `item_returns`
5. **Configuration** (3 tabel): `configuration_categories`, `configuration_groups`, `configuration_options`
6. **Menu System** (2 tabel): `menu_config`, `menu_items`

### ✅ Foreign Key Constraints
- Semua relasi antar tabel dengan proper constraints
- Cascade delete untuk data yang terkait
- Referential integrity terjamin

### ✅ Performance Indexes
- Index untuk kolom yang sering di-query
- Composite indexes untuk performance optimal
- Foreign key indexes

### ✅ Default Data
- Kategori complaint dan feedback
- Konfigurasi sistem (units, purposes, locations, document types)
- Menu items dengan role-based access
- Menu configuration

### ✅ Default Users (Environment-Specific)

**Development Environment:**
- `adminult@fpeb.upi.edu` (password: `admin`) - Role: **Admin**
- `arsip@fpeb.upi.edu` (password: `admin`) - Role: **Admin**
- `manper@upi.edu` (password: `manper123`) - Role: **Receptionist**

**Production Environment:**
- `adminult@fpeb.upi.edu` (password: `AdminULT2025!`) - Role: **Admin**
- `arsip@fpeb.upi.edu` (password: `ArsipFPEB2025!`) - Role: **Admin**
- `manper@upi.edu` (password: `ManperUPI2025!`) - Role: **Receptionist**

## 🚀 Quick Start - Automated Installation

### For Windows/Laragon (Recommended)

```batch
cd d:\ULT
scripts\deploy-production.bat
```

This script will:
1. ✅ Check prerequisites (Node.js, MySQL, dependencies)
2. ✅ Validate environment and database connection
3. ✅ Install required packages (mysql2, bcrypt, dotenv)
4. ✅ Ask for deployment environment (dev/prod)
5. ✅ Create database if not exists
6. ✅ Run complete database initialization with error handling
7. ✅ Create all tables with constraints and indexes
8. ✅ Seed default data and users with environment-specific passwords
9. ✅ Verify deployment success
10. ✅ Provide next steps and login credentials

## 📋 Manual Installation Options

### Option 1: Node.js Script Only

```bash
# Install dependencies if needed
cd backend
npm install mysql2 bcrypt dotenv

# Run improved deployment
cd ..
node scripts/improved-production-deployment.cjs --env=development
# OR for production
node scripts/improved-production-deployment.cjs --env=production
```

### Option 2: SQL + Node.js (Hybrid)

```sql
-- 1. Create database
CREATE DATABASE ult_fpeb_db;
USE ult_fpeb_db;

-- 2. Run SQL schema
SOURCE scripts/production-deployment-schema.sql;
```

```bash
# 3. Create users with hashed passwords
node scripts/improved-production-deployment.cjs --env=development
```

### Option 3: Pure SQL (Manual User Creation)

```sql
-- Run the SQL schema
SOURCE scripts/production-deployment-schema.sql;

-- Manually create users (replace with bcrypt hashes)
INSERT INTO users (name, email, password, role) VALUES
('Admin ULT FPEB', 'adminult@fpeb.upi.edu', '$2b$10$hash...', 'Admin'),
('Arsip FPEB', 'arsip@fpeb.upi.edu', '$2b$10$hash...', 'Admin'),
('Manajemen Perkantoran', 'manper@upi.edu', '$2b$10$hash...', 'Receptionist');
```

## 🔧 Prerequisites

### System Requirements
- **Node.js** v16+ 
- **MySQL** 5.7+ atau MariaDB 10.3+
- **NPM** packages: `mysql2`, `bcrypt`, `dotenv`

### Database Requirements
- Database `ult_fpeb_db` harus sudah dibuat
- MySQL user dengan privileges: CREATE, ALTER, INSERT, SELECT, UPDATE, DELETE
- Koneksi ke database berjalan normal

### Environment Configuration
File `backend/.env` harus dikonfigurasi:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=ult_fpeb_db
DB_PORT=3306
```

## 📁 File Structure

```
d:\ULT\scripts\
├── improved-production-deployment.cjs          # Main improved Node.js deployment script
├── run-improved-deployment.bat              # Windows batch wrapper with validation
├── production-deployment-schema.sql         # Pure SQL schema (manual option)
└── PRODUCTION_DEPLOYMENT_GUIDE.md          # This documentation

Removed (deprecated):
├── production-deployment-init.js           # [REMOVED] Old deployment script
├── run-production-deployment-init.bat      # [REMOVED] Old batch wrapper
└── Various migration scripts               # [REMOVED] One-time migration files
```

## 🆕 What's Improved in New Deployment Script

### ✅ Enhanced Error Handling
- Comprehensive environment validation
- Database connection testing with retry logic
- Rollback capability on failure
- Better error messages and troubleshooting

### ✅ Environment Support
- Development vs Production mode
- Environment-specific passwords
- Configurable deployment options

### ✅ Better Validation
- Prerequisites checking (Node.js, MySQL, packages)
- Database existence verification
- Foreign key constraint validation
- Deployment success verification

### ✅ CommonJS Compatibility
- Fixed ES6 import issues
- Compatible with older Node.js environments
- Better package dependency management

## 🎛️ Configuration Details

### Default Complaint Categories
- **Layanan Umum** (#007bff) - Keluhan layanan fakultas
- **Fasilitas** (#28a745) - Keluhan infrastruktur
- **Administrasi** (#ffc107) - Keluhan proses administrasi
- **Akademik** (#17a2b8) - Keluhan layanan akademik
- **Lainnya** (#6c757d) - Keluhan umum lainnya

### Default Configuration Categories
- **Units/Bagian**: DEKANAT, Program Studi, Unit Penunjang
- **Tujuan Kunjungan**: Konsultasi, pengambilan dokumen, rapat, dll.
- **Jenis Dokumen**: Surat keterangan, transkrip, ijazah, dll.
- **Lokasi**: Ruang dekan, tata usaha, laboratorium, dll.

### Default Menu Items
- Dashboard, Visitor Management, Complaint Management
- Feedback Management, Lost Items, User Management
- Configuration (Admin only)

## 🔒 Security Features

### Password Security
- Semua password di-hash menggunakan bcrypt (salt rounds: 10)
- Default passwords **HARUS** diganti setelah first login

### Role-Based Access
- **Admin**: Full access ke semua features
- **Receptionist**: Limited access, tidak bisa manage users

### Database Security
- Foreign key constraints mencegah data corruption
- Proper indexing untuk performance dan security
- Clean schema tanpa redundant/orphaned data

## 🧪 Testing After Deployment

### 1. Backend Testing
```bash
cd backend
npm run dev
# Should start on http://localhost:3001 atau sesuai config
```

### 2. Frontend Testing  
```bash
npm run dev  
# Should start on http://localhost:5173 atau sesuai config
```

### 3. Database Testing
```sql
-- Check table creation
SHOW TABLES;

-- Check foreign keys
SELECT 
  TABLE_NAME,
  CONSTRAINT_NAME,
  REFERENCED_TABLE_NAME 
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE REFERENCED_TABLE_SCHEMA = 'ult_fpeb_db';

-- Check default data
SELECT COUNT(*) FROM complaint_categories;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM configuration_options;
```

### 4. Application Testing
- **Login Test**: http://localhost:5173/login
  - Try all 3 default user accounts
- **Complaint Form**: http://localhost:5173/complaint-form
  - Submit test complaint
- **Admin Panel**: Check all management pages
- **API Test**: Test endpoints dengan Postman/curl

## 🚨 Troubleshooting

### Common Issues

**Error: Database connection failed**
```
Solution:
1. Check MySQL is running (Laragon: Start All Services)
2. Verify database 'ult_fpeb_db' exists
3. Check credentials in backend/.env
4. Test connection: mysql -u root -p ult_fpeb_db
```

**Error: Cannot find module 'bcrypt'**
```
Solution:
cd backend
npm install bcrypt
```

**Error: Foreign key constraint fails**
```
Solution:
1. Drop existing tables: DROP DATABASE ult_fpeb_db; CREATE DATABASE ult_fpeb_db;
2. Run initialization script again
3. Check for existing data conflicts
```

**Error: Duplicate entry for key 'email'**
```
Solution:
- Users already exist, script will skip creation
- Use different email addresses or clear users table
```

### Performance Issues

**Slow query performance**
```
Solution:
1. Check indexes: SHOW INDEX FROM table_name;
2. Run ANALYZE TABLE table_name;
3. Monitor with EXPLAIN SELECT queries;
```

**Memory issues**
```
Solution:
1. Increase MySQL memory limits
2. Optimize query batch sizes
3. Use connection pooling
```

## 🔄 Maintenance & Updates

### Regular Maintenance
- **Backup database** sebelum updates
- **Monitor logs** untuk errors
- **Update passwords** secara berkala
- **Review user accounts** dan hapus yang tidak terpakai

### Schema Updates
Untuk update schema di masa depan:
1. Buat migration script terpisah
2. Test di development environment
3. Backup production database
4. Run migration dengan downtime minimal

### Data Cleanup
```sql
-- Remove old/test data
DELETE FROM complaints WHERE created_at < '2024-01-01';
DELETE FROM visitors WHERE check_in_time < '2024-01-01';

-- Optimize tables
OPTIMIZE TABLE complaints, visitors, feedbacks;
```

## 📞 Support

### Documentation
- **API Docs**: Check backend routes untuk endpoint details
- **Frontend Components**: Check src/components untuk UI components
- **Database Schema**: Check scripts/production-deployment-schema.sql

### Logs Location
- **Backend logs**: Console output atau log files
- **Frontend logs**: Browser developer console
- **MySQL logs**: `/var/log/mysql/` atau Laragon logs

### Contact
Untuk support deployment atau issues:
1. Check troubleshooting section di atas
2. Review error logs dan messages
3. Test individual components (database, backend, frontend)
4. Create detailed issue report dengan error messages

---

## 🎉 Success Checklist

Setelah menjalankan deployment initialization:

- [ ] ✅ Database terbuat dengan 15 tabel
- [ ] ✅ Foreign keys dan indexes ter-install
- [ ] ✅ Default data ter-seed (categories, configurations, menu)
- [ ] ✅ 3 default users terbuat dengan password ter-hash
- [ ] ✅ Backend server bisa start tanpa error
- [ ] ✅ Frontend bisa start dan connect ke backend  
- [ ] ✅ Login berhasil dengan default users
- [ ] ✅ Complaint form bisa submit data
- [ ] ✅ Admin panel accessible dan functional
- [ ] ✅ Database queries running efficiently

**🚀 DEPLOYMENT COMPLETED SUCCESSFULLY!**

*Jangan lupa ganti default passwords setelah first login untuk security!*
