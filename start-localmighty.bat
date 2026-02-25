@echo off
title LocalMighty Server
cd /d "C:\Users\AJB_ELITE\Desktop\LocalMighty_Ap"

echo =========================================
echo   LocalMighty - Demarrage automatique
echo =========================================
echo.

:: Tuer les anciens processus node sur les ports 3001 et 5173
echo Arret des anciens processus...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173') do taskkill /F /PID %%a >nul 2>&1
timeout /t 2 /nobreak >nul

:: Demarrer le serveur en arriere-plan
echo Demarrage du serveur Node.js...
start /B cmd /c "pnpm dev:server"
timeout /t 5 /nobreak >nul

:: Demarrer le dashboard web en arriere-plan
echo Demarrage du dashboard SvelteKit...
start /B cmd /c "pnpm dev:web"
timeout /t 8 /nobreak >nul

:: Ouvrir le navigateur
echo Ouverture du dashboard...
start "" "http://localhost:5173"

echo.
echo =========================================
echo   LocalMighty demarre avec succes!
echo   Dashboard: http://localhost:5173
echo   Serveur:   http://localhost:3001
echo =========================================
echo.
echo Appuyez sur une touche pour fermer cette fenetre...
echo (Les serveurs continueront de tourner en arriere-plan)
pause >nul
