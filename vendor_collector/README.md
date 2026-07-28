# Oman Wedding Vendor Collector

A production-ready Python application that collects wedding-related businesses
across Oman using the **official Google Places API (New)** — searching every
category, deduplicating by Google Place ID, storing everything in SQLite, and
exporting a clean vendor database to Excel, CSV and JSON.

> This is **not** a scraper. It never touches Google Maps HTML — only the
> official REST endpoints `places:searchText` and `places/{PLACE_ID}`.

---

## Features

- 🔍 Searches **35 wedding categories** per city (`"Wedding Dresses Muscat Oman"`).
- 📄 Full **pagination** — collects every available result page.
- 🧭 **Governorate detection** from address components / Geocoding API.
- 🗃️ **SQLite** storage with upsert deduplication on `place_id`.
- 🔁 **Resume** capability — never restarts from zero after an interruption.
- ⚡ **Concurrent** details retrieval with a configurable worker pool.
- 🔂 Automatic **retry** with exponential backoff on `429 / 500 / 503`.
- 📊 **Statistics**: collected, updated, duplicates, requests, by category/governorate.
- 📤 Export to **Excel, CSV, JSON** (all, by category, by governorate, or only new).
- 📝 Daily **log files** under `logs/`.
- 🎨 Colourised CLI menu with progress bars.
- 🐳 **Docker**, **Makefile**, **GitHub Actions** and **unit tests** included.

---

## Project Structure

```
vendor_collector/
├── app.py                 # CLI entry point + menu
├── config.py              # Centralized configuration (env-driven)
├── categories.py          # The 35 wedding categories
├── logging_config.py      # Daily rotating logs
├── requirements.txt
├── .env.example
├── api/
│   ├── places.py          # Places API (New) client
│   ├── geocoder.py        # Governorate detection
│   └── retry.py           # Exponential-backoff retry helpers
├── database/
│   ├── database.py        # SQLite repository (upsert/resume)
│   ├── models.py          # Vendor dataclass
│   └── migrations.py      # Schema creation
├── exporters/
│   ├── excel.py
│   └── csv.py             # CSV + JSON exporters
├── services/
│   ├── collector.py       # Orchestrator + statistics
│   ├── deduplicator.py
│   ├── governorate.py
│   └── validator.py
├── data/
│   ├── vendors.db         # created automatically
│   └── output/            # vendors.xlsx / vendors.csv / vendors.json
└── tests/
```

---

## Installation

Requires **Python 3.12+**.

```bash
cd vendor_collector
python -m venv .venv && source .venv/bin/activate   # optional
pip install -r requirements.txt        # or: make install
```

---

## Google Cloud Setup

1. Open the [Google Cloud Console](https://console.cloud.google.com/) and
   create (or select) a project.
2. Enable **billing** for the project (the Places API requires it).
3. Under **APIs & Services → Library**, enable:
   - **Places API (New)**
   - **Geocoding API** (used for governorate detection).
4. Under **APIs & Services → Credentials**, click **Create Credentials → API key**.
5. (Recommended) Restrict the key to the two APIs above.

### Environment variables

```bash
cp .env.example .env
# edit .env and set:
GOOGLE_API_KEY=your_key_here
```

All other settings (city, page size, workers, export flags…) can also be set in
`.env` — see `.env.example` for the full list. Defaults live in `config.py`:

```python
SEARCH_CITY = "Muscat"
PAGE_SIZE   = 20
MAX_WORKERS = 10
EXPORT_EXCEL = True
EXPORT_CSV   = True
```

---

## Running the Application

```bash
python app.py        # or: make run
```

You'll see:

```
=========================
 Oman Vendor Collector
=========================

1 Collect Muscat
2 Collect Salalah
3 Collect Nizwa
4 Collect Entire Oman
5 Export Excel
6 Export CSV
7 View Statistics
8 Resume Previous Run
9 Exit
```

To build the full database, choose **4 (Collect Entire Oman)**. The app will:

1. Search every category for every city.
2. Query the official Google Places API.
3. Deduplicate by Place ID.
4. Store results in SQLite.
5. Auto-export Excel/CSV (per the `EXPORT_*` flags).

If the run is interrupted, restart and choose **8 (Resume Previous Run)** — it
continues from the last completed category, never from zero.

Press **0** at the menu for a custom city/keyword search.

---

## Exporting

- **Excel** (`data/output/vendors.xlsx`) — menu option 5. Columns: Business Name,
  Category, Phone Number, Governorate, Address, Google Maps URL, Rating, Review
  Count, Website, Latitude, Longitude, Business Status, Opening Hours.
- **CSV** (`data/output/vendors.csv`) — menu option 6.
- **JSON** — enable `EXPORT_JSON=true` in `.env`.

The database columns support filtered exports (by category, governorate, or
only records updated since a timestamp) via `Database.fetch_vendors(...)`.

---

## Docker

```bash
docker build -t oman-vendor-collector .
docker run -it --rm \
  -e GOOGLE_API_KEY=your_key \
  -v "$(pwd)/data:/app/data" \
  -v "$(pwd)/logs:/app/logs" \
  oman-vendor-collector
```

---

## Testing

```bash
pytest -q        # or: make test
```

The test suite runs entirely offline (no API key or network required).

---

## Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| `Configuration error: GOOGLE_API_KEY is not set` | Copy `.env.example` → `.env` and add your key. |
| `403 PERMISSION_DENIED` | Enable **Places API (New)** and check key restrictions. |
| `REQUEST_DENIED` on governorate | Enable the **Geocoding API**. |
| Repeated `429` warnings in logs | Rate limited — the app retries automatically; lower `MAX_WORKERS`. |
| Empty results | Verify billing is enabled and the query city is spelled correctly. |

---

## Billing Considerations

- The Places API (New) is billed **per request** and per requested field mask.
  This app uses a lean field mask on search and fetches full details only once
  per unique Place ID.
- Deduplication (in-memory + database) avoids paying for the same business
  twice across categories.
- A full "Entire Oman" sweep issues many requests; review Google's
  [pricing](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing)
  and set **budget alerts** in Google Cloud before running large collections.
- Use `MAX_PAGES` and `PAGE_SIZE` in `.env` to cap request volume while testing.

---

## Code Quality

Type hints throughout · PEP 8 · modular, OO architecture · comprehensive
docstrings · centralized configuration · proper exception handling ·
unit-test-friendly dependency injection.
