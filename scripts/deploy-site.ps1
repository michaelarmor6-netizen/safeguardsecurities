# Deploy marketing hosting + Firestore rules for Safeguard Securities.
# Auth, Firestore, and the live client app all use project: e-bank-dashboard.
# Requires: firebase login (run scripts/firebase-login.ps1 if auth fails)

if (-not $env:NODE_OPTIONS) {
  $env:NODE_OPTIONS = "--use-system-ca"
}
Set-Location (Split-Path $PSScriptRoot -Parent)

$project = "e-bank-dashboard"
$rulesOk = $true
$hostingOk = $true

function Test-FirebaseAuth {
  $list = firebase login:list 2>&1 | Out-String
  if ($list -match "No authorized accounts") {
    return $false
  }
  if ($env:FIREBASE_TOKEN) {
    return $true
  }
  return $list -match "@"
}

Write-Host ""
Write-Host "Safeguard Securities - full site deploy" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This deploys ONLY:" -ForegroundColor DarkGray
Write-Host "  - Firestore security rules (database permissions)" -ForegroundColor DarkGray
Write-Host "  - Marketing site (safeguardsecurities.us redirects and pages)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Does NOT deploy: app React app, Functions, or Firestore data." -ForegroundColor DarkGray
Write-Host ""

if (-not (Test-FirebaseAuth)) {
  Write-Host "Not logged in to Firebase." -ForegroundColor Red
  Write-Host "Run ONE of these first, then run this script again:" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "  .\scripts\firebase-login.ps1" -ForegroundColor Cyan
  Write-Host "  (pick option 3 if attest / TLS errors)"
  Write-Host ""
  Write-Host "  OR set a CI token:" -ForegroundColor Cyan
  Write-Host '  $env:FIREBASE_TOKEN = "from firebase login:ci on another PC"'
  Write-Host ""
  exit 1
}

Write-Host "[1/2] Deploying Firestore rules to $project..." -ForegroundColor Cyan
firebase deploy --only firestore:rules --project $project
if ($LASTEXITCODE -ne 0) {
  $rulesOk = $false
  Write-Host ""
  Write-Host "[WARN] Firestore rules were NOT deployed." -ForegroundColor Yellow
  Write-Host "       Your Google account needs Editor/Owner on $project." -ForegroundColor Yellow
  Write-Host "       IAM: https://console.firebase.google.com/project/$project/settings/iam" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Continuing with marketing hosting anyway..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[2/2] Deploying marketing hosting ($project / safeguard-marketing)..." -ForegroundColor Cyan
firebase deploy --only hosting:marketing --project $project
if ($LASTEXITCODE -ne 0) {
  $hostingOk = $false
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deploy summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
if ($rulesOk) {
  Write-Host "  Firestore rules:  deployed" -ForegroundColor Green
} else {
  Write-Host "  Firestore rules:  SKIPPED (no permission or error)" -ForegroundColor Yellow
}
if ($hostingOk) {
  Write-Host "  Marketing site:   deployed" -ForegroundColor Green
  Write-Host ""
  Write-Host "  Live URLs:" -ForegroundColor Green
  Write-Host "    https://safeguardsecurities.us/"
  Write-Host "    https://app.safeguardsecurities.us/  (React app - deployed separately)"
} else {
  Write-Host "  Marketing site:   FAILED" -ForegroundColor Red
  Write-Host "  You need Editor/Owner on $project, or ask the project owner to deploy." -ForegroundColor Red
}
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not $hostingOk) { exit 1 }
exit 0
