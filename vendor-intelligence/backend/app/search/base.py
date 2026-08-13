"""Search-provider abstraction.

The discovery engine depends only on this interface, so providers (Google
Programmable Search, Bing, a custom source, or a null/manual provider) can be
swapped via configuration without touching pipeline code.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import List, Optional, Protocol


@dataclass
class SearchResult:
    """A single public search-engine result."""

    title: str
    link: str
    snippet: str = ""


class SearchProvider(Protocol):
    """Interface every search provider implements."""

    name: str

    def search(self, query: str, num: int = 10) -> List[SearchResult]:
        """Return up to ``num`` public results for ``query``."""
        ...


class RateLimiter:
    """Simple minimum-interval throttle shared across provider calls."""

    def __init__(self, min_interval_seconds: float = 1.0) -> None:
        self.min_interval = min_interval_seconds
        self._last = 0.0

    def wait(self) -> None:
        elapsed = time.monotonic() - self._last
        if elapsed < self.min_interval:
            time.sleep(self.min_interval - elapsed)
        self._last = time.monotonic()


class NullSearchProvider:
    """No-op provider used when no search API key is configured.

    Keeps the whole pipeline working in manual-import mode: discovery yields no
    automated results, and vendors are added by importing Instagram URLs/CSVs.
    """

    name = "none"

    def search(self, query: str, num: int = 10) -> List[SearchResult]:  # noqa: D401
        return []
