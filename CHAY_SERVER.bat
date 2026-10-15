@echo off
cd /d "%~dp0"
chcp 65001 >nul
title MemoryWeaver - Backend Server AI (Port 8787)
echo ======================================================================
echo    MEMORYWEAVER - BACKEND SERVER AI CHO APP APK (PORT 8787)
echo ======================================================================
echo.
echo Khi ban da cai dat file MemoryWeaver.apk vao dien thoai:
echo Ban CHI CAN mo server nay tren may tinh (khong can Expo, khong can QR).
echo.

if not exist "server\.env" (
    powershell -NoProfile -ExecutionPolicy Bypass -File ".\server\configure-gemini.ps1"
    if errorlevel 1 exit /b 1
)

cd server
npm start
