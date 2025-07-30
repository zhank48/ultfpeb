@echo off
echo ============================================================================
echo            ULT FPEB - Test Network Access
echo ============================================================================
echo.

set "IP=192.168.92.203"

echo Testing network accessibility for IP: %IP%
echo.

REM Test ping
echo [1] Testing ping connectivity...
ping -n 4 %IP%
if %errorLevel% == 0 (
    echo [SUCCESS] Ping successful
) else (
    echo [ERROR] Ping failed - check network connectivity
)
echo.

REM Test Backend Health Check
echo [2] Testing Backend API (port 3001)...
curl -s -o nul -w "HTTP Status: %%{http_code}\n" http://%IP%:3001/api/health
if %errorLevel% == 0 (
    echo [SUCCESS] Backend API accessible
) else (
    echo [ERROR] Backend API not accessible - check if backend is running
)
echo.

REM Test HTTPS Frontend
echo [3] Testing HTTPS Frontend (port 443)...
curl -k -s -o nul -w "HTTP Status: %%{http_code}\n" https://%IP%
if %errorLevel% == 0 (
    echo [SUCCESS] HTTPS Frontend accessible
) else (
    echo [ERROR] HTTPS Frontend not accessible - check Apache/SSL configuration
)
echo.

REM Test HTTP redirect
echo [4] Testing HTTP to HTTPS redirect (port 80)...
curl -s -o nul -w "HTTP Status: %%{http_code}\n" http://%IP%
if %errorLevel% == 0 (
    echo [SUCCESS] HTTP redirect working
) else (
    echo [ERROR] HTTP redirect not working - check Apache configuration
)
echo.

echo Testing complete!
echo.
echo If any tests failed:
echo - Make sure backend is running: npm start in backend folder
echo - Make sure Apache is running in Laragon
echo - Check Windows Firewall allows ports 80, 443, 3001
echo - Verify computer is on same network
echo.
pause