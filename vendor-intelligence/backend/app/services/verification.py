"""Oman verification scoring.

Combines public-evidence signals into a 0–100 confidence score that a business
operates in Oman, plus a coarse band (Very High / High / Medium / Low). A high
score never auto-approves — it only informs the human reviewer.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional

from app.services.governorate import detect_city, detect_governorate
from app.services.phone import is_oman_phone

# Signal -> points. Mirrors the specification's weighting.
SIGNAL_POINTS = {
    "oman_phone": 30,
    "oman_address": 30,
    "google_maps_oman": 25,
    "instagram_says_oman": 20,
    "oman_location_tag": 15,
    "oman_website": 15,
    "oman_city_mentioned": 10,
}


@dataclass
class VerificationResult:
    """Outcome of Oman verification for one vendor."""

    score: int
    band: str
    oman_verified: bool
    signals: List[str] = field(default_factory=list)

    def as_dict(self) -> Dict[str, object]:
        return {
            "score": self.score,
            "band": self.band,
            "oman_verified": self.oman_verified,
            "signals": self.signals,
        }


def _band(score: int) -> str:
    if score >= 90:
        return "Very High"
    if score >= 75:
        return "High"
    if score >= 50:
        return "Medium"
    return "Low"


def verify_oman(
    *,
    phone: Optional[str] = None,
    address: Optional[str] = None,
    google_maps_country: Optional[str] = None,
    instagram_bio: Optional[str] = None,
    location_tag: Optional[str] = None,
    website: Optional[str] = None,
    extra_text: Optional[str] = None,
) -> VerificationResult:
    """Score the evidence that a business operates in Oman.

    Each argument is an independent public signal. Points are summed and capped
    at 100. ``oman_verified`` is True at/above the "High" band (75).
    """
    score = 0
    signals: List[str] = []

    def add(signal: str) -> None:
        nonlocal score
        score += SIGNAL_POINTS[signal]
        signals.append(signal)

    if phone and is_oman_phone(phone):
        add("oman_phone")

    if address and detect_governorate(address):
        add("oman_address")

    if google_maps_country and google_maps_country.strip().lower() in {"oman", "om", "عمان"}:
        add("google_maps_oman")

    bio = instagram_bio or ""
    if bio and (detect_governorate(bio) or "oman" in bio.lower() or "عمان" in bio):
        add("instagram_says_oman")

    if location_tag and (detect_governorate(location_tag) or "oman" in location_tag.lower() or "عمان" in location_tag):
        add("oman_location_tag")

    if website and (".om" in website.lower() or "oman" in website.lower()):
        add("oman_website")

    combined = " ".join(filter(None, [address, bio, location_tag, extra_text]))
    if "oman_address" not in signals and (detect_city(combined) or detect_governorate(combined)):
        add("oman_city_mentioned")

    score = min(score, 100)
    band = _band(score)
    return VerificationResult(
        score=score, band=band, oman_verified=score >= 75, signals=signals
    )
