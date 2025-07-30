@echo off
echo ============================================================================
echo              Restore Laragon Default Apache Configuration
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

echo [INFO] Restoring Laragon default configuration...

REM Remove ULT FPEB virtual host
if exist "C:\laragon\etc\apache2\sites-enabled\ult-fpeb.conf" (
    del "C:\laragon\etc\apache2\sites-enabled\ult-fpeb.conf"
    echo [SUCCESS] ULT FPEB virtual host removed
)

REM Restore default sites
if exist "C:\laragon\etc\apache2\sites-enabled\000-default.conf.disabled" (
    ren "C:\laragon\etc\apache2\sites-enabled\000-default.conf.disabled" "000-default.conf"
    echo [SUCCESS] Default site restored
)

if exist "C:\laragon\etc\apache2\sites-enabled\default-ssl.conf.disabled" (
    ren "C:\laragon\etc\apache2\sites-enabled\default-ssl.conf.disabled" "default-ssl.conf"
    echo [SUCCESS] Default SSL site restored
)

echo.
echo [SUCCESS] Laragon defaults restored!
echo [INFO] Please restart Apache in Laragon to apply changes
echo.
pause