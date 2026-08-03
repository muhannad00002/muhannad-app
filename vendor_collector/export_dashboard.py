"""Export the collected vendors into the web dashboard's data file.

Reads every vendor from the SQLite database and writes
``vendor-dashboard/vendors.json`` in the shape the dashboard expects. Run this
after a collection, then commit & push (or drag the file into the dashboard's
"Load data" button) to refresh what the dashboard shows.

Usage::

    python export_dashboard.py                 # -> ../vendor-dashboard/vendors.json
    python export_dashboard.py --out path.json  # custom location
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

from config import BASE_DIR
from database.database import Database
from logging_config import get_logger

logger = get_logger(__name__)

# The dashboard lives next to the collector package by default.
DEFAULT_OUT = BASE_DIR.parent / "vendor-dashboard" / "vendors.json"

# Columns surfaced to the dashboard (matches the database schema).
FIELDS = [
    "place_id", "business_name", "category", "phone", "website", "rating",
    "rating_count", "address", "governorate", "latitude", "longitude",
    "maps_url", "business_status", "opening_hours",
]


def export(out_path: Path = DEFAULT_OUT) -> Path:
    """Write all vendors to ``out_path`` as dashboard JSON and return the path."""
    with Database() as db:
        rows = db.fetch_vendors()

    vendors = [{key: row.get(key) for key in FIELDS} for row in rows]
    payload = {
        "sample": False,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "count": len(vendors),
        "vendors": vendors,
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    logger.info("Wrote %s vendors to %s", len(vendors), out_path)
    print(f"Exported {len(vendors)} vendors -> {out_path}")
    return out_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Export vendors to the dashboard.")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT, help="Output JSON path.")
    args = parser.parse_args()
    export(args.out)


if __name__ == "__main__":
    main()
