"""Overall vendor data-quality score (0–100) and band."""

from __future__ import annotations

from typing import Optional, Protocol

QUALITY_POINTS = {
    "phone": 20,
    "instagram": 20,
    "google_maps": 20,
    "website": 10,
    "oman_verified": 20,
    "category_verified": 10,
}


class QualityInput(Protocol):
    phone_number: Optional[str]
    instagram_url: Optional[str]
    google_place_id: Optional[str]
    website: Optional[str]
    oman_verified: bool
    category_confidence: int


def quality_score(vendor: QualityInput, category_verified_threshold: int = 70) -> int:
    """Return a 0–100 completeness/quality score for a vendor."""
    score = 0
    if vendor.phone_number:
        score += QUALITY_POINTS["phone"]
    if vendor.instagram_url:
        score += QUALITY_POINTS["instagram"]
    if vendor.google_place_id:
        score += QUALITY_POINTS["google_maps"]
    if vendor.website:
        score += QUALITY_POINTS["website"]
    if vendor.oman_verified:
        score += QUALITY_POINTS["oman_verified"]
    if (vendor.category_confidence or 0) >= category_verified_threshold:
        score += QUALITY_POINTS["category_verified"]
    return min(score, 100)


def quality_band(score: int) -> str:
    """Map a quality score to a human band."""
    if score >= 90:
        return "Excellent"
    if score >= 75:
        return "Good"
    if score >= 50:
        return "Average"
    return "Needs Review"
