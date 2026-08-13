"""Factory selecting the configured :class:`SearchProvider`."""

from __future__ import annotations

from app.config import settings
from app.search.base import NullSearchProvider, SearchProvider


def get_search_provider() -> SearchProvider:
    """Return the search provider named in config (falls back to null/manual)."""
    provider = settings.search_provider
    if provider == "google_cse":
        from app.search.google_cse import GoogleCSEProvider

        return GoogleCSEProvider()
    # "bing" / custom providers can be added here.
    return NullSearchProvider()
