@echo off
setlocal
cd /d "%~dp0"

if not exist "dist\index.html" (
  echo.
  echo  No dist folder yet. One-time setup: open a terminal here and run:
  echo    npm install
  echo    npm run build
  echo  Then double-click this file again.
  echo.
  pause
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo  Node.js is not installed or not on PATH.
  echo  Install from https://nodejs.org/ ^(LTS^), then try again.
  echo.
  pause
  exit /b 1
)

echo Starting Term Anchor...
start "" cmd /c "timeout /t 1 /nobreak >nul && start http://127.0.0.1:8787/"
node scripts\term-anchor-server.mjs
echo.
pause
