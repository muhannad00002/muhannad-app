"""Unit tests for the Deduplicator service."""

from __future__ import annotations

from services.deduplicator import Deduplicator


def test_new_id_is_not_duplicate() -> None:
    dedup = Deduplicator()
    assert dedup.seen_and_add("a") is False
    assert dedup.unique_count == 1


def test_repeated_id_is_duplicate() -> None:
    dedup = Deduplicator()
    dedup.seen_and_add("a")
    assert dedup.seen_and_add("a") is True
    assert dedup.duplicate_count == 1
    assert dedup.unique_count == 1


def test_is_duplicate_increments_counter() -> None:
    dedup = Deduplicator()
    dedup.add("x")
    assert dedup.is_duplicate("x") is True
    assert dedup.is_duplicate("y") is False
