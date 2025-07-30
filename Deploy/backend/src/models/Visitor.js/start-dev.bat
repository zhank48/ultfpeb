@echo off
echo =================================================
echo ULT FPEB Visitor Management System
echo Starting Development Environment...
echo =================================================

echo.
echo [1/3] Installing dependencies...
call npm run install:all

echo.
echo [2/3] Checking database connection...
echo Please make sure MySQL is running and configured properly.
echo.

echo [3/3] Starting development servers...
echo Frontend will be available at: http://localhost:5173
echo Backend will be available at: http://localhost:3000
echo.

call npm run dev

pause
