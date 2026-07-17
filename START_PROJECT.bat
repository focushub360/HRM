@echo off
title HRMS Launcher

echo ===================================================
echo       Starting HRMS System (Firebase Enabled)
echo ===================================================
echo.

:: 1. Start Backend Server
echo [1/2] Launching Backend Server (Port 5000)...
start "HRMS_Backend" cmd /k "cd backend && npm run dev"

:: 2. Wait a moment for backend to initialize
timeout /t 5 /nobreak >nul

:: 3. Start Frontend Web Portal
echo [2/2] Launching Web Portal (Port 5173)...
start "HRMS_Frontend" cmd /k "npm run dev"

echo.
echo ===================================================
echo       All Systems Launching...
echo ===================================================
echo.
echo Please do not close the black terminal windows that just opened.
echo You can minimize them, but closing them stops the server.
echo.
pause
