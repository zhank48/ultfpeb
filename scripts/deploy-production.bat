@echo off
REM =======================================================
REM ULT FPEB Improved Production Deployment Script
REM =======================================================
echo.
echo 🚀 ULT FPEB Production Deployment - Windows/Laragon
echo =====================================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js v16+ and try again
    pause
    exit /b 1
)

REM Display Node.js version
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js version: %NODE_VERSION%

REM Check if we're in the correct directory
if not exist "backend\.env" (
    echo ❌ backend\.env file not found
    echo Please run this script from the ULT project root directory
    pause
    exit /b 1
)

echo ✅ Found backend\.env file

REM Navigate to backend directory and check dependencies
echo.
echo 📦 Checking backend dependencies...
cd backend

REM Check if node_modules exists
if not exist "node_modules" (
    echo ⚠️  Backend node_modules not found, installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install backend dependencies
        pause
        exit /b 1
    )
)

REM Check for required packages
echo ℹ️  Checking required packages...

REM Check bcrypt
call npm list bcrypt >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Installing bcrypt package...
    call npm install bcrypt
    if %errorlevel% neq 0 (
        echo ❌ Failed to install bcrypt
        pause
        exit /b 1
    )
)

REM Check mysql2
call npm list mysql2 >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Installing mysql2 package...
    call npm install mysql2
    if %errorlevel% neq 0 (
        echo ❌ Failed to install mysql2
        pause
        exit /b 1
    )
)

REM Check dotenv
call npm list dotenv >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Installing dotenv package...
    call npm install dotenv
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dotenv
        pause
        exit /b 1
    )
)

echo ✅ All required packages are installed

REM Return to project root
cd ..

echo.
echo 🗄️  Starting database deployment...
echo.

REM Ask for environment
set /p DEPLOY_ENV="Enter deployment environment (dev/prod) [dev]: "
if "%DEPLOY_ENV%"=="" set DEPLOY_ENV=dev

if /i "%DEPLOY_ENV%"=="prod" (
    echo ⚠️  PRODUCTION DEPLOYMENT SELECTED
    echo This will use strong passwords and production settings.
    set /p CONFIRM="Are you sure? (yes/no) [no]: "
    if /i not "%CONFIRM%"=="yes" (
        echo Deployment cancelled.
        pause
        exit /b 0
    )
    set ENV_FLAG=--env=production
) else (
    echo ℹ️  Development deployment selected
    set ENV_FLAG=--env=development
)

echo.
echo 🚀 Running database deployment script...
echo.

REM Run the deployment script
node scripts/improved-production-deployment.cjs %ENV_FLAG%

if %errorlevel% equ 0 (
    echo.
    echo ============================================
    echo 🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!
    echo ============================================
    echo.
    if /i "%DEPLOY_ENV%"=="prod" (
        echo ⚠️  PRODUCTION ENVIRONMENT DEPLOYED
        echo 🔒 Remember to change default passwords!
        echo.
        echo Default credentials:
        echo - adminult@fpeb.upi.edu : AdminULT2025!
        echo - arsip@fpeb.upi.edu : ArsipFPEB2025!
        echo - manper@upi.edu : ManperUPI2025!
    ) else (
        echo ℹ️  DEVELOPMENT ENVIRONMENT DEPLOYED
        echo.
        echo Default credentials:
        echo - adminult@fpeb.upi.edu : admin
        echo - arsip@fpeb.upi.edu : admin
        echo - manper@upi.edu : manper123
    )
    echo.
    echo 📋 Next steps:
    echo 1. Start backend: cd backend ^&^& npm run dev
    echo 2. Start frontend: npm run dev
    echo 3. Open http://localhost:5173
    echo 4. Login with credentials above
    echo.
) else (
    echo.
    echo ❌ DEPLOYMENT FAILED
    echo.
    echo 🔧 Troubleshooting:
    echo 1. Check if MySQL/MariaDB is running
    echo 2. Verify database credentials in backend\.env
    echo 3. Ensure database 'ult_fpeb_db' can be created
    echo 4. Check the error messages above
    echo.
)

echo Press any key to exit...
pause >nul
