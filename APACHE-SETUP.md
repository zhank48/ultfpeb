# Apache Setup untuk Project ULT FPEB di Luar Laragon

Project ULT FPEB berada di `D:\ULT Deploy`, bukan di folder `C:\laragon\www\`. Berikut cara mengkonfigurasi Apache agar mengarah ke project yang benar.

## Quick Setup (Recommended)

```bash
# Run as Administrator
scripts\setup-apache-external-project.bat
```

## Manual Setup

### 1. Disable Default Laragon Sites

```bash
# Masuk ke folder sites-enabled
cd C:\laragon\etc\apache2\sites-enabled\

# Disable default sites
ren 000-default.conf 000-default.conf.disabled
ren default-ssl.conf default-ssl.conf.disabled
```

### 2. Copy Virtual Host Configuration

```bash
copy "D:\ULT Deploy\configs\apache-vhost.conf" "C:\laragon\etc\apache2\sites-enabled\ult-fpeb.conf"
```

### 3. Generate SSL Certificate

```bash
mkdir C:\laragon\etc\ssl
cd C:\laragon\etc\ssl
copy "D:\ULT Deploy\configs\cert.conf" cert.conf
"C:\laragon\bin\openssl\openssl.exe" req -new -x509 -keyout ult-fpeb.key -out ult-fpeb.crt -days 365 -config cert.conf -nodes
```

### 4. Build Frontend

```bash
cd "D:\ULT Deploy\frontend"
npm install
npm run build
```

### 5. Setup Environment

```bash
copy "D:\ULT Deploy\backend\.env.laragon" "D:\ULT Deploy\backend\.env"
copy "D:\ULT Deploy\frontend\.env.laragon" "D:\ULT Deploy\frontend\.env"
```

### 6. Restart Apache

1. Buka Laragon
2. Stop Apache
3. Start Apache
4. Test: `https://192.168.92.203`

## Verification

Virtual host configuration sekarang mengarah ke:
- **DocumentRoot**: `D:/ULT Deploy/frontend/dist` ✅
- **Uploads**: `D:/ULT Deploy/backend/uploads` ✅
- **SSL Certificate**: `C:/laragon/etc/ssl/ult-fpeb.crt` ✅

## Troubleshooting

### Masih Mengarah ke Halaman Laragon

1. **Check virtual host aktif:**
   ```bash
   dir C:\laragon\etc\apache2\sites-enabled\
   ```
   Harus ada: `ult-fpeb.conf`
   Tidak ada: `000-default.conf`, `default-ssl.conf`

2. **Restart Apache** di Laragon

3. **Check DocumentRoot** di file `ult-fpeb.conf`:
   ```apache
   DocumentRoot "D:/ULT Deploy/frontend/dist"
   ```

4. **Check frontend build exists:**
   ```bash
   dir "D:\ULT Deploy\frontend\dist\index.html"
   ```

### Certificate Error

- Normal untuk self-signed certificate
- Click "Advanced" → "Proceed to 192.168.92.203"
- Atau import certificate ke browser

### Backend API Error

1. Start backend:
   ```bash
   cd "D:\ULT Deploy\backend"
   npm start
   ```

2. Test API:
   ```bash
   curl http://192.168.92.203:3001/api/health
   ```

## Restore Laragon Defaults

```bash
scripts\restore-laragon-defaults.bat
```

## File Locations

- **Project**: `D:\ULT Deploy\`
- **Apache Config**: `C:\laragon\etc\apache2\sites-enabled\ult-fpeb.conf`
- **SSL Certificate**: `C:\laragon\etc\ssl\ult-fpeb.crt`
- **Frontend Build**: `D:\ULT Deploy\frontend\dist\`
- **Backend**: `D:\ULT Deploy\backend\`