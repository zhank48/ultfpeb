@echo off
echo ============================================================================
echo       ULT FPEB - Setup Apache untuk Project di Luar Laragon
echo       Project Location: D:\ULT Deploy
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
set "PROJECT_PATH=D:\ULT Deploy"
echo [INFO] Setting up for IP: %IP%
echo [INFO] Project Path: %PROJECT_PATH%

REM Step 1: Backup default Apache config
echo.
echo [STEP 1] Backing up default Apache configuration...
if not exist "C:\laragon\etc\apache2\sites-enabled\000-default.conf.backup" (
    if exist "C:\laragon\etc\apache2\sites-enabled\000-default.conf" (
        copy "C:\laragon\etc\apache2\sites-enabled\000-default.conf" "C:\laragon\etc\apache2\sites-enabled\000-default.conf.backup"
        echo [SUCCESS] Default config backed up
    )
)

REM Step 2: Disable default Laragon sites
echo.
echo [STEP 2] Disabling default Laragon sites...
if exist "C:\laragon\etc\apache2\sites-enabled\000-default.conf" (
    ren "C:\laragon\etc\apache2\sites-enabled\000-default.conf" "000-default.conf.disabled"
    echo [SUCCESS] Default site disabled
)
if exist "C:\laragon\etc\apache2\sites-enabled\default-ssl.conf" (
    ren "C:\laragon\etc\apache2\sites-enabled\default-ssl.conf" "default-ssl.conf.disabled"
    echo [SUCCESS] Default SSL site disabled
)

REM Step 3: Copy environment files
echo.
echo [STEP 3] Setting up environment files...
copy "%PROJECT_PATH%\backend\.env.laragon" "%PROJECT_PATH%\backend\.env"
copy "%PROJECT_PATH%\frontend\.env.laragon" "%PROJECT_PATH%\frontend\.env"
echo [SUCCESS] Environment files copied

REM Step 4: Create SSL directory and certificate
echo.
echo [STEP 4] Creating SSL certificate...
if not exist "C:\laragon\etc\ssl" mkdir "C:\laragon\etc\ssl"
cd /d "C:\laragon\etc\ssl"

REM Copy cert config
copy "%PROJECT_PATH%\configs\cert.conf" "cert.conf"

REM Generate certificate using Laragon's OpenSSL
"C:\laragon\bin\openssl\openssl.exe" req -new -x509 -keyout ult-fpeb.key -out ult-fpeb.crt -days 365 -config cert.conf -nodes
if %errorLevel% == 0 (
    echo [SUCCESS] SSL certificate generated for %IP%
) else (
    echo [ERROR] Failed to generate SSL certificate
    pause
    exit /b 1
)

REM Step 5: Install project dependencies
echo.
echo [STEP 5] Installing project dependencies...
cd /d "%PROJECT_PATH%"
echo Installing root dependencies...
call npm install --silent
cd backend
echo Installing backend dependencies...
call npm install --silent
cd ..\frontend
echo Installing frontend dependencies...
call npm install --silent
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

REM Step 7: Copy and enable virtual host
echo.
echo [STEP 7] Setting up Apache virtual host...
copy "%PROJECT_PATH%\configs\apache-vhost.conf" "C:\laragon\etc\apache2\sites-enabled\ult-fpeb.conf"
echo [SUCCESS] Virtual host configured for external project

REM Step 8: Verify project structure
echo.
echo [STEP 8] Verifying project structure...
if exist "%PROJECT_PATH%\frontend\dist\index.html" (
    echo [SUCCESS] Frontend build found
) else (
    echo [ERROR] Frontend build not found at %PROJECT_PATH%\frontend\dist\
    echo [INFO] Make sure to run 'npm run build' in frontend directory
)

if exist "%PROJECT_PATH%\backend\server.js" (
    echo [SUCCESS] Backend server found
) else (
    echo [ERROR] Backend server not found at %PROJECT_PATH%\backend\server.js
)

REM Step 9: Setup database
echo.
echo [STEP 9] Setting up database...
cd /d "%PROJECT_PATH%"
call npm run setup-db:dev
if %errorLevel% == 0 (
    echo [SUCCESS] Database setup completed
) else (
    echo [WARNING] Database setup had issues, please check manually
)

REM Step 10: Configure Windows Firewall
echo.
echo [STEP 10] Configuring Windows Firewall...
netsh advfirewall firewall add rule name="ULT FPEB HTTP" dir=in action=allow protocol=TCP localport=80 >nul 2>&1
netsh advfirewall firewall add rule name="ULT FPEB HTTPS" dir=in action=allow protocol=TCP localport=443 >nul 2>&1
netsh advfirewall firewall add rule name="ULT FPEB Backend" dir=in action=allow protocol=TCP localport=3001 >nul 2>&1
echo [SUCCESS] Firewall rules added

echo.
echo ============================================================================
echo                          SETUP COMPLETED!
echo ============================================================================
echo.
echo Your ULT FPEB project is now configured for network access!
echo.
echo PROJECT CONFIGURATION:
echo   Location: %PROJECT_PATH%
echo   Frontend: %PROJECT_PATH%\frontend\dist
echo   Backend:  %PROJECT_PATH%\backend
echo   Uploads:  %PROJECT_PATH%\backend\uploads
echo.
echo ACCESS URLs:
echo   HTTPS: https://%IP%
echo   HTTP:  http://%IP% (redirects to HTTPS)
echo   Backend API: http://%IP%:3001/api/health
echo.
echo NEXT STEPS:
echo 1. RESTART LARAGON (Apache + MySQL) to apply changes
echo 2. Start backend server:
echo    cd "%PROJECT_PATH%\backend"
echo    npm start
echo 3. Test access: https://%IP%
echo.
echo IMPORTANT NOTES:
echo - Project is served from: %PROJECT_PATH%\frontend\dist
echo - Default Laragon sites have been disabled
echo - To restore Laragon defaults, rename .disabled files back
echo - Certificate will show security warning (normal for self-signed)
echo.
echo TROUBLESHOOTING:
echo - If shows Laragon page: Restart Apache service in Laragon
echo - If certificate error: Accept the security warning in browser
echo - If backend API fails: Check backend is running on port 3001
echo - Test locally first: https://localhost
echo.
pause