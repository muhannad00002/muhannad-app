"""Centralized configuration for the Oman Wedding Vendor Collector.

All tunable parameters live here so the rest of the code base can rely on a
single, well-documented source of truth. Values may be overridden through
environment variables (see ``.env.example``) to keep secrets out of source
control.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import List

from dotenv import load_dotenv

# Load variables from a local ``.env`` file if one is present. This is a no-op
# in environments where the variables are already exported (e.g. CI).
load_dotenv()


# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR: Path = Path(__file__).resolve().parent
DATA_DIR: Path = BASE_DIR / "data"
OUTPUT_DIR: Path = DATA_DIR / "output"
LOGS_DIR: Path = BASE_DIR / "logs"
DB_PATH: Path = DATA_DIR / "vendors.db"

# Ensure the runtime directories always exist.
for _directory in (DATA_DIR, OUTPUT_DIR, LOGS_DIR):
    _directory.mkdir(parents=True, exist_ok=True)


def _get_bool(name: str, default: bool) -> bool:
    """Return an environment variable coerced to ``bool``."""
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _get_int(name: str, default: int) -> int:
    """Return an environment variable coerced to ``int``."""
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


@dataclass(frozen=True)
class Settings:
    """Immutable application settings.

    Attributes are populated from environment variables where sensible so the
    application can be reconfigured without touching source code.
    """

    # --- Google API -------------------------------------------------------
    google_api_key: str = field(default_factory=lambda: os.getenv("GOOGLE_API_KEY", ""))
    places_search_url: str = "https://places.googleapis.com/v1/places:searchText"
    places_details_url: str = "https://places.googleapis.com/v1/places"
    geocode_url: str = "https://maps.googleapis.com/maps/api/geocode/json"

    # --- Search behaviour -------------------------------------------------
    search_city: str = field(default_factory=lambda: os.getenv("SEARCH_CITY", "Muscat"))
    country: str = field(default_factory=lambda: os.getenv("SEARCH_COUNTRY", "Oman"))
    page_size: int = field(default_factory=lambda: _get_int("PAGE_SIZE", 20))
    max_pages: int = field(default_factory=lambda: _get_int("MAX_PAGES", 10))
    language_code: str = field(default_factory=lambda: os.getenv("LANGUAGE_CODE", "en"))
    region_code: str = field(default_factory=lambda: os.getenv("REGION_CODE", "OM"))
    search_radius_m: int = field(default_factory=lambda: _get_int("SEARCH_RADIUS_M", 0))

    # --- Concurrency / performance ---------------------------------------
    max_workers: int = field(default_factory=lambda: _get_int("MAX_WORKERS", 10))
    request_timeout: int = field(default_factory=lambda: _get_int("REQUEST_TIMEOUT", 30))

    # --- Export -----------------------------------------------------------
    export_excel: bool = field(default_factory=lambda: _get_bool("EXPORT_EXCEL", True))
    export_csv: bool = field(default_factory=lambda: _get_bool("EXPORT_CSV", True))
    export_json: bool = field(default_factory=lambda: _get_bool("EXPORT_JSON", False))

    # --- Database ---------------------------------------------------------
    db_path: Path = DB_PATH
    backup_database: bool = field(default_factory=lambda: _get_bool("BACKUP_DATABASE", True))

    # --- Retry ------------------------------------------------------------
    max_retries: int = field(default_factory=lambda: _get_int("MAX_RETRIES", 5))

    def validate(self) -> None:
        """Raise a helpful error when required settings are missing."""
        if not self.google_api_key:
            raise ValueError(
                "GOOGLE_API_KEY is not set. Copy .env.example to .env and add "
                "your Google Places API (New) key."
            )


# The list of Oman governorates the geocoder normalises detected regions to.
OMAN_GOVERNORATES: List[str] = [
    "Muscat",
    "Dhofar",
    "Musandam",
    "Al Buraimi",
    "Al Dakhiliyah",
    "Al Batinah North",
    "Al Batinah South",
    "Al Sharqiyah North",
    "Al Sharqiyah South",
    "Al Dhahirah",
    "Al Wusta",
]


# Convenience singleton used throughout the application.
settings = Settings()
