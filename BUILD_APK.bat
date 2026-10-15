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

echo [1/2] Dang dong bo ma nguon moi nhat sang thu muc build...
copy /Y "expo-app\App.js" "..\expo-app\App.js" >nul
xcopy /E /I /Y "expo-app\components" "..\expo-app\components" >nul
xcopy /E /I /Y "expo-app\generated" "..\expo-app\generated" >nul
xcopy /E /I /Y "expo-app\viewer" "..\expo-app\viewer" >nul
xcopy /E /I /Y "expo-app\lib" "..\expo-app\lib" >nul

echo [2/2] Dang bien dich APK Release bang Gradle (cho khoang 1-2 phut)...
cd ..\expo-app\android
cmd /c "gradlew.bat assembleRelease"
if errorlevel 1 (
    echo.
    echo [LOI] Bien dich APK that bai.
    pause
    exit /b 1
)

copy /Y "app\build\outputs\apk\release\app-release.apk" "..\..\MemoryWeaver\MemoryWeaver.apk" >nul
copy /Y "app\build\outputs\apk\release\app-release.apk" "..\..\MemoryWeaver.apk" >nul

echo.
echo ======================================================================
echo [THANH CONG] File APK moi da duoc xuat tai:
echo    - F:\MemoryWeaver\MemoryWeaver\MemoryWeaver.apk
echo    - F:\MemoryWeaver\MemoryWeaver.apk
echo.
echo Hay chep file APK nay sang dien thoai Android va cai dat de su dung!
echo ======================================================================
pause
