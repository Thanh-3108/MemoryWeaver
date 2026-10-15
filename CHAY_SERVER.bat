@echo off
cd /d "%~dp0"
chcp 65001 >nul
title MemoryWeaver - Backend Server AI (Port 8787)

echo ======================================================================
echo           MEMORYWEAVER AI SERVER CHO APP APK (PORT 8787)
echo ======================================================================
echo.

:: 1. Kiem tra va cau hinh khoa Gemini neu chua co
if not exist "server\.env" (
    powershell -NoProfile -ExecutionPolicy Bypass -File ".\server\configure-gemini.ps1"
    if errorlevel 1 exit /b 1
)

:: 2. Lay dia chi IP mang noi bo cua may tinh
for /f "tokens=*" %%a in ('powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object InterfaceAlias -notmatch 'Virtual|Loopback|VMware|VirtualBox|Ethernet 2' | Where-Object IPAddress -like '192.168*' | Select-Object -First 1).IPAddress"') do set LOCAL_IP=%%a
if "%LOCAL_IP%"=="" set LOCAL_IP=192.168.1.207

:: 3. Them quyen firewall neu co quyen admin (khong bat buoc)
netsh advfirewall firewall show rule name="MemoryWeaver Server 8787" >nul 2>nul
if errorlevel 1 (
    netsh advfirewall firewall add rule name="MemoryWeaver Server 8787" dir=in action=allow protocol=TCP localport=8787 profile=any >nul 2>nul
)

echo [OK] Backend Server AI dang khoi dong...
echo.
echo ======================================================================
echo  THONG TIN KET NOI:
echo    - May tinh:    http://localhost:8787
echo    - Mang Wi-Fi:  http://%LOCAL_IP%:8787
echo.
echo  HUONG DAN SU DUNG:
echo   1. Cai dat file 'MemoryWeaver.apk' vao dien thoai Android.
echo   2. Mo app MemoryWeaver tren dien thoai:
echo      (App da duoc cau hinh san dia chi va token de tu dong ket noi).
echo   3. Neu doi mang Wi-Fi khac, vao bieu tuong Cai dat tren App
echo      nhap lai dia chi: http://%LOCAL_IP%:8787 va bam Luu.
echo ======================================================================
echo.

cd server
npm start
