@echo off
cd /d "%~dp0"
chcp 65001 >nul
title MemoryWeaver - Backend Server AI (Port 8787)

echo ======================================================================
echo           MEMORYWEAVER AI SERVER CHO APP APK (PORT 8787)
echo ======================================================================
echo.
echo  [1] Che do Cloud HTTPS (Khuyen dung - Truy cap tu moi noi qua 4G/WiFi)
echo  [2] Che do Mang noi bo (LAN - Truc tiep qua mang Wi-Fi hien tai)
echo.
set /p opt="Chon che do chay [1/2] (Mac dinh 1): "
if "%opt%"=="" set opt=1

:: 1. Kiem tra va cau hinh khoa Gemini neu chua co
if not exist "server\.env" (
    powershell -NoProfile -ExecutionPolicy Bypass -File ".\server\configure-gemini.ps1"
    if errorlevel 1 exit /b 1
)

:: 2. Them quyen firewall neu co quyen admin
netsh advfirewall firewall show rule name="MemoryWeaver Server 8787" >nul 2>nul
if errorlevel 1 (
    netsh advfirewall firewall add rule name="MemoryWeaver Server 8787" dir=in action=allow protocol=TCP localport=8787 profile=any >nul 2>nul
)

if "%opt%"=="1" (
    echo.
    echo ======================================================================
    echo  DANG KHOI DONG SERVER VA KET NOI CLOUDFLARE CLOUD...
    echo ======================================================================
    echo.
    start "MemoryWeaver - Backend Server (Port 8787)" /min cmd /c "cd server && npm start"
    timeout /t 2 /nobreak >nul
    echo.
    echo [OK] May chu Cloudflare dang cap dia chi HTTPS toan cau...
    echo Hay chep duong link HTTPS ben duoi va dan vao Cai dat tren App dien thoai:
    echo.
    if exist "server\cloudflared.exe" (
        "server\cloudflared.exe" tunnel --url http://localhost:8787
    ) else (
        npx --yes localtunnel --port 8787
    )
    exit /b 0
)

:: Che do LAN
for /f "tokens=*" %%a in ('powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object InterfaceAlias -notmatch 'Virtual|Loopback|VMware|VirtualBox|Ethernet 2' | Where-Object IPAddress -like '192.168*' | Select-Object -First 1).IPAddress"') do set LOCAL_IP=%%a
if "%LOCAL_IP%"=="" set LOCAL_IP=192.168.1.207

echo [OK] Backend Server AI dang khoi dong o che do LAN...
echo.
echo ======================================================================
echo  THONG TIN KET NOI LAN:
echo    - May tinh:    http://localhost:8787
echo    - Mang Wi-Fi:  http://%LOCAL_IP%:8787
echo.
echo  HUONG DAN SU DUNG:
echo   1. Cai dat file 'MemoryWeaver.apk' vao dien thoai Android.
echo   2. Mo app MemoryWeaver tren dien thoai -> vao Cai dat (Banh rang)
echo      nhap dia chi: http://%LOCAL_IP%:8787 va bam Luu.
echo ======================================================================
echo.

cd server
npm start
