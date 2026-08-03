"""Thin client around the Google Places API (New).

Only the official REST endpoints are used:

* ``POST https://places.googleapis.com/v1/places:searchText`` for text search
  (with pagination via ``pageToken``).
* ``GET  https://places.googleapis.com/v1/places/{PLACE_ID}`` for details.

No HTML scraping is performed anywhere in this module.
"""

from __future__ import annotations

from typing import Any, Dict, Iterator, List, Optional

import requests

from api.retry import raise_for_retryable_status, with_retry
from config import settings
from logging_config import get_logger

logger = get_logger(__name__)

# Field mask requested from the search endpoint. Keeping it lean reduces cost
# and payload size; full details are fetched separately per place.
_SEARCH_FIELD_MASK = ",".join(
    [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.location",
        "nextPageToken",
    ]
)

# Field mask requested from the details endpoint.
_DETAILS_FIELD_MASK = ",".join(
    [
        "id",
        "displayName",
        "formattedAddress",
        "addressComponents",
        "location",
        "nationalPhoneNumber",
        "internationalPhoneNumber",
        "websiteUri",
        "rating",
        "userRatingCount",
        "googleMapsUri",
        "businessStatus",
        "regularOpeningHours",
        "primaryTypeDisplayName",
    ]
)


class PlacesAPIError(Exception):
    """Raised when the Places API returns an unrecoverable error."""


class PlacesClient:
    """Client for the Google Places API (New).

    The client is stateful only in that it counts requests, which the collector
    surfaces as a statistic. A single :class:`requests.Session` is reused for
    connection pooling.
    """

    def __init__(self, api_key: Optional[str] = None) -> None:
        self.api_key = api_key or settings.google_api_key
        if not self.api_key:
            raise PlacesAPIError("A Google API key is required.")
        self.session = requests.Session()
        self.request_count = 0

    # -- internal helpers --------------------------------------------------
    def _headers(self, field_mask: str) -> Dict[str, str]:
        return {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": self.api_key,
            "X-Goog-FieldMask": field_mask,
        }

    @with_retry
    def _post(self, url: str, payload: Dict[str, Any], field_mask: str) -> Dict[str, Any]:
        self.request_count += 1
        logger.info("POST %s | payload=%s", url, payload.get("textQuery"))
        response = self.session.post(
            url, json=payload, headers=self._headers(field_mask),
            timeout=settings.request_timeout,
        )
        raise_for_retryable_status(response)
        return response.json()

    @with_retry
    def _get(self, url: str, field_mask: str) -> Dict[str, Any]:
        self.request_count += 1
        logger.info("GET %s", url)
        response = self.session.get(
            url, headers=self._headers(field_mask),
            timeout=settings.request_timeout,
        )
        raise_for_retryable_status(response)
        return response.json()

    # -- public API --------------------------------------------------------
    def search_text(self, query: str) -> Iterator[Dict[str, Any]]:
        """Yield every place matching ``query`` across all result pages.

        Args:
            query: Full text query, e.g. ``"Wedding Dresses Muscat Oman"``.

        Yields:
            Raw place dictionaries as returned by the search endpoint.
        """
        page_token: Optional[str] = None
        pages_fetched = 0

        while True:
            payload: Dict[str, Any] = {
                "textQuery": query,
                "pageSize": settings.page_size,
                "languageCode": settings.language_code,
                "regionCode": settings.region_code,
            }
            if page_token:
                payload["pageToken"] = page_token

            try:
                data = self._post(settings.places_search_url, payload, _SEARCH_FIELD_MASK)
            except requests.HTTPError as exc:
                logger.error("Search failed for %r: %s", query, exc)
                raise PlacesAPIError(str(exc)) from exc

            places: List[Dict[str, Any]] = data.get("places", [])
            logger.info("Query %r page %s -> %s results", query, pages_fetched + 1, len(places))
            for place in places:
                yield place

            pages_fetched += 1
            page_token = data.get("nextPageToken")
            if not page_token or pages_fetched >= settings.max_pages:
                break

    def get_place_details(self, place_id: str) -> Dict[str, Any]:
        """Return full details for a single ``place_id``.

        Args:
            place_id: The Places API resource id (without the ``places/`` prefix).

        Returns:
            The raw details dictionary from the API.
        """
        url = f"{settings.places_details_url}/{place_id}"
        try:
            return self._get(url, _DETAILS_FIELD_MASK)
        except requests.HTTPError as exc:
            logger.error("Details failed for %s: %s", place_id, exc)
            raise PlacesAPIError(str(exc)) from exc
