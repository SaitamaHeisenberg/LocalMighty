@echo off
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
cd /d C:\Users\AJB_ELITE\Desktop\LocalMighty_Ap\apps\android
call gradlew.bat assembleDebug
echo.
echo Build complete!
echo APK location: app\build\outputs\apk\debug\app-debug.apk
pause
