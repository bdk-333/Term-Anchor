# Serves the production build at http://127.0.0.1:8787/ with disk-backed state (data/term-anchor-state.json).
# First run: installs npm dependencies and runs `npm run build` if dist/ is missing.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host 'Node.js is not on PATH. Install LTS (18+) from https://nodejs.org/' -ForegroundColor Yellow
  exit 1
}

if (-not (Test-Path 'node_modules')) {
  Write-Host 'First run: npm install...' -ForegroundColor Cyan
  npm install
}

if (-not (Test-Path 'dist\index.html')) {
  Write-Host 'First run: npm run build...' -ForegroundColor Cyan
  npm run build
}

if (-not $env:TERM_ANCHOR_PORT) { $env:TERM_ANCHOR_PORT = '8787' }
$port = $env:TERM_ANCHOR_PORT
Start-Process cmd -ArgumentList @('/c', "timeout /t 1 /nobreak >nul && start http://127.0.0.1:$port/")
& node "$PSScriptRoot\scripts\term-anchor-server.mjs"
