@echo off
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
cd /d "%~dp0"
call gradlew.bat assembleDebug --no-daemon
echo Build completed with exit code %ERRORLEVEL%
pause
