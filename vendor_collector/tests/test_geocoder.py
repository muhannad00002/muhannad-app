"""Unit tests for governorate normalisation (no network access)."""

from __future__ import annotations

from api.geocoder import Geocoder


def test_normalise_known_aliases() -> None:
    assert Geocoder._normalise("Muscat Governorate") == "Muscat"
    assert Geocoder._normalise("Salalah") == "Dhofar"
    assert Geocoder._normalise("Sohar") == "Al Batinah North"


def test_normalise_unknown_returns_none() -> None:
    assert Geocoder._normalise("Atlantis") is None


def test_from_address_components_prefers_admin_area() -> None:
    geocoder = Geocoder.__new__(Geocoder)  # bypass __init__ (no API key needed)
    components = [
        {"longText": "Al Khuwair", "types": ["sublocality"]},
        {"longText": "Muscat", "types": ["administrative_area_level_1"]},
    ]
    assert geocoder.from_address_components(components) == "Muscat"
