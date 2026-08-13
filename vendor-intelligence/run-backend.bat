@echo off
REM ── Oman Vendor Intelligence — start the backend (Windows) ──────────────
REM Double-click this file, or run it from a terminal. It creates a virtual
REM environment on first run, installs dependencies, then starts the API.

cd /d "%~dp0backend"

if not exist ".venv" (
    echo Creating virtual environment...
    python -m venv .venv
)

call ".venv\Scripts\activate.bat"

echo Installing/updating dependencies...
pip install -q -r requirements.txt

if not exist "..\.env" (
    echo.
    echo NOTE: no .env found. Copying .env.example -^> .env
    echo Edit vendor-intelligence\.env to add your API keys ^(optional^).
    copy "..\.env.example" "..\.env" >nul
)

echo.
echo Starting backend at http://localhost:8000  (API docs: /docs)
echo Press Ctrl+C to stop.
uvicorn main:app --reload
pause
