@echo off
cd /d "%~dp0"
chcp 65001 >nul
title MemoryWeaver - May Chu Expo Dev Server

echo ======================================================================
echo           MEMORYWEAVER - MAY CHU EXPO DEV SERVER
echo ======================================================================
echo.
echo  [1] Expo Go qua Wi-Fi noi bo (LAN - Khuyen dung, sieu nhanh, quet QR vao ngay)
echo  [2] Expo Go qua Cloud Tunnel (Khi dung 4G hoac khac mang Wi-Fi)
echo  [3] Custom Dev Client (Neu da build va cai san app development tren may)
echo.
set /p opt="Chon che do chay [1/2/3] (Mac dinh 1): "
if "%opt%"=="" set opt=1

cd expo-app

echo.
echo [1/2] Dong goi 3D viewer offline...
call node scripts/build-viewer.cjs

echo.
echo [2/2] Dang khoi dong Expo Metro Bundler...
echo ======================================================================
echo  HUONG DAN:
echo   - Mo ung dung 'Expo Go' tren dien thoai Android hoac iOS
echo   - Quet ma QR xuat hien ben duoi de mo ung dung ngay lap tuc!
echo   - Phim tat: Nhap 'r' de reload, 'c' de xem toan bo lenh.
echo ======================================================================
echo.

if "%opt%"=="2" (
    npx expo start --go --tunnel -c
) else if "%opt%"=="3" (
    npx expo start --dev-client -c
) else (
    npx expo start --go --lan -c
)
