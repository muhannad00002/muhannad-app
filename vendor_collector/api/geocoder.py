"""Governorate detection from coordinates and address components.

Prefers the address components already returned by the Places details endpoint
(cheap, no extra request) and falls back to Google's Geocoding API when the
governorate cannot be resolved locally.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

import requests

from api.retry import raise_for_retryable_status, with_retry
from config import OMAN_GOVERNORATES, settings
from logging_config import get_logger

logger = get_logger(__name__)

# Mapping of substrings that may appear in Google address components to the
# canonical governorate names used throughout the application.
_GOVERNORATE_ALIASES: Dict[str, str] = {
    "muscat": "Muscat",
    "masqat": "Muscat",
    "dhofar": "Dhofar",
    "zufar": "Dhofar",
    "salalah": "Dhofar",
    "musandam": "Musandam",
    "buraimi": "Al Buraimi",
    "dakhiliyah": "Al Dakhiliyah",
    "nizwa": "Al Dakhiliyah",
    "batinah north": "Al Batinah North",
    "batinah south": "Al Batinah South",
    "batinah": "Al Batinah North",
    "sohar": "Al Batinah North",
    "sharqiyah north": "Al Sharqiyah North",
    "sharqiyah south": "Al Sharqiyah South",
    "sharqiyah": "Al Sharqiyah North",
    "dhahirah": "Al Dhahirah",
    "wusta": "Al Wusta",
    "wusta ": "Al Wusta",
}


class Geocoder:
    """Resolve Oman governorates from place data."""

    def __init__(self, api_key: Optional[str] = None) -> None:
        self.api_key = api_key or settings.google_api_key
        self.session = requests.Session()
        self.request_count = 0

    @staticmethod
    def _normalise(name: str) -> Optional[str]:
        """Map an arbitrary region string to a canonical governorate name."""
        lowered = name.lower()
        for alias, canonical in _GOVERNORATE_ALIASES.items():
            if alias in lowered:
                return canonical
        for gov in OMAN_GOVERNORATES:
            if gov.lower() in lowered:
                return gov
        return None

    def from_address_components(self, components: List[Dict[str, Any]]) -> Optional[str]:
        """Detect a governorate from Places ``addressComponents``.

        Args:
            components: The ``addressComponents`` list from a details response.

        Returns:
            A canonical governorate name, or ``None`` when undetectable.
        """
        # Prefer administrative_area_level_1, then fall back to any component.
        candidates: List[str] = []
        for comp in components or []:
            types = comp.get("types", [])
            text = comp.get("longText") or comp.get("shortText") or ""
            if "administrative_area_level_1" in types:
                candidates.insert(0, text)
            else:
                candidates.append(text)

        for candidate in candidates:
            resolved = self._normalise(candidate)
            if resolved:
                return resolved
        return None

    @with_retry
    def _reverse_geocode(self, lat: float, lng: float) -> Dict[str, Any]:
        self.request_count += 1
        params = {
            "latlng": f"{lat},{lng}",
            "key": self.api_key,
            "language": settings.language_code,
            "result_type": "administrative_area_level_1",
        }
        response = self.session.get(
            settings.geocode_url, params=params, timeout=settings.request_timeout
        )
        raise_for_retryable_status(response)
        return response.json()

    def from_coordinates(self, lat: float, lng: float) -> Optional[str]:
        """Detect a governorate via reverse geocoding of coordinates."""
        if lat is None or lng is None or not self.api_key:
            return None
        try:
            data = self._reverse_geocode(lat, lng)
        except requests.RequestException as exc:
            logger.warning("Reverse geocode failed for (%s, %s): %s", lat, lng, exc)
            return None

        for result in data.get("results", []):
            for comp in result.get("address_components", []):
                if "administrative_area_level_1" in comp.get("types", []):
                    resolved = self._normalise(comp.get("long_name", ""))
                    if resolved:
                        return resolved
        return None

    def detect(
        self,
        components: List[Dict[str, Any]],
        lat: Optional[float],
        lng: Optional[float],
    ) -> str:
        """Best-effort governorate detection.

        Tries address components first, then reverse geocoding, and finally
        returns ``"Unknown"`` so downstream code never has to handle ``None``.
        """
        resolved = self.from_address_components(components)
        if resolved:
            return resolved
        if lat is not None and lng is not None:
            resolved = self.from_coordinates(lat, lng)
            if resolved:
                return resolved
        return "Unknown"
