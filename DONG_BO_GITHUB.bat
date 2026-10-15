@echo off
cd /d "%~dp0"
chcp 65001 >nul
title MemoryWeaver - Dong bo GitHub Chinh Thuc
echo ======================================================================
echo       MEMORYWEAVER - DONG BO VA QUAN LY MA NGUON GITHUB
echo ======================================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File ".\DONG_BO_GITHUB.ps1"

pause
