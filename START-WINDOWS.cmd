@echo off
cd /d "%~dp0User-Workspace"
where node >nul 2>nul
if errorlevel 1 (
 echo Install Node.js 24 LTS from https://nodejs.org then run this file again.
 pause
 exit /b 1
)
if not exist node_modules\playwright (
 call npm install
 if errorlevel 1 goto failed
 call npm run setup
 if errorlevel 1 goto failed
)
start "" cmd /c "timeout /t 3 >nul & start http://127.0.0.1:4173"
call npm start
:failed
pause
