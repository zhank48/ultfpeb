# 🔧 CHECKOUT ERROR 500 FIX - COMMAND REFERENCE

## Masalah yang Diperbaiki
Error: `PATCH https://10.15.0.120/api/visitors/1/checkout 500 (Internal Server Error)`
Root Cause: `Unknown column 'checkout_by_role' in 'field list'`

## 🚀 QUICK FIX COMMANDS

### Metode 1: Direct MySQL Execution (RECOMMENDED)
```bash
# Langsung jalankan fix script
mysql -h localhost -u ult_fpeb_user -p ult_fpeb_prod < backend/sql/fix_checkout_error_500.sql

# Verifikasi hasil fix
mysql -h localhost -u ult_fpeb_user -p ult_fpeb_prod < backend/sql/verify_checkout_fix.sql

# Restart aplikasi
pm2 restart ult-fpeb-backend
```

### Metode 2: Interactive MySQL Session
```bash
# Login ke MySQL
mysql -h localhost -u ult_fpeb_user -p

# Di dalam MySQL prompt:
USE ult_fpeb_prod;
source backend/sql/fix_checkout_error_500.sql;
source backend/sql/verify_checkout_fix.sql;
exit;

# Restart aplikasi  
pm2 restart ult-fpeb-backend
```

### Metode 3: One-Line Fix Commands
```bash
# Password: 6QFLGp3ubaty8kbdXU8OU9k+8ReMU6Gx

# Fix database
mysql -h localhost -u ult_fpeb_user -p6QFLGp3ubaty8kbdXU8OU9k+8ReMU6Gx ult_fpeb_prod < backend/sql/fix_checkout_error_500.sql

# Verify fix
mysql -h localhost -u ult_fpeb_user -p6QFLGp3ubaty8kbdXU8OU9k+8ReMU6Gx ult_fpeb_prod < backend/sql/verify_checkout_fix.sql

# Restart app
pm2 restart ult-fpeb-backend
```

## 📋 Manual SQL Commands (Copy-Paste)

Jika script file tidak bisa dijalankan, copy-paste command berikut satu per satu ke MySQL:

```sql
-- 1. Add missing checkout columns
ALTER TABLE visitors ADD COLUMN checkout_by_name VARCHAR(255) NULL COMMENT 'Name of checkout operator';
ALTER TABLE visitors ADD COLUMN checkout_by_role VARCHAR(50) NULL COMMENT 'Role of checkout operator';
ALTER TABLE visitors ADD COLUMN checkout_by_avatar VARCHAR(255) NULL COMMENT 'Avatar URL of checkout operator';
ALTER TABLE visitors ADD COLUMN checkout_by_user_id INT NULL COMMENT 'User ID of checkout operator';
ALTER TABLE visitors ADD COLUMN checkout_by_email VARCHAR(255) NULL COMMENT 'Email of checkout operator';

-- 2. Create visitor_edit_history table
CREATE TABLE IF NOT EXISTS visitor_edit_history (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Visitor edit history tracking';

-- 3. Verify the fix
SHOW COLUMNS FROM visitors LIKE '%checkout%';
DESCRIBE visitor_edit_history;
```

## ✅ VERIFICATION COMMANDS

Setelah menjalankan fix, verifikasi dengan commands berikut:

```bash
# Check MySQL tables
mysql -h localhost -u ult_fpeb_user -p ult_fpeb_prod -e "SHOW COLUMNS FROM visitors LIKE '%checkout%';"

# Check if edit history table exists  
mysql -h localhost -u ult_fpeb_user -p ult_fpeb_prod -e "DESCRIBE visitor_edit_history;"

# Check PM2 process status
pm2 list

# Check application logs
pm2 logs ult-fpeb-backend --lines 20
```

## 🔍 TROUBLESHOOTING

### Jika masih error setelah fix:

1. **Check column exists:**
   ```bash
   mysql -h localhost -u ult_fpeb_user -p ult_fpeb_prod -e "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='visitors' AND COLUMN_NAME='checkout_by_role';"
   ```

2. **Check application restart:**
   ```bash
   pm2 restart ult-fpeb-backend
   pm2 logs ult-fpeb-backend --lines 10
   ```

3. **Test checkout endpoint:**
   ```bash
   # Test dengan curl (ganti dengan token yang valid)
   curl -X PATCH "https://10.15.0.120/api/visitors/1/checkout" \
        -H "Authorization: Bearer YOUR_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{}'
   ```

### Common Error Solutions:

- **"Duplicate column name"** → Normal, column already exists
- **"Table already exists"** → Normal, table already exists  
- **"Access denied"** → Check database credentials
- **"PM2 process not found"** → Use correct process name: `ult-fpeb-backend`

## 📊 SUCCESS INDICATORS

Fix berhasil jika:
- ✅ 5 checkout columns ditambahkan ke table `visitors`
- ✅ Table `visitor_edit_history` berhasil dibuat
- ✅ Aplikasi restart tanpa error
- ✅ Checkout visitor berfungsi normal (no 500 error)

## 🔄 POST-FIX STEPS

1. **Restart aplikasi:**
   ```bash
   pm2 restart ult-fpeb-backend
   ```

2. **Test checkout functionality** di frontend

3. **Monitor logs untuk error lain:**
   ```bash
   pm2 logs ult-fpeb-backend --follow
   ```

---

## 📞 Support

Jika masih ada masalah:
1. Jalankan verification script untuk detail analysis
2. Check pm2 logs untuk error messages
3. Pastikan semua 5 checkout columns sudah ada di database