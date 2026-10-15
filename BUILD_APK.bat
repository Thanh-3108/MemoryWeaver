@echo off
cd /d "%~dp0"
chcp 65001 >nul
title MemoryWeaver - Build APK Android Tu Dong
echo ======================================================================
echo          MEMORYWEAVER - DONG GOI FILE APK STANDALONE
echo ======================================================================
echo.

set "JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot"
set "Path=%JAVA_HOME%\bin;%Path%"

echo [1/2] Chuan bi moi truong build APK Release...
cd expo-app\android

echo [2/2] Dang bien dich APK Release bang Gradle (cho khoang 1-2 phut)...
cmd /c "gradlew.bat assembleRelease"
if errorlevel 1 (
    echo.
    echo [LOI] Bien dich APK that bai.
    pause
    exit /b 1
)

copy /Y "app\build\outputs\apk\release\app-release.apk" "..\..\MemoryWeaver.apk" >nul
copy /Y "app\build\outputs\apk\release\app-release.apk" "..\..\..\MemoryWeaver.apk" >nul

echo.
echo ======================================================================
echo [THANH CONG] File APK moi da duoc xuat tai:
echo    - F:\MemoryWeaver\MemoryWeaver\MemoryWeaver.apk
echo    - F:\MemoryWeaver\MemoryWeaver.apk
echo.
echo Hay chep file APK nay sang dien thoai Android va cai dat de su dung!
echo ======================================================================
pause
