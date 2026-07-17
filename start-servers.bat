@echo off
REM Quick Start Script for HRMS System

echo.
echo ==========================================
echo   HRMS System - Quick Start
echo ==========================================
echo.

REM Check if running from correct directory
if not exist "package.json" (
    echo ERROR: Please run this script from the HRMS_UptoSkills root directory
    pause
    exit /b 1
)

echo Starting HRMS System...
echo.
echo [1/2] Starting Backend Server (Port 5000)...
start cmd /k "cd backend && npm install && npm start"

echo [2/2] Starting Frontend Server (Port 5173)...
timeout /t 3 /nobreak
start cmd /k "npm install && npm run dev"

echo.
echo ==========================================
echo   Servers Started Successfully!
echo ==========================================
echo.
echo Frontend:  http://localhost:5173
echo Backend:   http://localhost:5000
echo.
echo Database:  backend/data/database.json
echo.
echo Press any key to continue...
pause

