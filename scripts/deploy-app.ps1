# Deploy the full React client + super-admin app to app.safeguardsecurities.us
# Requires: firebase login as mateenforjob@gmail.com

if (-not $env:NODE_OPTIONS) {
  $env:NODE_OPTIONS = "--use-system-ca"
}

$root = Split-Path $PSScriptRoot -Parent
$appDir = Join-Path $root "backend\ebank_dashboard"
$project = "e-bank-dashboard"

Set-Location $appDir

Write-Host ""
Write-Host "Safeguard Securities - client app deploy" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] Installing dependencies..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host "[2/3] Building production bundle..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host "[3/3] Deploying hosting to $project (e-bank-dashboard site)..." -ForegroundColor Cyan
firebase deploy --only hosting --project $project
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host "Deployed:" -ForegroundColor Green
Write-Host "  https://app.safeguardsecurities.us/admin-access  (staff login)"
Write-Host "  https://app.safeguardsecurities.us/admin           (super-admin dashboard)"
Write-Host ""
