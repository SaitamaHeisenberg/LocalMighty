@echo off
title LocalMighty - Arret
echo =========================================
echo   LocalMighty - Arret des serveurs
echo =========================================
echo.

:: Tuer les processus node sur les ports 3001 et 5173
echo Arret du serveur (port 3001)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do taskkill /F /PID %%a >nul 2>&1

echo Arret du dashboard (port 5173)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173') do taskkill /F /PID %%a >nul 2>&1

:: Fermer les fenetres CMD de LocalMighty
taskkill /FI "WINDOWTITLE eq LocalMighty Server*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq LocalMighty Web*" /F >nul 2>&1

echo.
echo =========================================
echo   LocalMighty arrete avec succes!
echo =========================================
timeout /t 3 /nobreak >nul
