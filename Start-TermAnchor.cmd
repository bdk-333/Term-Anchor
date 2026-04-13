@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo  Node.js is not installed or not on PATH.
  echo  Install from https://nodejs.org/ ^(LTS 18 or newer^), then try again.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo.
  echo  First run: installing dependencies...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

if not exist "dist\index.html" (
  echo.
  echo  First run: building production bundle...
  call npm run build
  if errorlevel 1 (
    echo npm run build failed.
    pause
    exit /b 1
  )
)

echo Starting Term Anchor...
start "" cmd /c "timeout /t 1 /nobreak >nul && start http://127.0.0.1:8787/"
node scripts\term-anchor-server.mjs
echo.
pause
