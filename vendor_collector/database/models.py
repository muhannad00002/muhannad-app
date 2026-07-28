"""Data models mapping Places API responses to database rows."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


@dataclass
class Vendor:
    """A single wedding-related business.

    ``place_id`` is the primary business key used for deduplication; the SQLite
    ``id`` column is an auto-incrementing surrogate key.
    """

    place_id: str
    business_name: str
    category: str
    phone: Optional[str] = None
    website: Optional[str] = None
    rating: Optional[float] = None
    rating_count: Optional[int] = None
    address: Optional[str] = None
    governorate: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    maps_url: Optional[str] = None
    business_status: Optional[str] = None
    opening_hours: Optional[str] = None
    last_updated: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

    def to_row(self) -> Dict[str, Any]:
        """Return a dict suitable for parameterised SQL insertion."""
        return asdict(self)

    @classmethod
    def from_details(
        cls,
        details: Dict[str, Any],
        category: str,
        governorate: str,
    ) -> "Vendor":
        """Build a :class:`Vendor` from a Places details payload.

        Args:
            details: Raw details response from the Places API.
            category: The search category the place was discovered under.
            governorate: Resolved governorate name.
        """
        location = details.get("location", {}) or {}
        opening = details.get("regularOpeningHours", {}) or {}
        opening_desc: List[str] = opening.get("weekdayDescriptions", []) or []

        return cls(
            place_id=details.get("id", ""),
            business_name=(details.get("displayName", {}) or {}).get("text", ""),
            category=category,
            phone=details.get("internationalPhoneNumber")
            or details.get("nationalPhoneNumber"),
            website=details.get("websiteUri"),
            rating=details.get("rating"),
            rating_count=details.get("userRatingCount"),
            address=details.get("formattedAddress"),
            governorate=governorate,
            latitude=location.get("latitude"),
            longitude=location.get("longitude"),
            maps_url=details.get("googleMapsUri"),
            business_status=details.get("businessStatus"),
            opening_hours=json.dumps(opening_desc, ensure_ascii=False)
            if opening_desc
            else None,
        )
