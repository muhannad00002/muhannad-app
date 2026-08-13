"""Google Places API (New) enrichment.

Used for verification and enrichment only (not primary discovery). Given a
business name (and optional area), it finds the matching Google place and
returns structured fields: place id, maps url, rating, review count, address,
coordinates, phone, and the country component (for Oman verification).

Official REST endpoints only — no HTML scraping.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import requests
from tenacity import retry, stop_after_attempt, wait_exponential_jitter

from app.config import settings

_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"
_DETAILS_URL = "https://places.googleapis.com/v1/places"

_SEARCH_MASK = "places.id,places.displayName,places.formattedAddress"
_DETAILS_MASK = ",".join([
    "id", "displayName", "formattedAddress", "addressComponents", "location",
    "nationalPhoneNumber", "internationalPhoneNumber", "websiteUri", "rating",
    "userRatingCount", "googleMapsUri", "businessStatus",
])


@dataclass
class PlaceEnrichment:
    """Structured enrichment data from Google Places."""

    place_id: str
    name: str
    maps_url: Optional[str] = None
    rating: Optional[float] = None
    review_count: Optional[int] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    country: Optional[str] = None
    governorate: Optional[str] = None


class PlacesEnricher:
    """Thin, retrying client over the Google Places API (New)."""

    def __init__(self, api_key: Optional[str] = None) -> None:
        self.api_key = api_key if api_key is not None else settings.google_maps_api_key
        self.session = requests.Session()
        self.request_count = 0

    @property
    def enabled(self) -> bool:
        return bool(self.api_key)

    def _headers(self, mask: str) -> Dict[str, str]:
        return {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": self.api_key,
            "X-Goog-FieldMask": mask,
        }

    @retry(reraise=True, stop=stop_after_attempt(4),
           wait=wait_exponential_jitter(initial=1, max=20))
    def _post(self, url: str, payload: dict, mask: str) -> dict:
        self.request_count += 1
        resp = self.session.post(url, json=payload, headers=self._headers(mask), timeout=20)
        if resp.status_code in {429, 500, 503}:
            raise RuntimeError(f"retryable {resp.status_code}")
        resp.raise_for_status()
        return resp.json()

    @retry(reraise=True, stop=stop_after_attempt(4),
           wait=wait_exponential_jitter(initial=1, max=20))
    def _get(self, url: str, mask: str) -> dict:
        self.request_count += 1
        resp = self.session.get(url, headers=self._headers(mask), timeout=20)
        if resp.status_code in {429, 500, 503}:
            raise RuntimeError(f"retryable {resp.status_code}")
        resp.raise_for_status()
        return resp.json()

    def find_place_id(self, name: str, area: Optional[str] = None) -> Optional[str]:
        """Text-search for the best matching place id in Oman."""
        if not self.enabled or not name:
            return None
        query = f"{name} {area or ''} {settings.default_country}".strip()
        try:
            data = self._post(_SEARCH_URL, {
                "textQuery": query, "pageSize": 1,
                "regionCode": settings.default_country_code,
            }, _SEARCH_MASK)
        except (requests.RequestException, RuntimeError):
            return None
        places: List[dict] = data.get("places", [])
        return places[0].get("id") if places else None

    def get_details(self, place_id: str) -> Optional[PlaceEnrichment]:
        """Fetch and structure details for a place id."""
        if not self.enabled or not place_id:
            return None
        try:
            d = self._get(f"{_DETAILS_URL}/{place_id}", _DETAILS_MASK)
        except (requests.RequestException, RuntimeError):
            return None

        loc = d.get("location", {}) or {}
        country = None
        gov = None
        for comp in d.get("addressComponents", []) or []:
            types = comp.get("types", [])
            if "country" in types:
                country = comp.get("longText")
            if "administrative_area_level_1" in types:
                gov = comp.get("longText")
        return PlaceEnrichment(
            place_id=d.get("id", place_id),
            name=(d.get("displayName", {}) or {}).get("text", ""),
            maps_url=d.get("googleMapsUri"),
            rating=d.get("rating"),
            review_count=d.get("userRatingCount"),
            address=d.get("formattedAddress"),
            latitude=loc.get("latitude"),
            longitude=loc.get("longitude"),
            phone=d.get("internationalPhoneNumber") or d.get("nationalPhoneNumber"),
            website=d.get("websiteUri"),
            country=country,
            governorate=gov,
        )

    def enrich(self, name: str, area: Optional[str] = None) -> Optional[PlaceEnrichment]:
        """Convenience: find a place id then fetch its details."""
        place_id = self.find_place_id(name, area)
        return self.get_details(place_id) if place_id else None
