"""Unit tests for the Vendor model."""

from __future__ import annotations

import json

from database.models import Vendor


def _sample_details() -> dict:
    return {
        "id": "ChIJ_test123",
        "displayName": {"text": "Rose Bridal Boutique"},
        "formattedAddress": "Al Khuwair, Muscat, Oman",
        "location": {"latitude": 23.588, "longitude": 58.408},
        "internationalPhoneNumber": "+968 1234 5678",
        "websiteUri": "https://example.om",
        "rating": 4.5,
        "userRatingCount": 120,
        "googleMapsUri": "https://maps.google.com/?cid=1",
        "businessStatus": "OPERATIONAL",
        "regularOpeningHours": {"weekdayDescriptions": ["Monday: 9-5", "Tuesday: 9-5"]},
    }


def test_from_details_maps_all_fields() -> None:
    vendor = Vendor.from_details(_sample_details(), "Bridal Boutiques", "Muscat")
    assert vendor.place_id == "ChIJ_test123"
    assert vendor.business_name == "Rose Bridal Boutique"
    assert vendor.category == "Bridal Boutiques"
    assert vendor.phone == "+968 1234 5678"
    assert vendor.rating == 4.5
    assert vendor.rating_count == 120
    assert vendor.governorate == "Muscat"
    assert vendor.latitude == 23.588


def test_from_details_serialises_opening_hours() -> None:
    vendor = Vendor.from_details(_sample_details(), "Bridal Boutiques", "Muscat")
    assert vendor.opening_hours is not None
    assert json.loads(vendor.opening_hours) == ["Monday: 9-5", "Tuesday: 9-5"]


def test_from_details_handles_missing_fields() -> None:
    minimal = {"id": "x", "displayName": {"text": "Name"}}
    vendor = Vendor.from_details(minimal, "Flowers", "Unknown")
    assert vendor.phone is None
    assert vendor.opening_hours is None
    assert vendor.rating is None
