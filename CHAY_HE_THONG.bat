@echo off
cd /d "%~dp0"
chcp 65001 >nul
title MemoryWeaver - Khoi dong he thong
echo ======================================================================
echo                 MEMORYWEAVER - TRUNG TAM KHOI DONG
echo ======================================================================
echo.
echo  [1] Nguoi dung Cai App APK: CHI CAN BAT SERVER (Khong can Expo, khong can QR)
echo  [2] Chay Server + Expo Dev Server (Tunnel - vuot tuong lua, quet ma tu moi noi)
echo  [3] Chay Server + Expo Dev Server (LAN - truc tiep Wi-Fi noi bo)
echo  [4] Build lai file APK moi nhat (Release Standalone)
echo  [5] Mo Tuong lua Windows cho mang noi bo (Cho che do LAN)
echo.
set /p opt="Nhap lua chon cua ban [1/2/3/4/5] (Mac dinh 1): "
if "%opt%"=="" set opt=1

if "%opt%"=="4" (
    call BUILD_APK.bat
    exit /b 0
)

if "%opt%"=="5" (
    cd expo-app
    powershell -NoProfile -ExecutionPolicy Bypass -File "allow-local-network.ps1"
    pause
    exit /b 0
)

if not exist "server\.env" (
    powershell -NoProfile -ExecutionPolicy Bypass -File ".\server\configure-gemini.ps1"
    if errorlevel 1 exit /b 1
)

if "%opt%"=="1" (
    echo.
    echo ======================================================================
    echo  DANG KHOI DONG SERVER CHO APP APK...
    echo  Ban da cai dat MemoryWeaver.apk vao dien thoai roi thi mo app len!
    echo ======================================================================
    cd server
    npm start
    exit /b 0
)

if not exist "expo-app\node_modules" (
    echo [CANH BAO] Ban chua cai dat thu vien! Dang tu dong goi CAI_DAT_NHANH.bat...
    call CAI_DAT_NHANH.bat
    if errorlevel 1 exit /b 1
)

echo [1/2] Dang khoi dong Backend Server (Port 8787)...
start "MemoryWeaver - Backend Server (Port 8787)" cmd /k "cd server && npm start"

timeout /t 2 /nobreak >nul

if "%opt%"=="2" (
    echo [2/2] Dang khoi dong Expo App Bundler (Che do Tunnel - vuot tuong lua)...
    start "MemoryWeaver - Expo App" cmd /k "cd expo-app && npx expo start --tunnel --clear"
) else (
    echo [2/2] Dang khoi dong Expo App Bundler (Che do LAN noi bo)...
    start "MemoryWeaver - Expo App" cmd /k "cd expo-app && npx expo start --clear"
)

echo.
echo ======================================================================
echo  Da mo Backend Server va Expo Dev Server!
echo  - Dien thoai da cai file APK: Mo truc tiep app MemoryWeaver, khong can quet QR.
echo  - Dien thoai dung Expo Go: Quet ma QR trong cua so Expo.
echo ======================================================================
pause
