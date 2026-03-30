# Serves the production build at http://127.0.0.1:8787/ with disk-backed state (data/term-anchor-state.json).
# Requires: Node.js + npm install once, then npm run build to create dist/
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

if (-not (Test-Path 'dist\index.html')) {
  Write-Host 'No dist/ folder. Run: npm run build' -ForegroundColor Yellow
  exit 1
}

if (-not $env:TERM_ANCHOR_PORT) { $env:TERM_ANCHOR_PORT = '8787' }
$port = $env:TERM_ANCHOR_PORT
Start-Process cmd -ArgumentList @('/c', "timeout /t 1 /nobreak >nul && start http://127.0.0.1:$port/")
& node "$PSScriptRoot\scripts\term-anchor-server.mjs"
