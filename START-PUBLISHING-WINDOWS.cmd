@echo off
cd /d "%~dp0"
where gh >nul 2>nul
if errorlevel 1 (
 echo Install GitHub CLI from https://cli.github.com then run gh auth login.
 pause
 exit /b 1
)
gh auth status >nul 2>nul
if errorlevel 1 (
 echo Run gh auth login in Command Prompt first.
 pause
 exit /b 1
)
echo Public publishing enabled: completed Page names, bios, IDs, links and public groups.
echo These records will be visible in GitHub and on your website.
set AURANT_PUBLISH=1
call START-WINDOWS.cmd
