# Running on Windows

The platform runs the same on Windows — only the shell commands differ. You
need **two terminals**: one for the backend (API), one for the frontend (UI).

## 0. Install prerequisites (once)

- **Python 3.11+** — https://www.python.org/downloads/ →
  ✅ tick **"Add python.exe to PATH"** during install.
- **Node.js 18+** — https://nodejs.org/ (LTS).

Verify in a new terminal:
```powershell
python --version
node --version
```

## Easiest way — the helper scripts

In `vendor-intelligence\`, just double-click (or run) these in order:

1. **`run-backend.bat`** — creates the virtual env, installs deps, starts the API.
2. **`run-frontend.bat`** — installs npm packages, starts the UI.

Then open **http://localhost:5173** in your browser.

---

## Manual steps

### Terminal 1 — backend (PowerShell)

```powershell
cd vendor-intelligence\backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```

- API runs at **http://localhost:8000**, interactive docs at
  **http://localhost:8000/docs**.
- If PowerShell blocks `Activate.ps1` with a script-execution error, either run
  this once: `Set-ExecutionPolicy -Scope Process RemoteSigned` and retry, or use
  Command Prompt (cmd) and activate with `.venv\Scripts\activate.bat`.

### Terminal 2 — frontend

```powershell
cd vendor-intelligence\frontend
npm install
npm run dev
```

- UI runs at **http://localhost:5173** and proxies API calls to the backend.

### API keys (optional)

Copy the example env file (it lives in the `vendor-intelligence\` root) and edit
it to add keys:

```powershell
cd vendor-intelligence
copy .env.example .env
notepad .env
```

- `GOOGLE_MAPS_API_KEY` enables Google Places enrichment.
- `SEARCH_API_KEY` + `SEARCH_ENGINE_ID` enable automated web/Instagram discovery.
- With no keys, the app runs in **manual-import mode** — you add vendors via the
  **Import** tab (Instagram URLs / CSV / Excel), and enrichment/verification/
  dedup/export still work.

---

## One-window production mode (no Node dev server)

Build the frontend once, then the backend serves it directly:

```powershell
cd vendor-intelligence\frontend
npm install
npm run build

cd ..\backend
.venv\Scripts\Activate.ps1
uvicorn main:app
```

Now everything is on **http://localhost:8000** (UI + API, single origin).

---

## Troubleshooting (Windows)

| Problem | Fix |
| --- | --- |
| `python` not recognised | Reinstall Python with "Add to PATH", reopen terminal. Try `py` instead of `python`. |
| `Activate.ps1 cannot be loaded` | `Set-ExecutionPolicy -Scope Process RemoteSigned` then retry, or use `activate.bat` in cmd. |
| `npm` not recognised | Install Node.js LTS, reopen the terminal. |
| Port 8000 or 5173 in use | Backend: `uvicorn main:app --port 8001`. Frontend: `npm run dev -- --port 5174`. |
| UI loads but no data | Make sure the backend terminal is running; check http://localhost:8000/api/health. |
