@echo off
title PharmaConnect

:: Start PostgreSQL service (requires admin — will prompt UAC if needed)
sc query postgresql-x64-18 | find "RUNNING" >nul 2>&1
if errorlevel 1 (
    echo Starting PostgreSQL...
    powershell -Command "Start-Process 'net' -ArgumentList 'start postgresql-x64-18' -Verb RunAs -Wait" 2>nul
    timeout /t 3 /nobreak >nul
) else (
    echo PostgreSQL already running.
)

:: Start backend in new window
start "PharmaConnect Backend" cmd /k "cd /d "%~dp0backend" && npm run dev"

:: Wait for backend to be ready
timeout /t 4 /nobreak >nul

:: Start frontend in new window
start "PharmaConnect Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

:: Wait for frontend to be ready
timeout /t 4 /nobreak >nul

:: Open browser
start http://localhost:5173

echo.
echo PharmaConnect is starting...
echo App: http://localhost:5173
echo.
