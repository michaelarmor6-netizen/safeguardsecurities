@echo off
setlocal EnableDelayedExpansion
title Firebase Login - Safeguard Securities
cd /d "%~dp0.."

set NODE_OPTIONS=--use-system-ca
set NODE_TLS_REJECT_UNAUTHORIZED=0

echo.
echo === Firebase login ===
echo.
echo IMPORTANT: Sign in as mateenforjob@gmail.com
echo            ^(Safeguard owner - NOT kimpdlc24@gmail.com^)
echo.
echo 2. Use the LONG code from the browser (often starts with 4/0Aeo...).
echo 3. Paste only when you see: Enter authorization code:
echo.

if exist "%APPDATA%\configstore\firebase-tools.json" del /f "%APPDATA%\configstore\firebase-tools.json"
if exist "%USERPROFILE%\.config\configstore\firebase-tools.json" del /f "%USERPROFILE%\.config\configstore\firebase-tools.json"

echo Clearing old login...
call firebase logout 2>nul
echo.

echo Starting login (a URL should appear below in a few seconds)...
echo If nothing appears, press Ctrl+C and run the commands in firebase-login-manual.txt
echo.
call firebase login --no-localhost
if errorlevel 1 (
  echo.
  echo --no-localhost failed. Trying normal firebase login...
  call firebase login
)

set NODE_TLS_REJECT_UNAUTHORIZED=

if errorlevel 1 (
  echo.
  echo LOGIN FAILED.
  echo - Run this file again and paste the code within 60 seconds.
  echo - Or use a token: see scripts\firebase-login-token.md
  pause
  exit /b 1
)

echo.
echo SUCCESS. Logged in as:
call firebase login:list
echo.
echo Next, deploy with:
echo   scripts\deploy-hosting-only.cmd
echo or full deploy:
echo   scripts\deploy-site.ps1
echo.
pause
endlocal
