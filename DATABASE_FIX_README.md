# Database Fix untuk Production Errors

## Masalah yang Diperbaiki

Script ini memperbaiki masalah-masalah berikut yang terjadi di production:

### 1. Error 500 - Visitor Checkout
```
Unknown column 'checkout_by_role' in 'field list'
```
**Penyebab**: Kolom `checkout_by_role`, `checkout_by_avatar`, dan kolom checkout operator lainnya tidak ada di tabel `visitors`.

### 2. Error Edit History
```
Table 'ult_fpeb_prod.visitor_edit_history' doesn't exist
```
**Penyebab**: Tabel `visitor_edit_history` tidak ada di database production.

### 3. Error 401/403 - Authentication Issues
**Penyebab**: Session dan JWT token tidak valid, kemungkinan karena struktur database tidak lengkap.

## Files yang Ditambahkan

### SQL Scripts
- `backend/sql/fix_checkout_fields_production.sql` - Menambahkan kolom checkout operator
- `backend/sql/create_visitor_edit_history_production.sql` - Membuat tabel visitor edit history  
- `backend/sql/production_database_fix.sql` - Script konsolidasi untuk semua fix

### Scripts
- `backend/scripts/fix-production-database.js` - Node.js script untuk menjalankan fix otomatis
- `fix-database.sh` - Bash script wrapper untuk kemudahan eksekusi

## Cara Menjalankan Fix

### Metode 1: Menggunakan Bash Script (Recommended)
```bash
# Di server production, di root directory project
chmod +x fix-database.sh
./fix-database.sh
```

### Metode 2: Menggunakan Node.js Script
```bash
# Di directory backend
cd backend
node scripts/fix-production-database.js
```

### Metode 3: Manual SQL Execution
```bash
# Login ke MySQL
mysql -u your_username -p your_database_name

# Jalankan script SQL
source backend/sql/production_database_fix.sql
```

## Struktur Database yang Ditambahkan

### Tabel `visitors` - Kolom Baru
- `checkout_by_name` VARCHAR(255) - Nama operator checkout
- `checkout_by_role` VARCHAR(50) - Role operator checkout  
- `checkout_by_avatar` VARCHAR(255) - Avatar URL operator checkout
- `checkout_by_user_id` INT - User ID operator checkout
- `checkout_by_email` VARCHAR(255) - Email operator checkout

### Tabel `visitor_edit_history` - Tabel Baru
```sql
CREATE TABLE visitor_edit_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    visitor_id INT NOT NULL,
    user_id INT NULL,
    user VARCHAR(255) NOT NULL,
    user_name VARCHAR(255) NULL,
    user_role VARCHAR(50) NULL,
    user_email VARCHAR(255) NULL,
    user_avatar VARCHAR(255) NULL,
    changes JSON NULL,
    original JSON NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_visitor_id (visitor_id),
    INDEX idx_user_id (user_id),
    INDEX idx_timestamp (timestamp)
);
```

## Setelah Menjalankan Fix

### 1. Restart Aplikasi
```bash
# Jika menggunakan PM2
pm2 restart ult-fpeb

# Atau menggunakan npm
npm run restart
```

### 2. Test Functionality
- ✅ Test visitor checkout
- ✅ Test user login  
- ✅ Test password change
- ✅ Test visitor edit history

### 3. Monitor Logs
```bash
# PM2 logs
pm2 logs ult-fpeb

# Manual logs
tail -f logs/backend-error.log
```

## Verifikasi Fix Berhasil

Script akan menampilkan status berikut jika berhasil:
- ✅ checkout_by_name exists
- ✅ checkout_by_role exists  
- ✅ checkout_by_avatar exists
- ✅ visitor_edit_history table exists

## Troubleshooting

### Jika masih ada error setelah fix:
1. Pastikan database connection settings benar di `.env`
2. Pastikan user database memiliki permission untuk ALTER TABLE
3. Restart aplikasi setelah fix
4. Check logs untuk error yang berbeda

### Jika script gagal dijalankan:
1. Pastikan Node.js dan npm terinstall
2. Pastikan berada di directory yang benar
3. Jalankan `npm install` di directory backend
4. Check permission untuk bash script: `chmod +x fix-database.sh`

## Rollback (Jika Diperlukan)

Jika perlu rollback, jalankan:
```sql
-- Hapus kolom yang ditambahkan
ALTER TABLE visitors DROP COLUMN checkout_by_name;
ALTER TABLE visitors DROP COLUMN checkout_by_role;
ALTER TABLE visitors DROP COLUMN checkout_by_avatar;
ALTER TABLE visitors DROP COLUMN checkout_by_user_id;
ALTER TABLE visitors DROP COLUMN checkout_by_email;

-- Hapus tabel visitor_edit_history
DROP TABLE visitor_edit_history;
```

## Contact

Jika masih ada masalah setelah menjalankan fix ini, silakan:
1. Check logs aplikasi
2. Jalankan diagnostic script: `node scripts/production-diagnostic.js`
3. Contact developer dengan log error yang spesifik