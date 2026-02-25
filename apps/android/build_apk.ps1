$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
Set-Location "C:\Users\AJB_ELITE\Desktop\LocalMighty_Ap\apps\android"
& .\gradlew.bat assembleDebug --no-daemon
Write-Host "Build completed with exit code $LASTEXITCODE"
