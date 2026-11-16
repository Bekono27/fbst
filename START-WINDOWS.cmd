@echo off
cd /d "%~dp0User-Workspace"
where node >nul 2>nul
if errorlevel 1 (
 echo Install Node.js 24 LTS from https://nodejs.org then run this file again.
 pause
 exit /b 1
)
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 24 ? 0 : 1)"
if errorlevel 1 (
 echo Node.js 24 or newer is required.
 goto failed
)
node "..\update-code.cjs"
call npm install
if errorlevel 1 goto failed
node server.cjs --open
:failed
pause
