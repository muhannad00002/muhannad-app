"""Governorate resolution service.

Wraps :class:`api.geocoder.Geocoder` with a small cache keyed on rounded
coordinates so repeated lookups in the same area do not incur extra geocoding
requests.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from api.geocoder import Geocoder
from logging_config import get_logger

logger = get_logger(__name__)


class GovernorateService:
    """Resolve and cache governorate names for places."""

    def __init__(self, geocoder: Optional[Geocoder] = None) -> None:
        self.geocoder = geocoder or Geocoder()
        self._cache: Dict[Tuple[float, float], str] = {}

    def resolve(
        self,
        components: List[Dict[str, Any]],
        lat: Optional[float],
        lng: Optional[float],
    ) -> str:
        """Return the governorate for a place, using a coordinate cache."""
        # Address components are free (already fetched) so try them first.
        from_components = self.geocoder.from_address_components(components)
        if from_components:
            return from_components

        if lat is None or lng is None:
            return "Unknown"

        key = (round(lat, 2), round(lng, 2))
        if key in self._cache:
            return self._cache[key]

        resolved = self.geocoder.from_coordinates(lat, lng) or "Unknown"
        self._cache[key] = resolved
        return resolved
