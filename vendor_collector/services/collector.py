"""Core collection orchestrator.

Ties together the Places client, geocoder, deduplicator, validator and database
to search every category for a city, fetch details concurrently, resolve
governorates and persist unique businesses — with resume support.
"""

from __future__ import annotations

import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from tqdm import tqdm

from api.places import PlacesAPIError, PlacesClient
from categories import CATEGORIES
from config import settings
from database.database import Database
from database.models import Vendor
from logging_config import get_logger
from services.deduplicator import Deduplicator
from services.governorate import GovernorateService
from services.validator import Validator

logger = get_logger(__name__)


@dataclass
class Statistics:
    """Aggregated metrics for a collection run."""

    collected: int = 0
    updated: int = 0
    duplicates: int = 0
    api_requests: int = 0
    errors: int = 0
    started_at: float = field(default_factory=time.time)
    finished_at: Optional[float] = None
    by_category: Dict[str, int] = field(default_factory=dict)
    by_governorate: Dict[str, int] = field(default_factory=dict)

    @property
    def elapsed_seconds(self) -> float:
        """Wall-clock duration of the run in seconds."""
        end = self.finished_at or time.time()
        return end - self.started_at

    def record_category(self, category: str) -> None:
        self.by_category[category] = self.by_category.get(category, 0) + 1

    def record_governorate(self, governorate: str) -> None:
        self.by_governorate[governorate] = self.by_governorate.get(governorate, 0) + 1


class Collector:
    """Collect wedding vendors for a given city.

    Args:
        database: Persistence layer (injected for testability).
        places_client: Places API client.
        governorate_service: Governorate resolver.
    """

    def __init__(
        self,
        database: Optional[Database] = None,
        places_client: Optional[PlacesClient] = None,
        governorate_service: Optional[GovernorateService] = None,
    ) -> None:
        self.db = database or Database()
        self.places = places_client or PlacesClient()
        self.governorate = governorate_service or GovernorateService()
        self.validator = Validator()
        self.stats = Statistics()

    # -- query building ----------------------------------------------------
    @staticmethod
    def build_query(category: str, city: str) -> str:
        """Return a Places text query, e.g. ``"Flowers Muscat Oman"``."""
        return f"{category} {city} {settings.country}".strip()

    # -- details processing ------------------------------------------------
    def _fetch_vendor(self, place_id: str, category: str) -> Optional[Vendor]:
        """Fetch details and build a :class:`Vendor` (network only, thread-safe).

        This runs inside worker threads, so it must **not** touch the SQLite
        connection — a connection may only be used from the thread that created
        it. Database writes are performed by the caller on the main thread.

        Returns:
            A validated :class:`Vendor`, or ``None`` when skipped/failed.
        """
        try:
            details = self.places.get_place_details(place_id)
        except PlacesAPIError as exc:
            logger.error("Skipping %s: %s", place_id, exc)
            self.stats.errors += 1
            return None

        if not self.validator.is_valid_details(details):
            logger.warning("Invalid details for %s; skipping.", place_id)
            return None

        location = details.get("location", {}) or {}
        governorate = self.governorate.resolve(
            details.get("addressComponents", []),
            location.get("latitude"),
            location.get("longitude"),
        )
        vendor = Vendor.from_details(details, category, governorate)
        if not self.validator.is_valid_vendor(vendor):
            return None
        return vendor

    # -- category collection ----------------------------------------------
    def collect_category(
        self, category: str, city: str, dedup: Deduplicator
    ) -> None:
        """Search one category and persist all unique, valid results."""
        query = self.build_query(category, city)
        logger.info("Collecting category %r with query %r", category, query)

        # 1. Search (paginated) and collect unique place ids for this category.
        place_ids: List[str] = []
        try:
            for place in self.places.search_text(query):
                pid = place.get("id")
                if not pid:
                    continue
                if dedup.seen_and_add(pid):
                    continue
                place_ids.append(pid)
        except PlacesAPIError as exc:
            logger.error("Search failed for %r: %s", category, exc)
            self.stats.errors += 1

        # 2. Fetch details concurrently (network I/O only in the workers), then
        #    persist on this thread — SQLite connections are not shareable
        #    across threads.
        if place_ids:
            with ThreadPoolExecutor(max_workers=settings.max_workers) as executor:
                futures = {
                    executor.submit(self._fetch_vendor, pid, category): pid
                    for pid in place_ids
                }
                for future in tqdm(
                    as_completed(futures),
                    total=len(futures),
                    desc=f"  {category}",
                    unit="biz",
                    leave=False,
                ):
                    vendor = future.result()
                    if vendor is None:
                        continue
                    result = self.db.upsert_vendor(vendor)
                    self.stats.record_category(vendor.category)
                    self.stats.record_governorate(vendor.governorate or "Unknown")
                    if result == "inserted":
                        self.stats.collected += 1
                    elif result == "updated":
                        self.stats.updated += 1

        self.db.mark_completed(city, category)

    # -- public entry points ----------------------------------------------
    def collect_city(
        self,
        city: str,
        categories: Optional[List[str]] = None,
        resume: bool = False,
    ) -> Statistics:
        """Collect every category for a single city.

        Args:
            city: The city name inserted into each query.
            categories: Override the default category list.
            resume: When ``True``, skip categories already marked completed.
        """
        categories = categories or CATEGORIES
        dedup = Deduplicator()

        completed = set(self.db.completed_categories(city)) if resume else set()
        pending = [c for c in categories if c not in completed]

        if completed:
            logger.info("Resuming %s: %s categories already done.", city, len(completed))

        for category in tqdm(pending, desc=f"Collecting {city}", unit="cat"):
            try:
                self.collect_category(category, city, dedup)
            except Exception as exc:  # noqa: BLE001 - keep the run alive
                logger.exception("Unexpected error collecting %r: %s", category, exc)
                self.stats.errors += 1

        self.stats.duplicates = dedup.duplicate_count
        self.stats.api_requests = self.places.request_count + self.governorate.geocoder.request_count
        self.stats.finished_at = time.time()
        return self.stats

    def collect_all_oman(
        self, cities: List[str], resume: bool = False
    ) -> Statistics:
        """Collect across multiple cities covering the whole country."""
        dedup = Deduplicator()
        for city in cities:
            completed = set(self.db.completed_categories(city)) if resume else set()
            pending = [c for c in CATEGORIES if c not in completed]
            for category in tqdm(pending, desc=f"Collecting {city}", unit="cat"):
                try:
                    self.collect_category(category, city, dedup)
                except Exception as exc:  # noqa: BLE001
                    logger.exception("Error collecting %r in %s: %s", category, city, exc)
                    self.stats.errors += 1

        self.stats.duplicates = dedup.duplicate_count
        self.stats.api_requests = self.places.request_count + self.governorate.geocoder.request_count
        self.stats.finished_at = time.time()
        return self.stats
