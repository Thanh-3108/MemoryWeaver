@echo off
cd /d "%~dp0"
chcp 65001 >nul
title MemoryWeaver - Khoi dong Expo Dev Server
echo ======================================================================
echo             MEMORYWEAVER - KHOI DONG EXPO DEV SERVER
echo ======================================================================
echo.
echo  [1] Che do Tunnel (Ngrok vuot tuong lua, quet ma QR tu moi mang Wi-Fi)
echo  [2] Che do LAN (Truyen truc tiep Wi-Fi noi bo - sieu nhanh)
echo  [3] Mo quyen Tuong lua Windows cho port 8081/8787 (Neu dung LAN)
echo.
set /p opt="Nhap lua chon [1/2/3] (Mac dinh 1): "
if "%opt%"=="" set opt=1

cd expo-app
if "%opt%"=="1" (
    echo.
    echo Dang khoi dong Expo (Che do Tunnel)...
    npx expo start --tunnel --clear
) else if "%opt%"=="2" (
    echo.
    echo Dang khoi dong Expo (Che do LAN)...
    npx expo start --clear
) else if "%opt%"=="3" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "allow-local-network.ps1"
    pause
)
