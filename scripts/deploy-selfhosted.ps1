# Deploy EksplorinAja on a Windows self-hosted PC/server.
# Run from the repository root in PowerShell after reviewing .env.production.
$ErrorActionPreference = "Stop"

function Fail([string]$Message) {
  Write-Error $Message
  exit 1
}

if (-not (Test-Path "package.json") -or -not (Test-Path ".git")) {
  Fail "Run this script from the EksplorinAja repository root."
}

$branch = (git branch --show-current).Trim()
if ($LASTEXITCODE -ne 0) { Fail "Could not read the Git branch." }
if ($branch -ne "main") {
  Fail "Deploy only from branch main. Current branch: $branch. Run git switch main and git pull --ff-only first."
}

$changes = git status --porcelain
if ($LASTEXITCODE -ne 0) { Fail "Could not inspect the Git working tree." }
if ($changes) {
  Fail "Working tree is not clean. Commit/stash your changes before deploying; this script will not overwrite them."
}

if (-not (Test-Path ".env.production")) {
  Fail "Missing .env.production. Copy deploy/cloudflare-production.env.example as a reference, then create .env.production locally with real values. Never commit it."
}

$envText = Get-Content ".env.production" -Raw
$requiredKeys = @(
  "DATABASE_URL",
  "JWT_SECRET",
  "LLM_BASE_URL",
  "LLM_API_KEY",
  "LLM_MODEL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REDIRECT_URI",
  "NEXT_PUBLIC_APP_URL"
)
$missing = @()
foreach ($key in $requiredKeys) {
  $pattern = "(?m)^\s*" + [regex]::Escape($key) + "\s*=\s*(\S.*)\s*$"
  $match = [regex]::Match($envText, $pattern)
  if (-not $match.Success -or $match.Groups[1].Value -match "^(your-|replace-with|<.*>)") {
    $missing += $key
  }
}
if ($missing.Count -gt 0) {
  Fail ("Missing or placeholder values in .env.production: " + ($missing -join ", ") + ". Values are not printed for safety.")
}

if ($envText -match "(?m)^\s*NEXT_PUBLIC_APP_URL\s*=\s*https://eksplorinaja\.com\s*$") {
  Write-Warning "eksplorinaja.com has not been purchased/connected yet. The app's canonical metadata will point to that future domain until NEXT_PUBLIC_APP_URL is changed; a temporary trycloudflare.com URL is not a stable production domain."
}

Write-Host "Installing locked dependencies..." -ForegroundColor Cyan
npm ci
if ($LASTEXITCODE -ne 0) { Fail "npm ci failed." }

Write-Host "Running tests..." -ForegroundColor Cyan
npm test
if ($LASTEXITCODE -ne 0) { Fail "Tests failed; deployment stopped." }

Write-Host "Type-checking..." -ForegroundColor Cyan
npm run typecheck
if ($LASTEXITCODE -ne 0) { Fail "Type-check failed; deployment stopped." }

Write-Host "Building production app..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { Fail "Production build failed; deployment stopped." }

Write-Host "Starting EksplorinAja on http://127.0.0.1:3000" -ForegroundColor Green
Write-Host "Keep this PowerShell window open. In a separate window, start cloudflared only after confirming the app responds locally." -ForegroundColor Yellow
Write-Host "This script does not run database migrations, configure OAuth/DNS, or create a persistent Cloudflare Tunnel." -ForegroundColor Yellow
npm run start -- --hostname 127.0.0.1 --port 3000
if ($LASTEXITCODE -ne 0) { Fail "Next.js production server exited with an error." }
