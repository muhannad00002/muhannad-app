"""Unit tests for the SQLite persistence layer."""

from __future__ import annotations

from pathlib import Path

import pytest

from database.database import Database
from database.models import Vendor


@pytest.fixture()
def db(tmp_path: Path) -> Database:
    database = Database(tmp_path / "test.db")
    yield database
    database.close()


def _vendor(place_id: str = "p1", name: str = "Test") -> Vendor:
    return Vendor(place_id=place_id, business_name=name, category="Flowers",
                  governorate="Muscat")


def test_insert_then_update(db: Database) -> None:
    assert db.upsert_vendor(_vendor()) == "inserted"
    assert db.upsert_vendor(_vendor(name="Updated")) == "updated"
    assert db.count_vendors() == 1
    rows = db.fetch_vendors()
    assert rows[0]["business_name"] == "Updated"


def test_no_duplicates(db: Database) -> None:
    for _ in range(3):
        db.upsert_vendor(_vendor())
    assert db.count_vendors() == 1


def test_counts_by_category(db: Database) -> None:
    db.upsert_vendor(_vendor("a"))
    db.upsert_vendor(Vendor(place_id="b", business_name="B", category="Cake"))
    counts = db.counts_by("category")
    assert counts["Flowers"] == 1
    assert counts["Cake"] == 1


def test_progress_resume(db: Database) -> None:
    db.mark_completed("Muscat", "Flowers")
    assert "Flowers" in db.completed_categories("Muscat")
    db.reset_progress("Muscat")
    assert db.completed_categories("Muscat") == []


def test_fetch_filtered_by_governorate(db: Database) -> None:
    db.upsert_vendor(_vendor("a"))
    db.upsert_vendor(Vendor(place_id="b", business_name="B", category="Cake",
                            governorate="Dhofar"))
    rows = db.fetch_vendors(governorate="Dhofar")
    assert len(rows) == 1
    assert rows[0]["place_id"] == "b"
