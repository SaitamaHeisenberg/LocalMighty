$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
Set-Location "C:\Users\AJB_ELITE\Desktop\LocalMighty_Ap\apps\android"
& .\gradlew.bat assembleDebug
Write-Host ""
Write-Host "Build complete!"
Write-Host "APK location: app\build\outputs\apk\debug\app-debug.apk"
