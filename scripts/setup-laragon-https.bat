@echo off
echo ============================================================================
echo       ULT FPEB - Setup Laragon Apache HTTPS untuk Akses IP Lokal
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

REM Get current IP address
echo [INFO] Detecting IP address...
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /i "IPv4"') do (
    for /f "tokens=1" %%j in ("%%i") do (
        set "IP=%%j"
        goto :found_ip
    )
)
:found_ip
echo [INFO] Detected IP: %IP%

REM Step 1: Copy environment files
echo.
echo [STEP 1] Setting up environment files...
copy "%~dp0..\backend\.env.laragon" "%~dp0..\backend\.env"
copy "%~dp0..\frontend\.env.laragon" "%~dp0..\frontend\.env"

REM Update IP in env files
powershell -Command "(gc '%~dp0..\backend\.env') -replace '192.168.1.100', '%IP%' | Out-File -encoding UTF8 '%~dp0..\backend\.env'"
powershell -Command "(gc '%~dp0..\frontend\.env') -replace '192.168.1.100', '%IP%' | Out-File -encoding UTF8 '%~dp0..\frontend\.env'"
echo [SUCCESS] Environment files updated with IP: %IP%

REM Step 2: Create SSL directory
echo.
echo [STEP 2] Creating SSL directory...
if not exist "C:\laragon\etc\ssl" mkdir "C:\laragon\etc\ssl"
echo [SUCCESS] SSL directory created

REM Step 3: Generate SSL certificate
echo.
echo [STEP 3] Generating self-signed certificate...
cd /d "C:\laragon\etc\ssl"

REM Create certificate config with detected IP
echo [req] > cert.conf
echo default_bits = 2048 >> cert.conf
echo prompt = no >> cert.conf
echo default_md = sha256 >> cert.conf
echo req_extensions = req_ext >> cert.conf
echo distinguished_name = dn >> cert.conf
echo. >> cert.conf
echo [dn] >> cert.conf
echo C=ID >> cert.conf
echo ST=West Java >> cert.conf
echo L=Bandung >> cert.conf
echo O=ULT FPEB UPI >> cert.conf
echo OU=IT Department >> cert.conf
echo CN=%IP% >> cert.conf
echo. >> cert.conf
echo [req_ext] >> cert.conf
echo subjectAltName = @alt_names >> cert.conf
echo. >> cert.conf
echo [alt_names] >> cert.conf
echo IP.1 = %IP% >> cert.conf
echo IP.2 = 127.0.0.1 >> cert.conf
echo DNS.1 = localhost >> cert.conf
echo DNS.2 = ult-fpeb.local >> cert.conf

REM Generate certificate using Laragon's OpenSSL
"C:\laragon\bin\openssl\openssl.exe" req -new -x509 -keyout ult-fpeb.key -out ult-fpeb.crt -days 365 -config cert.conf -nodes
if %errorLevel% == 0 (
    echo [SUCCESS] SSL certificate generated
) else (
    echo [ERROR] Failed to generate SSL certificate
    pause
    exit /b 1
)

REM Step 4: Copy Apache virtual host
echo.
echo [STEP 4] Setting up Apache virtual host...
copy "%~dp0..\configs\apache-vhost.conf" "C:\laragon\etc\apache2\sites-enabled\ult-fpeb.conf"

REM Update paths in vhost file with detected IP
powershell -Command "(gc 'C:\laragon\etc\apache2\sites-enabled\ult-fpeb.conf') -replace '192.168.1.100', '%IP%' | Out-File -encoding UTF8 'C:\laragon\etc\apache2\sites-enabled\ult-fpeb.conf'"
echo [SUCCESS] Virtual host configured

REM Step 5: Install dependencies
echo.
echo [STEP 5] Installing dependencies...
cd /d "%~dp0.."
call npm install
cd backend
call npm install
cd ..\frontend
call npm install
echo [SUCCESS] Dependencies installed

REM Step 6: Build frontend
echo.
echo [STEP 6] Building frontend...
call npm run build
echo [SUCCESS] Frontend built

REM Step 7: Setup database
echo.
echo [STEP 7] Setting up database...
cd /d "%~dp0.."
call npm run setup-db:dev
echo [SUCCESS] Database setup completed

REM Step 8: Configure Windows Firewall
echo.
echo [STEP 8] Configuring Windows Firewall...
netsh advfirewall firewall add rule name="ULT FPEB HTTP" dir=in action=allow protocol=TCP localport=80
netsh advfirewall firewall add rule name="ULT FPEB HTTPS" dir=in action=allow protocol=TCP localport=443
netsh advfirewall firewall add rule name="ULT FPEB Backend" dir=in action=allow protocol=TCP localport=3001
echo [SUCCESS] Firewall rules added

echo.
echo ============================================================================
echo                            SETUP COMPLETED!
echo ============================================================================
echo.
echo Your ULT FPEB application is ready for HTTPS access!
echo.
echo IMPORTANT STEPS:
echo 1. Start Laragon (Apache + MySQL)
echo 2. Start backend: npm run dev:backend
echo 3. Access from any computer: https://%IP%
echo.
echo NOTES:
echo - Browser will show security warning (normal for self-signed cert)
echo - Click "Advanced" and "Proceed to %IP%" to continue
echo - Certificate valid for 1 year
echo.
echo TROUBLESHOOTING:
echo - If can't access, check Windows Firewall
echo - Make sure other computers are on same network
echo - Try restarting Laragon services
echo.
pause