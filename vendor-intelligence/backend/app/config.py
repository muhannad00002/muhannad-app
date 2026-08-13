"""Centralized configuration.

Non-secret settings load from ``config.yaml``; secrets load from environment
variables (``.env``). A single :data:`settings` object is imported across the
backend so there is one source of truth.
"""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List

import yaml
from dotenv import load_dotenv

# vendor-intelligence/backend/app/config.py -> project root is two parents up.
BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
DATA_DIR = BACKEND_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(BACKEND_DIR / ".env")


def _load_yaml() -> Dict[str, Any]:
    path = PROJECT_ROOT / "config.yaml"
    if path.exists():
        return yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    return {}


class Settings:
    """Merged view over ``config.yaml`` and environment secrets."""

    def __init__(self) -> None:
        self.yaml: Dict[str, Any] = _load_yaml()

        # Secrets (never in yaml / never committed).
        self.google_maps_api_key: str = os.getenv("GOOGLE_MAPS_API_KEY", "")
        self.search_api_key: str = os.getenv("SEARCH_API_KEY", "")
        self.search_engine_id: str = os.getenv("SEARCH_ENGINE_ID", "")
        self.database_url: str = os.getenv(
            "DATABASE_URL", f"sqlite:///{DATA_DIR / 'vendors.db'}"
        )
        self.cors_origins: List[str] = [
            o.strip() for o in os.getenv(
                "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
            ).split(",") if o.strip()
        ]

    # -- convenience accessors over the yaml tree ------------------------
    @property
    def default_country(self) -> str:
        return self.yaml.get("default_country", "Oman")

    @property
    def default_country_code(self) -> str:
        return self.yaml.get("default_country_code", "OM")

    @property
    def confidence_threshold(self) -> int:
        return int(self.yaml.get("default_confidence_threshold", 70))

    @property
    def google_maps_enabled(self) -> bool:
        return bool(self.yaml.get("google_maps_enabled", True)) and bool(self.google_maps_api_key)

    @property
    def instagram_discovery_enabled(self) -> bool:
        return bool(self.yaml.get("instagram_discovery_enabled", True))

    @property
    def search_cfg(self) -> Dict[str, Any]:
        return self.yaml.get("search", {}) or {}

    @property
    def rate_limit_cfg(self) -> Dict[str, Any]:
        return self.yaml.get("rate_limit", {}) or {}

    @property
    def search_provider(self) -> str:
        # If no search key is configured, force "none" (manual-import mode).
        provider = self.search_cfg.get("provider", "google_cse")
        if provider == "google_cse" and not (self.search_api_key and self.search_engine_id):
            return "none"
        return provider


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the cached settings singleton."""
    return Settings()


settings = get_settings()
