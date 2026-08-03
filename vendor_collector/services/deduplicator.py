"""In-memory deduplication of place ids within a single run.

The database enforces uniqueness on ``place_id`` via upsert, but tracking seen
ids in memory lets the collector avoid redundant (billable) details requests
when the same business surfaces under multiple categories.
"""

from __future__ import annotations

from typing import Set


class Deduplicator:
    """Track place ids already processed during a run."""

    def __init__(self) -> None:
        self._seen: Set[str] = set()
        self.duplicate_count = 0

    def is_duplicate(self, place_id: str) -> bool:
        """Return ``True`` if ``place_id`` has been seen before this run."""
        if place_id in self._seen:
            self.duplicate_count += 1
            return True
        return False

    def add(self, place_id: str) -> None:
        """Register ``place_id`` as seen."""
        self._seen.add(place_id)

    def seen_and_add(self, place_id: str) -> bool:
        """Atomically check-and-add. Returns ``True`` when it was a duplicate."""
        if place_id in self._seen:
            self.duplicate_count += 1
            return True
        self._seen.add(place_id)
        return False

    @property
    def unique_count(self) -> int:
        """Number of distinct place ids seen so far."""
        return len(self._seen)
