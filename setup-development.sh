#!/bin/bash

echo "========================================"
echo "ULT FPEB - Development Setup (Linux/Mac)"
echo "========================================"
echo

echo "[1/5] Setting up development environment..."
npm run deploy:env:dev

echo
echo "[2/5] Installing dependencies..."
npm run install:all

echo
echo "[3/5] Setting up database..."
npm run setup-db:dev

echo
echo "[4/5] Building frontend..."
npm run build

echo
echo "[5/5] Starting development servers..."
echo
echo "Frontend: http://localhost:5173"
echo "Backend API: http://localhost:3001/api"
echo
echo "Press Ctrl+C to stop servers"
echo

npm run dev