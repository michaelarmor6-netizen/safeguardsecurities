@echo off
cd /d "%~dp0.."
set NODE_OPTIONS=--use-system-ca

firebase login:list 2>&1 | findstr /i "No authorized" >nul
if %errorlevel%==0 (
  if "%FIREBASE_TOKEN%"=="" (
    echo Not logged in. Run: scripts\firebase-login.cmd
    pause
    exit /b 1
  )
)

echo Deploying hosting...
firebase deploy --only hosting:marketing --project e-bank-dashboard
if errorlevel 1 (
  echo Deploy failed.
  pause
  exit /b 1
)
echo Done: https://safeguardsecurities.us/webmail
pause
