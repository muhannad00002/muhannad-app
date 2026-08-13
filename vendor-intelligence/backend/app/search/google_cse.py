"""Google Programmable Search (Custom Search JSON API) provider.

Uses the official API — requires ``SEARCH_API_KEY`` and ``SEARCH_ENGINE_ID``.
This is a compliant way to obtain public search results (including public
Instagram profile links via ``site:instagram.com`` queries) without scraping.
"""

from __future__ import annotations

from typing import List

import requests
from tenacity import retry, stop_after_attempt, wait_exponential_jitter

from app.config import settings
from app.search.base import RateLimiter, SearchResult

_ENDPOINT = "https://www.googleapis.com/customsearch/v1"


class GoogleCSEProvider:
    """Search provider backed by Google's Custom Search JSON API."""

    name = "google_cse"

    def __init__(self, rate_limiter: RateLimiter | None = None) -> None:
        self.api_key = settings.search_api_key
        self.cx = settings.search_engine_id
        self.session = requests.Session()
        self.rate = rate_limiter or RateLimiter(
            float(settings.search_cfg.get("min_seconds_between_requests", 1.0))
        )

    @retry(reraise=True, stop=stop_after_attempt(4),
           wait=wait_exponential_jitter(initial=1, max=20))
    def _get(self, params: dict) -> dict:
        resp = self.session.get(_ENDPOINT, params=params, timeout=20)
        if resp.status_code in {429, 500, 503}:
            raise RuntimeError(f"retryable status {resp.status_code}")
        resp.raise_for_status()
        return resp.json()

    def search(self, query: str, num: int = 10) -> List[SearchResult]:
        """Return up to ``num`` (max 10 per API call) results for ``query``."""
        if not (self.api_key and self.cx):
            return []
        self.rate.wait()
        params = {
            "key": self.api_key,
            "cx": self.cx,
            "q": query,
            "num": max(1, min(num, 10)),
        }
        try:
            data = self._get(params)
        except (requests.RequestException, RuntimeError):
            return []
        return [
            SearchResult(
                title=item.get("title", ""),
                link=item.get("link", ""),
                snippet=item.get("snippet", ""),
            )
            for item in data.get("items", [])
        ]
