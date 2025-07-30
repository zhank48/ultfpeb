@echo off
echo ============================================================================
echo       ULT FPEB - Setup Laragon Apache HTTPS untuk IP 192.168.92.203
echo ============================================================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [INFO] Running as Administrator
) else (
    echo [ERROR] Please run as Administrator
    pause
    exit /b 1
)

set "IP=192.168.92.203"
echo [INFO] Setting up for IP: %IP%

REM Step 1: Copy environment files
echo.
echo [STEP 1] Setting up environment files...
copy "%~dp0..\backend\.env.laragon" "%~dp0..\backend\.env"
copy "%~dp0..\frontend\.env.laragon" "%~dp0..\frontend\.env"
echo [SUCCESS] Environment files copied

REM Step 2: Create SSL directory
echo.
echo [STEP 2] Creating SSL directory...
if not exist "C:\laragon\etc\ssl" mkdir "C:\laragon\etc\ssl"
echo [SUCCESS] SSL directory created

REM Step 3: Generate SSL certificate
echo.
echo [STEP 3] Generating self-signed certificate for %IP%...
cd /d "C:\laragon\etc\ssl"

REM Copy cert config
copy "%~dp0..\configs\cert.conf" "cert.conf"

REM Generate certificate using Laragon's OpenSSL
"C:\laragon\bin\openssl\openssl.exe" req -new -x509 -keyout ult-fpeb.key -out ult-fpeb.crt -days 365 -config cert.conf -nodes
if %errorLevel% == 0 (
    echo [SUCCESS] SSL certificate generated for %IP%
) else (
    echo [ERROR] Failed to generate SSL certificate
    pause
    exit /b 1
)

REM Step 4: Disable default Laragon sites and setup virtual host
echo.
echo [STEP 4] Setting up Apache virtual host...

REM Disable default Laragon sites
if exist "C:\laragon\etc\apache2\sites-enabled\000-default.conf" (
    ren "C:\laragon\etc\apache2\sites-enabled\000-default.conf" "000-default.conf.disabled"
    echo [INFO] Default Laragon site disabled
)
if exist "C:\laragon\etc\apache2\sites-enabled\default-ssl.conf" (
    ren "C:\laragon\etc\apache2\sites-enabled\default-ssl.conf" "default-ssl.conf.disabled"
    echo [INFO] Default SSL site disabled
)

copy "%~dp0..\configs\apache-vhost.conf" "C:\laragon\etc\apache2\sites-enabled\ult-fpeb.conf"
echo [SUCCESS] Virtual host configured for %IP% with external project path

REM Step 5: Install dependencies
echo.
echo [STEP 5] Installing dependencies...
cd /d "%~dp0.."
echo Installing root dependencies...
call npm install
cd backend
echo Installing backend dependencies...
call npm install
cd ..\frontend
echo Installing frontend dependencies...
call npm install
echo [SUCCESS] Dependencies installed

REM Step 6: Build frontend
echo.
echo [STEP 6] Building frontend...
call npm run build
if %errorLevel% == 0 (
    echo [SUCCESS] Frontend built successfully
) else (
    echo [WARNING] Frontend build had issues, but continuing...
)

REM Step 7: Setup database
echo.
echo [STEP 7] Setting up database...
cd /d "%~dp0.."
call npm run setup-db:dev
if %errorLevel% == 0 (
    echo [SUCCESS] Database setup completed
) else (
    echo [WARNING] Database setup had issues, please check manually
)

REM Step 8: Configure Windows Firewall
echo.
echo [STEP 8] Configuring Windows Firewall...
netsh advfirewall firewall add rule name="ULT FPEB HTTP" dir=in action=allow protocol=TCP localport=80 >nul 2>&1
netsh advfirewall firewall add rule name="ULT FPEB HTTPS" dir=in action=allow protocol=TCP localport=443 >nul 2>&1
netsh advfirewall firewall add rule name="ULT FPEB Backend" dir=in action=allow protocol=TCP localport=3001 >nul 2>&1
echo [SUCCESS] Firewall rules added

echo.
echo ============================================================================
echo                            SETUP COMPLETED!
echo ============================================================================
echo.
echo Your ULT FPEB application is ready for HTTPS access!
echo.
echo ACCESS URLs:
echo   HTTPS: https://%IP%
echo   HTTP:  http://%IP% (redirects to HTTPS)
echo.
echo NEXT STEPS:
echo 1. Start Laragon (Apache + MySQL)
echo 2. Start backend server for network access:
echo    scripts\start-backend-network.bat
echo    OR manually: cd backend && npm start
echo.
echo 3. Open browser and go to: https://%IP%
echo.
echo IMPORTANT NOTES:
echo - Browser will show security warning (normal for self-signed cert)
echo - Click "Advanced" then "Proceed to %IP% (unsafe)" to continue
echo - Add certificate to trusted store to remove warning (optional)
echo - Certificate is valid for 1 year
echo - Make sure other computers are on same network (192.168.92.x)
echo.
echo TROUBLESHOOTING:
echo - If can't access: Check Windows Firewall and antivirus
echo - If Apache won't start: Check port 80/443 not used by other apps
echo - If backend errors: Check MySQL is running in Laragon
echo - Test network access: scripts\test-network-access.bat
echo - Test local first: https://localhost
echo.
echo Default Login Credentials:
echo - Admin: admin@ultfpeb.upi.edu / admin123
echo - Receptionist: receptionist@ultfpeb.upi.edu / receptionist123
echo.
pause