@echo off
echo ============================================================================
echo       ULT FPEB - Start Backend untuk Network Access (0.0.0.0:3001)
echo ============================================================================
echo.

REM Change to backend directory
cd /d "%~dp0..\backend"

REM Copy Laragon environment if exists
if exist ".env.laragon" (
    echo [INFO] Using Laragon environment configuration...
    copy ".env.laragon" ".env"
) else (
    echo [WARNING] .env.laragon not found, using existing .env
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo [INFO] Installing backend dependencies...
    call npm install
)

REM Start backend server
echo.
echo [INFO] Starting backend server on 0.0.0.0:3001...
echo [INFO] Backend will be accessible from all network computers
echo.
echo Network Access URLs:
echo - Local: http://192.168.92.203:3001/api/health
echo - Health Check: http://192.168.92.203:3001/api/health
echo - API Base: http://192.168.92.203:3001/api/
echo.
echo Press Ctrl+C to stop the server
echo.

call npm start