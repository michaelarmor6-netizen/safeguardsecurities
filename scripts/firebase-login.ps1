# Firebase login + deploy (Windows / TLS interception fix)
# Run in PowerShell or Windows Terminal — NOT the Cursor agent shell.

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path $PSScriptRoot -Parent

# Use Windows certificate store (fixes many npm/firebase TLS errors)
$env:NODE_OPTIONS = "--use-system-ca"

Write-Host "Firebase login helper (Safeguard Securities)" -ForegroundColor Cyan
Write-Host ""

Write-Host "Clearing stale credentials..." -ForegroundColor DarkGray
firebase logout 2>$null

$configPaths = @(
  "$env:APPDATA\configstore\firebase-tools.json",
  "$env:USERPROFILE\.config\configstore\firebase-tools.json"
)
foreach ($p in $configPaths) {
  if (Test-Path $p) {
    Remove-Item $p -Force
    Write-Host "  Removed $p"
  }
}

Write-Host ""
Write-Host "If login fails on auth.firebase.tools/attest, the cause is usually:" -ForegroundColor Yellow
Write-Host "  - Antivirus HTTPS scanning (ESET, Avast, Kaspersky, etc.)"
Write-Host "  - Corporate proxy / VPN"
Write-Host "  - Fix: disable SSL scanning for Node/firebase OR use method C below"
Write-Host ""
Write-Host "Methods:" -ForegroundColor Cyan
Write-Host "  1 = firebase login (browser)"
Write-Host "  2 = firebase login --no-localhost (copy URL + paste code)"
Write-Host "  3 = Temporary TLS bypass for login ONLY (then deploy normally)"
Write-Host "  4 = Use CI token from another PC (see scripts/firebase-login-token.md)"
Write-Host ""

$choice = Read-Host "Choose 1, 2, 3, or 4"
$loginOk = $false

switch ($choice) {
  "2" {
    firebase login --no-localhost
    $loginOk = ($LASTEXITCODE -eq 0)
  }
  "3" {
    Write-Host "Bypassing TLS verification for this login only..." -ForegroundColor Yellow
    $env:NODE_TLS_REJECT_UNAUTHORIZED = "0"
    firebase login --no-localhost
    $loginOk = ($LASTEXITCODE -eq 0)
    Remove-Item Env:NODE_TLS_REJECT_UNAUTHORIZED -ErrorAction SilentlyContinue
  }
  "4" {
    Write-Host ""
    Write-Host "On a Mac/PC where login works, run:  firebase login:ci" -ForegroundColor Yellow
    Write-Host "Then here:" -ForegroundColor Yellow
    Write-Host '  $env:FIREBASE_TOKEN = "paste-token"'
    Write-Host "  .\scripts\deploy-site.ps1"
    Write-Host ""
    $tok = Read-Host "Or paste CI token now (Enter to skip)"
    if ($tok.Trim()) {
      $env:FIREBASE_TOKEN = $tok.Trim()
      $loginOk = $true
    }
  }
  default {
    firebase login
    if ($LASTEXITCODE -ne 0) {
      Write-Host "Browser login failed. Trying --no-localhost ..." -ForegroundColor Yellow
      firebase login --no-localhost
    }
    $loginOk = ($LASTEXITCODE -eq 0)
  }
}

if (-not $loginOk -and -not $env:FIREBASE_TOKEN) {
  Write-Host ""
  Write-Host "Login failed." -ForegroundColor Red
  Write-Host "Try: run this script again and pick 3, or fix antivirus SSL scanning for:"
  Write-Host "  node.exe  (path: $(Get-Command node -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source))"
  exit 1
}

Write-Host ""
Write-Host "Authenticated. Deploying..." -ForegroundColor Green
Set-Location $RepoRoot
$env:NODE_OPTIONS = "--use-system-ca"
& "$PSScriptRoot\deploy-site.ps1"
