"""Instagram discovery via public search results + manual import.

This module NEVER logs into Instagram, bypasses auth/CAPTCHAs, or scrapes
private data. It discovers *public* Instagram profile links that appear in
search-engine results, and provides a parser to turn manually supplied
Instagram URLs (CSV/TXT/Excel) into candidate vendors. If automated search is
unavailable, the manual-import path keeps the pipeline fully functional.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import List, Optional

from app.search.base import SearchProvider, SearchResult

# Matches instagram.com/<username> but not post/reel/explore/etc. paths.
_IG_URL = re.compile(
    r"(?:https?://)?(?:www\.)?instagram\.com/([A-Za-z0-9_.]+)/?", re.IGNORECASE
)
_RESERVED = {
    "p", "reel", "reels", "explore", "stories", "tv", "accounts",
    "about", "developer", "directory", "legal", "privacy",
}


@dataclass
class InstagramCandidate:
    """A discovered public Instagram profile plus context for the pipeline."""

    username: str
    url: str
    title: str = ""
    snippet: str = ""
    source: str = "instagram_search"
    source_url: str = ""
    extra_text: str = field(default="")

    @property
    def business_name(self) -> str:
        """Best-effort business name from the search title."""
        name = re.split(r"[|\-–(]", self.title)[0].strip()
        name = re.sub(r"\bon Instagram\b.*$", "", name, flags=re.IGNORECASE).strip()
        return name or self.username


def extract_username(url_or_text: str) -> Optional[str]:
    """Return a normalized Instagram username from a URL/handle, or ``None``."""
    if not url_or_text:
        return None
    text = url_or_text.strip()
    if text.startswith("@"):
        handle = text[1:].split()[0]
        return handle.lower() if handle else None
    m = _IG_URL.search(text)
    if not m:
        return None
    username = m.group(1).lower().strip(".")
    if not username or username in _RESERVED:
        return None
    return username


def candidates_from_results(results: List[SearchResult]) -> List[InstagramCandidate]:
    """Extract unique Instagram profile candidates from search results."""
    seen: set = set()
    out: List[InstagramCandidate] = []
    for r in results:
        username = extract_username(r.link)
        if not username or username in seen:
            continue
        seen.add(username)
        out.append(
            InstagramCandidate(
                username=username,
                url=f"https://instagram.com/{username}",
                title=r.title,
                snippet=r.snippet,
                source="instagram_search",
                source_url=r.link,
                extra_text=f"{r.title} {r.snippet}",
            )
        )
    return out


class InstagramDiscoveryProvider:
    """Discovers public Instagram profiles using a :class:`SearchProvider`."""

    def __init__(self, search_provider: SearchProvider) -> None:
        self.search = search_provider

    def discover(self, query: str, num: int = 10) -> List[InstagramCandidate]:
        """Run one query and return public Instagram candidates."""
        results = self.search.search(query, num=num)
        return candidates_from_results(results)


def parse_manual_lines(lines: List[str]) -> List[InstagramCandidate]:
    """Parse a list of manually supplied Instagram URLs/handles into candidates.

    Used by the TXT import path and as a helper for CSV/Excel import.
    """
    out: List[InstagramCandidate] = []
    seen: set = set()
    for line in lines:
        username = extract_username(line)
        if not username or username in seen:
            continue
        seen.add(username)
        out.append(
            InstagramCandidate(
                username=username,
                url=f"https://instagram.com/{username}",
                title=username,
                source="manual_import",
                source_url=f"https://instagram.com/{username}",
            )
        )
    return out
