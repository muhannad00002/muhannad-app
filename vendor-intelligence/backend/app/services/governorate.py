"""Governorate & city detection from free text or address components.

Matches English and Arabic names of governorates and known cities/wilayats,
mapping cities to their parent governorate. Used both for enrichment and for
the Oman-verification signal "Oman city mentioned".
"""

from __future__ import annotations

from typing import Optional, Tuple

from app.keywords import CITIES, GOVERNORATES

# City -> parent governorate (English canonical).
CITY_TO_GOVERNORATE = {
    "Muscat": "Muscat", "Muttrah": "Muscat", "Seeb": "Muscat",
    "Bawshar": "Muscat", "Al Amerat": "Muscat", "Qurum": "Muscat",
    "Salalah": "Dhofar",
    "Sohar": "North Al Batinah", "Barka": "South Al Batinah", "Rustaq": "South Al Batinah",
    "Nizwa": "Al Dakhiliyah", "Bahla": "Al Dakhiliyah",
    "Sur": "South Al Sharqiyah", "Ibra": "North Al Sharqiyah",
    "Ibri": "Al Dhahirah", "Buraimi": "Al Buraimi", "Khasab": "Musandam",
}

# Arabic alias -> English (governorates + cities), lowercased where relevant.
_AR_ALIASES = {ar: en for en, ar in {**GOVERNORATES, **CITIES}.items()}


def detect_city(text: Optional[str]) -> Optional[str]:
    """Return a known city mentioned in ``text`` (English or Arabic)."""
    if not text:
        return None
    lowered = text.lower()
    for city_en, city_ar in CITIES.items():
        if city_en.lower() in lowered or city_ar in text:
            return city_en
    return None


def detect_governorate(text: Optional[str]) -> Optional[str]:
    """Return the best governorate implied by ``text``.

    Tries explicit governorate names first (English/Arabic), then infers the
    governorate from any city/wilayat mentioned.
    """
    if not text:
        return None
    lowered = text.lower()
    for gov_en, gov_ar in GOVERNORATES.items():
        if gov_en.lower() in lowered or gov_ar in text:
            return gov_en
    city = detect_city(text)
    if city:
        return CITY_TO_GOVERNORATE.get(city)
    return None


def detect_location(text: Optional[str]) -> Tuple[Optional[str], Optional[str]]:
    """Return ``(governorate, city)`` detected from ``text``."""
    return detect_governorate(text), detect_city(text)
