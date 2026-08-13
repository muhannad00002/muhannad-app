# Oman Wedding Vendor Intelligence

A production-oriented **vendor intelligence / CRM platform** that discovers,
verifies, categorizes and exports **Omani** wedding-service businesses — with
**Instagram-first discovery**, Google Places enrichment, an Oman-only
verification engine, deduplication, a review workflow, and professional Excel
export.

> **Oman only.** A vendor is only auto-treated as Omani when there is enough
> public evidence (see *Oman verification*). Otherwise it is flagged
> **Needs Verification** for a human to decide.

---

## 1. Project overview

The platform turns scattered public signals (Instagram profiles, public web
results, Google Maps listings) into a clean, deduplicated, review-ready
database of Omani wedding vendors across all 35 categories and 11 governorates.
The end goal is a high-quality database suitable for CRM import / outreach —
not merely a list of Instagram accounts.

## 2. Architecture

```
Frontend (React + TypeScript + Tailwind)   ← Phase 5
        │  REST/JSON
        ▼
Backend (FastAPI)
  ├── api/            vendors, discovery, stats, import/export
  ├── jobs.py         background discovery jobs (pause/resume/cancel)
  ├── services/       phone · governorate · verification · classification
  │                   · dedup · quality · places · export · importer · discovery
  ├── search/         SearchProvider abstraction (Google CSE / null-manual)
  │                   + InstagramDiscoveryProvider
  ├── keywords.py     35-category EN/AR keyword + query generator
  └── models.py       SQLAlchemy schema (SQLite now, PostgreSQL later)
```

Discovery pipeline:

```
Category → bilingual keyword queries → public search → Instagram/website
candidates → category classification → Oman verification → Google Places
enrichment → duplicate detection → database
```

**Compliance:** the system never logs into Instagram, bypasses auth/CAPTCHAs,
or scrapes private data. It uses official APIs (Google Places, Google
Programmable Search) and *public* search results, and provides a manual
Instagram-URL import path for when automated discovery is unavailable.

## 3. Installation

Backend (Python 3.11+):
```bash
cd vendor-intelligence/backend
pip install -r requirements.txt
```

Frontend (once Phase 5 lands):
```bash
cd vendor-intelligence/frontend
npm install
```

## 4. Environment variables

Copy `.env.example` → `.env` (git-ignored) and fill in:

| Variable | Purpose |
| --- | --- |
| `GOOGLE_MAPS_API_KEY` | Google Places (New) enrichment + verification |
| `SEARCH_API_KEY` | Google Programmable Search API key (web/Instagram discovery) |
| `SEARCH_ENGINE_ID` | Programmable Search Engine id (`cx`) |
| `DATABASE_URL` | `sqlite:///./data/vendors.db` (default) or a PostgreSQL URL |
| `CORS_ORIGINS` | Comma-separated frontend origins |

If `SEARCH_API_KEY`/`SEARCH_ENGINE_ID` are absent the app runs in **manual
mode**: automated discovery is disabled and you add vendors via Instagram-URL
import — the rest of the pipeline (enrichment, verification, dedup, export)
still works.

## 5. Google Cloud configuration

1. Create a project and enable **billing**.
2. Enable **Places API (New)** and **Geocoding API** → key → `GOOGLE_MAPS_API_KEY`.
3. (Optional, for automated discovery) Enable **Custom Search API**, create an
   API key → `SEARCH_API_KEY`, and create a
   [Programmable Search Engine](https://programmablesearchengine.google.com/)
   (search the whole web) → its `cx` → `SEARCH_ENGINE_ID`.

## 6. Search provider configuration

`config.yaml → search.provider`: `google_cse` (default) or `none` (manual).
Other providers can be added by implementing the `SearchProvider` interface in
`app/search/` and registering them in `app/search/factory.py`.

## 7. Running the backend

```bash
cd vendor-intelligence/backend
uvicorn main:app --reload
# API docs: http://localhost:8000/docs
```

## 8. Running the frontend

```bash
cd vendor-intelligence/frontend
npm run dev            # http://localhost:5173
```

## 9. Database setup

Tables are created automatically on startup (`init_db`). SQLite by default;
point `DATABASE_URL` at PostgreSQL to scale — the SQLAlchemy models are
portable, no code changes required. (Add Alembic for migrations in production.)

## 10. Running discovery

- **API:** `POST /api/discovery/start` with `{categories, governorate, deep}`.
- Poll `GET /api/discovery/jobs/{id}` for live progress; `pause`/`resume`/
  `cancel` via `POST /api/discovery/jobs/{id}/{action}`.
- Preview the exact queries first: `GET /api/discovery/preview?category=...&deep=true`.

## 11. Importing Instagram URLs

`POST /api/import` (multipart) with a `.csv`, `.xlsx`, or `.txt` file.
Recognised columns: **Business Name, Instagram URL, Category, Phone,
Governorate**. A plain `.txt` of one Instagram URL/handle per line also works.
Imported rows run through enrichment + verification + dedup automatically.

## 12. Verifying vendors

Each vendor gets an **Oman confidence score (0–100)** and band. Use the vendor
table/detail view to review, edit fields, change category, and set status
(`Approved` / `Rejected` / `Verified` / `Duplicate`). Every change is written
to the **audit log**.

## 13. Exporting Excel

- `GET /api/export.xlsx?scope=default|approved|verified|all|selected&ids=1,2,3`
- `GET /api/export.csv?...`

Excel is professional: single **Oman Wedding Vendors** sheet, required columns
(Business Name, Category, Phone Number, Governorate, Google Maps Location Link),
frozen + filterable header, auto-sized columns, clickable Maps hyperlinks.
Default scope excludes rejected vendors (Approved OR Verified only).

## 14. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `manual_mode: true` in `/api/health` | No search key set — add `SEARCH_API_KEY`/`SEARCH_ENGINE_ID`, or use import. |
| Enrichment empty | `GOOGLE_MAPS_API_KEY` missing or Places API (New) not enabled. |
| `403 PERMISSION_DENIED` | Enable the API and check key restrictions. |
| CORS errors in the browser | Add the frontend origin to `CORS_ORIGINS`. |

## 15. API usage and billing

Google Places (New) and Custom Search are billed per request. The pipeline
caches queries (`search_queries` table prevents re-running identical queries),
throttles requests, retries with backoff, and enriches once per unique vendor.
Set **budget alerts** in Google Cloud; Custom Search has a limited free tier
then per-1k pricing.

## 16. Data-collection limitations

- Instagram automated access is **not** guaranteed and is never forced. When
  unavailable, use manual URL import — the compliant, supported path.
- Only **public, business** information is collected. No private data, no
  personal profiles of individuals beyond publicly presented business info.

## 17. Compliance considerations

Respects platform terms, robots restrictions and API policies. No auth bypass,
no CAPTCHA solving, no private scraping. Official APIs and public search only.

---

## Development commands

```bash
# Backend
cd vendor-intelligence/backend
pip install -r requirements.txt
uvicorn main:app --reload
pytest -q                     # 29 tests

# Frontend (Phase 5)
cd vendor-intelligence/frontend
npm install
npm run dev
```

## Status

| Phase | Scope | State |
| --- | --- | --- |
| 1 | Scaffold + database | ✅ |
| 2 | Core services + keyword engine | ✅ |
| 3 | Places enrichment + discovery providers | ✅ |
| 4 | Jobs + API + export/import | ✅ |
| 5 | React/TS/Tailwind frontend | 🚧 in progress |
| 6–8 | Advanced dashboard, testing, optimization | ⏭️ next |

Backend is fully runnable and tested today (`uvicorn main:app` + `/docs`).
