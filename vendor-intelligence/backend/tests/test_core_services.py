"""Unit tests for the pure core services (no network / no DB)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from app.keywords import ALL_CATEGORIES, generate_queries
from app.services.classification import classify
from app.services.dedup import find_duplicate, normalize_name
from app.services.governorate import detect_governorate
from app.services.phone import is_oman_phone, normalize_oman_phone, whatsapp_link
from app.services.quality import quality_band, quality_score
from app.services.verification import verify_oman


# ---------------- phone ----------------
def test_phone_normalization_variants():
    for raw in ["96891234567", "0096891234567", "+968 9123 4567", "9123 4567", "+968-9123-4567"]:
        assert normalize_oman_phone(raw) == "+968 9123 4567"


def test_phone_invalid():
    assert normalize_oman_phone("") is None
    assert normalize_oman_phone("abc") is None
    assert is_oman_phone("12345") is False


def test_whatsapp_link():
    assert whatsapp_link("+968 9123 4567") == "https://wa.me/96891234567"


# ---------------- governorate ----------------
def test_governorate_detection_en_ar():
    assert detect_governorate("Al Khuwair, Muscat, Oman") == "Muscat"
    assert detect_governorate("صلالة") == "Dhofar"          # city -> governorate
    assert detect_governorate("Sohar") == "North Al Batinah"
    assert detect_governorate("nowhere") is None


# ---------------- verification ----------------
def test_verify_high_score():
    r = verify_oman(phone="+968 9123 4567", address="Muscat, Oman",
                    google_maps_country="Oman", instagram_bio="Bridal in Muscat")
    assert r.score >= 90
    assert r.band == "Very High"
    assert r.oman_verified is True


def test_verify_low_score_needs_review():
    r = verify_oman(instagram_bio="Dubai based designer")
    assert r.score < 50
    assert r.oman_verified is False


# ---------------- classification ----------------
def test_classify_bridal():
    r = classify("Royal Bridal House - wedding dresses and bridal gowns",
                 hint_category="Bridal Boutiques")
    assert r.category in {"Bridal Boutiques", "Wedding Dresses"}
    assert r.confidence > 0


def test_classify_arabic_makeup():
    r = classify("مكياج عرائس واحترافي في مسقط")
    assert r.category == "Makeup Artists"


# ---------------- keywords ----------------
def test_all_categories_generate_queries():
    assert len(ALL_CATEGORIES) == 35
    for cat in ALL_CATEGORIES:
        std = generate_queries(cat)
        deep = generate_queries(cat, deep=True)
        assert len(std) >= 4
        assert len(deep) > len(std)
        assert any(("عمان" in q) or ("Oman" in q) for q in std)


def test_deep_queries_include_instagram_dork():
    deep = generate_queries("Wedding Dresses", deep=True)
    assert any("site:instagram.com" in q for q in deep)


# ---------------- dedup ----------------
@dataclass
class V:
    id: Optional[int]
    business_name: Optional[str] = None
    google_place_id: Optional[str] = None
    instagram_username: Optional[str] = None
    phone_number: Optional[str] = None
    website: Optional[str] = None


def test_dedup_by_place_id():
    existing = [V(1, "Al Noor Bridal", google_place_id="ABC")]
    cand = V(None, "Different Name", google_place_id="ABC")
    m = find_duplicate(cand, existing)
    assert m and m.reason == "google_place_id"


def test_dedup_fuzzy_name():
    existing = [V(1, "Al Noor Bridal Oman")]
    cand = V(None, "Al Noor Bridal")
    m = find_duplicate(cand, existing)
    assert m and m.reason.startswith("fuzzy_name")


def test_dedup_none_when_distinct():
    existing = [V(1, "Al Noor Bridal")]
    cand = V(None, "Sunset Photography Studio")
    assert find_duplicate(cand, existing) is None


def test_normalize_name_arabic():
    assert normalize_name("النور للعرائس") == normalize_name("النور  للعرائس")


# ---------------- quality ----------------
def test_quality_score_and_band():
    v = V(1, phone_number="+968 9123 4567", instagram_username="x",
          google_place_id="P", website="https://x.om")
    # add attributes used by quality
    v.instagram_url = "https://instagram.com/x"
    v.oman_verified = True
    v.category_confidence = 90
    score = quality_score(v)
    assert score == 100
    assert quality_band(score) == "Excellent"
