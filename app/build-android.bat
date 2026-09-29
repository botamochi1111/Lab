@echo off
setlocal
cd /d "%~dp0"

where npm >nul 2>nul || (echo [ERROR] Node.js / npm not found. Install it from https://nodejs.org/ & goto :fail)
where java >nul 2>nul || (echo [ERROR] Java JDK not found. Install JDK 17 or newer. & goto :fail)

if not exist "android\local.properties" if exist "%LOCALAPPDATA%\Android\Sdk" (
  echo sdk.dir=%LOCALAPPDATA:\=/%/Android/Sdk> "android\local.properties"
)

if not exist node_modules (
  echo [1/3] Installing dependencies...
  call npm install || goto :fail
)

echo [2/3] Copying game files into the Android project...
call npx cap sync android || goto :fail

echo [3/3] Building APK - the first run takes several minutes...
pushd android
call .\gradlew.bat assembleDebug || (popd & goto :fail)
popd

if not exist dist mkdir dist
copy /y "android\app\build\outputs\apk\debug\app-debug.apk" "dist\IncidentFlipWalk-debug.apk" >nul || goto :fail
echo.
echo Done: %cd%\dist\IncidentFlipWalk-debug.apk
if /i not "%~1"=="nopause" (
  explorer dist
  pause
)
exit /b 0

:fail
echo.
echo Build failed.
if /i not "%~1"=="nopause" pause
exit /b 1
