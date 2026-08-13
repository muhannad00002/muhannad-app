"""Duplicate detection.

The same business surfaces via Instagram, Google Maps, a website, and multiple
Arabic/English spellings. Matching is layered: exact keys first (Google Place
ID, Instagram username, normalized phone, website host), then fuzzy business
name. Matches are flagged for review rather than deleted automatically.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Iterable, List, Optional, Protocol
from urllib.parse import urlparse

from rapidfuzz import fuzz

from app.services.phone import normalize_oman_phone

_ARABIC_DIACRITICS = re.compile(r"[ً-ْـ]")


class VendorLike(Protocol):
    """Minimal shape needed for matching (works with ORM or plain objects)."""

    id: Optional[int]
    business_name: Optional[str]
    google_place_id: Optional[str]
    instagram_username: Optional[str]
    phone_number: Optional[str]
    website: Optional[str]


@dataclass
class DuplicateMatch:
    """A candidate duplicate and why it matched."""

    vendor_id: Optional[int]
    reason: str
    score: float


def normalize_name(name: Optional[str]) -> str:
    """Normalize a business name for comparison (EN + AR aware)."""
    if not name:
        return ""
    text = name.strip().lower()
    text = _ARABIC_DIACRITICS.sub("", text)
    # Drop common noise words in both languages.
    for noise in ["oman", "عمان", "the", "for", "و", "ال", "boutique", "بوتيك"]:
        text = text.replace(noise, " ")
    # Normalize Arabic alef/hamza and ta-marbuta variants.
    text = text.translate(str.maketrans({"أ": "ا", "إ": "ا", "آ": "ا", "ة": "ه", "ى": "ي"}))
    text = re.sub(r"[^\w؀-ۿ]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _host(url: Optional[str]) -> str:
    if not url:
        return ""
    try:
        netloc = urlparse(url if "://" in url else f"http://{url}").netloc.lower()
        return netloc[4:] if netloc.startswith("www.") else netloc
    except ValueError:
        return ""


def _ig(username: Optional[str]) -> str:
    if not username:
        return ""
    return username.strip().lower().lstrip("@")


def find_duplicate(
    candidate: VendorLike,
    existing: Iterable[VendorLike],
    name_threshold: int = 88,
) -> Optional[DuplicateMatch]:
    """Return the strongest duplicate match for ``candidate``, or ``None``.

    Args:
        candidate: The new vendor being considered.
        existing: Vendors already in the database.
        name_threshold: Fuzzy-name similarity (0–100) required to flag a match.
    """
    cand_place = (candidate.google_place_id or "").strip()
    cand_ig = _ig(candidate.instagram_username)
    cand_phone = normalize_oman_phone(candidate.phone_number)
    cand_host = _host(candidate.website)
    cand_name = normalize_name(candidate.business_name)

    best: Optional[DuplicateMatch] = None

    def consider(match: DuplicateMatch) -> None:
        nonlocal best
        if best is None or match.score > best.score:
            best = match

    for other in existing:
        if candidate.id is not None and other.id == candidate.id:
            continue

        if cand_place and (other.google_place_id or "").strip() == cand_place:
            consider(DuplicateMatch(other.id, "google_place_id", 100.0))
            continue
        if cand_ig and _ig(other.instagram_username) == cand_ig:
            consider(DuplicateMatch(other.id, "instagram_username", 99.0))
            continue
        if cand_phone and normalize_oman_phone(other.phone_number) == cand_phone:
            consider(DuplicateMatch(other.id, "phone_number", 95.0))
            continue
        if cand_host and _host(other.website) == cand_host:
            consider(DuplicateMatch(other.id, "website", 92.0))
            continue

        other_name = normalize_name(other.business_name)
        if cand_name and other_name:
            sim = fuzz.token_sort_ratio(cand_name, other_name)
            if sim >= name_threshold:
                consider(DuplicateMatch(other.id, f"fuzzy_name:{int(sim)}", float(sim)))

    return best
