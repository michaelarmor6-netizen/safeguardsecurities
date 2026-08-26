# Deploy only marketing hosting (e.g. webmail redirect) — skips Firestore rules.
# Requires: firebase login OR FIREBASE_TOKEN

$ErrorActionPreference = "Stop"
if (-not $env:NODE_OPTIONS) { $env:NODE_OPTIONS = "--use-system-ca" }
Set-Location (Split-Path $PSScriptRoot -Parent)

$list = firebase login:list 2>&1 | Out-String
if ($list -match "No authorized accounts" -and -not $env:FIREBASE_TOKEN) {
  Write-Host "Not logged in. Run: .\scripts\firebase-login-fix.ps1" -ForegroundColor Red
  exit 1
}

Write-Host "Deploying hosting only (e-bank-dashboard)..." -ForegroundColor Cyan
firebase deploy --only hosting:marketing --project e-bank-dashboard
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Done. Test: https://safeguardsecurities.us/webmail" -ForegroundColor Green
