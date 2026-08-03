"""Tests for the collection orchestrator, incl. concurrent DB safety."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Iterator, List

import pytest

from database.database import Database
from services.collector import Collector
from services.deduplicator import Deduplicator


class FakePlaces:
    """A stand-in for PlacesClient that serves canned data (no network)."""

    def __init__(self, count: int = 25) -> None:
        self.count = count
        self.request_count = 0

    def search_text(self, query: str) -> Iterator[Dict[str, Any]]:
        self.request_count += 1
        for i in range(self.count):
            yield {"id": f"pid-{i}"}

    def get_place_details(self, place_id: str) -> Dict[str, Any]:
        self.request_count += 1
        return {
            "id": place_id,
            "displayName": {"text": f"Vendor {place_id}"},
            "formattedAddress": "Muscat, Oman",
            "location": {"latitude": 23.6, "longitude": 58.5},
            "addressComponents": [
                {"longText": "Muscat", "types": ["administrative_area_level_1"]}
            ],
            "rating": 4.5,
            "userRatingCount": 10,
            "businessStatus": "OPERATIONAL",
        }


@pytest.fixture()
def collector(tmp_path: Path) -> Collector:
    db = Database(tmp_path / "c.db")
    c = Collector(database=db, places_client=FakePlaces(count=25))
    yield c
    db.close()


def test_collect_category_persists_across_threads(collector: Collector) -> None:
    """Regression: workers fetch, main thread writes — no SQLite thread error."""
    collector.collect_category("Flowers", "Muscat", Deduplicator())
    assert collector.db.count_vendors() == 25
    assert collector.stats.collected == 25
    assert collector.stats.errors == 0


def test_collect_category_dedupes_place_ids(collector: Collector) -> None:
    dedup = Deduplicator()
    collector.collect_category("Flowers", "Muscat", dedup)
    # Re-running the same search should skip every id as a duplicate.
    collector.collect_category("Flowers", "Muscat", dedup)
    assert collector.db.count_vendors() == 25
    assert dedup.duplicate_count == 25


def test_collect_city_marks_progress(collector: Collector) -> None:
    collector.collect_city("Muscat", categories=["Flowers", "Cake"])
    assert set(collector.db.completed_categories("Muscat")) == {"Flowers", "Cake"}
