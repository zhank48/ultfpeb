Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "ULT FPEB Visitor Management System" -ForegroundColor Green
Write-Host "Starting Development Environment..." -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "[1/3] Installing dependencies..." -ForegroundColor Yellow
npm run install:all

Write-Host ""
Write-Host "[2/3] Checking database connection..." -ForegroundColor Yellow
Write-Host "Please make sure MySQL is running and configured properly." -ForegroundColor White
Write-Host ""

Write-Host "[3/3] Starting development servers..." -ForegroundColor Yellow
Write-Host "Frontend will be available at: http://localhost:5173" -ForegroundColor Green
Write-Host "Backend will be available at: http://localhost:3000" -ForegroundColor Green
Write-Host ""

npm run dev

Read-Host "Press Enter to exit"
