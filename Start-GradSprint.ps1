# Serves the production build at http://127.0.0.1:4173/
# Requires: npm install once, then npm run build to create dist/
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

if (-not (Test-Path 'dist\index.html')) {
  Write-Host 'No dist/ folder. Run: npm run build' -ForegroundColor Yellow
  exit 1
}

$port = 4173
npx --yes vite preview --host 127.0.0.1 --port $port --strictPort --open
