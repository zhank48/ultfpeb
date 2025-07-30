@echo off
echo ========================================
echo ULT FPEB - Development Setup (Windows)
echo ========================================
echo.

echo [1/5] Setting up development environment...
call npm run deploy:env:dev

echo.
echo [2/5] Installing dependencies...
call npm run install:all

echo.
echo [3/5] Setting up database...
call npm run setup-db:dev

echo.
echo [4/5] Building frontend...
call npm run build

echo.
echo [5/5] Starting development servers...
echo.
echo Frontend: http://localhost:5173
echo Backend API: http://localhost:3001/api
echo.
echo Press Ctrl+C to stop servers
echo.

call npm run dev