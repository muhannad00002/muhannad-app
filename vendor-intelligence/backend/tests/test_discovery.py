"""Tests for Instagram extraction and the discovery pipeline (no network)."""

from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db import Base
from app.models import Vendor
from app.search.base import SearchResult
from app.search.instagram import candidates_from_results, extract_username, parse_manual_lines
from app.services.discovery import DiscoveryEngine
from app.services.places import PlacesEnricher


# ---------------- instagram extraction ----------------
def test_extract_username_variants():
    assert extract_username("https://instagram.com/royal.bridal.om/") == "royal.bridal.om"
    assert extract_username("@muscat_makeup") == "muscat_makeup"
    assert extract_username("http://www.instagram.com/p/abc123/") is None  # a post, not a profile
    assert extract_username("https://instagram.com/explore/") is None      # reserved


def test_candidates_dedupe():
    results = [
        SearchResult("Royal Bridal | Muscat", "https://instagram.com/royal_bridal", "Bridal in Muscat, Oman"),
        SearchResult("Royal Bridal again", "https://instagram.com/royal_bridal", "dup"),
        SearchResult("Muscat Makeup", "https://instagram.com/muscat_makeup", "Makeup Muscat"),
    ]
    cands = candidates_from_results(results)
    assert len(cands) == 2
    assert cands[0].business_name == "Royal Bridal"


def test_parse_manual_lines():
    cands = parse_manual_lines(["https://instagram.com/a_shop", "@b_shop", "garbage", ""])
    assert {c.username for c in cands} == {"a_shop", "b_shop"}


# ---------------- discovery pipeline (fake search provider, enricher off) ----------------
class FakeSearch:
    name = "fake"

    def search(self, query, num=10):
        # Return the same two IG profiles regardless of query.
        return [
            SearchResult("Royal Bridal House | Muscat", "https://instagram.com/royal_bridal_om",
                         "Bridal boutique and wedding dresses in Muscat, Oman +968 9123 4567"),
            SearchResult("Dubai Glam Makeup", "https://instagram.com/dubai_glam",
                         "Makeup artist based in Dubai"),
        ]


@pytest.fixture()
def db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    s = Session()
    yield s
    s.close()


def test_run_category_persists_and_verifies(db):
    engine = DiscoveryEngine(db, FakeSearch(), enricher=PlacesEnricher(api_key=""))
    progress = engine.run_category("Bridal Boutiques", governorate="Muscat", deep=False)

    assert progress.completed_queries == progress.total_queries > 0
    vendors = db.query(Vendor).all()
    # Two unique profiles discovered (deduped across repeated queries).
    assert len(vendors) == 2

    by_ig = {v.instagram_username: v for v in vendors}
    royal = by_ig["royal_bridal_om"]
    assert royal.governorate == "Muscat"
    assert royal.confidence_score >= 30      # Oman phone + city evidence
    assert royal.category in {"Bridal Boutiques", "Wedding Dresses"}

    dubai = by_ig["dubai_glam"]
    assert dubai.status == "Needs Verification"   # insufficient Oman evidence
    assert dubai.oman_verified is False


def test_manual_ingest(db):
    engine = DiscoveryEngine(db, FakeSearch(), enricher=PlacesEnricher(api_key=""))
    cands = parse_manual_lines(["https://instagram.com/my_oman_shop"])
    progress = engine.ingest_candidates(cands, category="Flowers", governorate="Muscat")
    assert progress.new_vendors == 1
    assert db.query(Vendor).count() == 1
