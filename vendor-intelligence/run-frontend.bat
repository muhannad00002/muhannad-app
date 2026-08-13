@echo off
REM ── Oman Vendor Intelligence — start the frontend (Windows) ─────────────
REM Run this AFTER run-backend.bat is running in another window.
REM Installs npm packages on first run, then starts the dev server.

cd /d "%~dp0frontend"

if not exist "node_modules" (
    echo Installing frontend packages ^(first run only^)...
    call npm install
)

echo.
echo Starting frontend at http://localhost:5173
echo Press Ctrl+C to stop.
call npm run dev
pause
