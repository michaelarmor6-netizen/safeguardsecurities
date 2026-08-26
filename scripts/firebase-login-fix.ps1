# One-shot login when you see: auth.firebase.tools/attest failed
# Run in Windows PowerShell (same window you use for deploy).

$ErrorActionPreference = "Stop"
$env:NODE_OPTIONS = "--use-system-ca"

Write-Host "Clearing old Firebase credentials..." -ForegroundColor DarkGray
firebase logout 2>$null
Remove-Item "$env:APPDATA\configstore\firebase-tools.json" -Force -ErrorAction SilentlyContinue
Remove-Item "$env:USERPROFILE\.config\configstore\firebase-tools.json" -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Starting login (no-localhost + temporary TLS fix for antivirus/proxy)..." -ForegroundColor Cyan
Write-Host "IMPORTANT:" -ForegroundColor Yellow
Write-Host "  - Session ID (e.g. B4A09) is NOT the code. Do not paste it."
Write-Host "  - Short numbers (e.g. 48581) are NOT the code."
Write-Host "  - The real code is LONG and often starts with 4/0Aeo... (copy ALL of it)."
Write-Host "  - Paste ONLY when you see: Enter authorization code:"
Write-Host "  - Codes expire in ~1 minute. If login fails, run again and use a NEW browser URL."
Write-Host ""
Write-Host "If PowerShell breaks codes with /, use Command Prompt instead:" -ForegroundColor Cyan
Write-Host "  scripts\firebase-login.cmd"
Write-Host ""
Write-Host "1. Copy the full https://auth.firebase.tools/login?... URL below into your browser"
Write-Host "2. Sign in with Google (account that owns Firebase projects)"
Write-Host "3. On the success page, copy the authorization code (long string) and paste it here"
Write-Host ""

$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"
firebase login --no-localhost
$code = $LASTEXITCODE
Remove-Item Env:NODE_TLS_REJECT_UNAUTHORIZED -ErrorAction SilentlyContinue

if ($code -ne 0) {
  Write-Host ""
  Write-Host "Login still failed." -ForegroundColor Red
  Write-Host "Try: disable HTTPS scanning in antivirus for node.exe, or use phone hotspot."
  Write-Host "Alternative: firebase login:ci on another PC, then:"
  Write-Host '  $env:FIREBASE_TOKEN = "token"; .\scripts\deploy-site.ps1'
  exit 1
}

Write-Host ""
Write-Host "Login OK:" -ForegroundColor Green
firebase login:list
Write-Host ""
Write-Host "Deploying site..." -ForegroundColor Green
Set-Location (Split-Path $PSScriptRoot -Parent)
& "$PSScriptRoot\deploy-site.ps1"
