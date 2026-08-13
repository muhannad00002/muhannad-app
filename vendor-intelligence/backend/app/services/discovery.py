"""Discovery engine.

Orchestrates the pipeline for a category/governorate:

    keyword queries -> public search -> Instagram + website candidates
    -> category classification -> Oman verification -> Places enrichment
    -> duplicate detection -> persist

Emits progress via an optional callback so the job system can report live
stats. Never raises for a single failed candidate — errors are counted and the
run continues.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Callable, Dict, List, Optional

from sqlalchemy.orm import Session

from app.config import settings
from app.keywords import generate_queries
from app.models import SearchQuery, Vendor, VendorStatus
from app.search.base import SearchProvider
from app.search.instagram import InstagramCandidate, InstagramDiscoveryProvider
from app.services.classification import classify
from app.services.dedup import find_duplicate
from app.services.governorate import detect_location
from app.services.phone import normalize_oman_phone, whatsapp_link
from app.services.places import PlacesEnricher
from app.services.quality import quality_score
from app.services.verification import verify_oman

ProgressCB = Callable[["DiscoveryProgress"], None]


@dataclass
class DiscoveryProgress:
    """Live counters for a discovery run."""

    category: str = ""
    total_queries: int = 0
    completed_queries: int = 0
    results_found: int = 0
    new_vendors: int = 0
    duplicates: int = 0
    needs_verification: int = 0
    errors: int = 0


class DiscoveryEngine:
    """Runs discovery for categories and persists vendors."""

    def __init__(
        self,
        db: Session,
        search_provider: SearchProvider,
        enricher: Optional[PlacesEnricher] = None,
    ) -> None:
        self.db = db
        self.ig = InstagramDiscoveryProvider(search_provider)
        self.enricher = enricher or PlacesEnricher()
        self.threshold = settings.confidence_threshold

    # -- candidate -> vendor ----------------------------------------------
    def _build_vendor(
        self, cand: InstagramCandidate, category: str, governorate: Optional[str]
    ) -> Vendor:
        """Classify, verify, enrich and score a candidate into a Vendor."""
        text = " ".join(filter(None, [cand.business_name, cand.title, cand.snippet, cand.extra_text]))

        cls = classify(text, hint_category=category)
        gov, city = detect_location(text)
        gov = gov or governorate

        # Optional Google Places enrichment (verification + contact data).
        enrichment = None
        if self.enricher.enabled:
            enrichment = self.enricher.enrich(cand.business_name, gov or governorate)

        phone = None
        website = None
        maps_url = place_id = None
        rating = review_count = None
        lat = lng = None
        address = None
        gmaps_country = None
        field_sources: Dict[str, str] = {"instagram": cand.source}

        if enrichment:
            place_id = enrichment.place_id
            maps_url = enrichment.maps_url
            rating = enrichment.rating
            review_count = enrichment.review_count
            address = enrichment.address
            lat, lng = enrichment.latitude, enrichment.longitude
            phone = normalize_oman_phone(enrichment.phone)
            website = enrichment.website
            gmaps_country = enrichment.country
            gov = gov or enrichment.governorate
            field_sources.update({"phone": "google_maps", "address": "google_maps",
                                   "google_maps": "google_maps"})

        ver = verify_oman(
            phone=phone,
            address=address,
            google_maps_country=gmaps_country,
            instagram_bio=cand.snippet,
            location_tag=gov,
            website=website,
            extra_text=text,
        )

        if ver.oman_verified:
            status = VendorStatus.VERIFIED.value if ver.score >= 90 else VendorStatus.NEW.value
        else:
            status = VendorStatus.NEEDS_VERIFICATION.value

        vendor = Vendor(
            business_name=cand.business_name,
            category=cls.category or category,
            subcategory=cls.secondary[0] if cls.secondary else None,
            phone_number=phone,
            whatsapp_number=whatsapp_link(phone),
            governorate=gov,
            city=city,
            address=address,
            instagram_username=cand.username,
            instagram_url=cand.url,
            website=website,
            google_maps_url=maps_url,
            google_place_id=place_id,
            google_rating=rating,
            google_review_count=review_count,
            latitude=lat,
            longitude=lng,
            description=cand.snippet or None,
            source=cand.source,
            source_url=cand.source_url,
            field_sources=_json(field_sources),
            oman_verified=ver.oman_verified,
            verification_status=ver.band,
            confidence_score=ver.score,
            category_confidence=cls.confidence,
            status=status,
        )
        vendor.quality_score = quality_score(vendor, self.threshold)
        return vendor

    # -- persistence with dedup -------------------------------------------
    def _persist(self, vendor: Vendor, progress: DiscoveryProgress) -> None:
        existing = self.db.query(Vendor).all()
        match = find_duplicate(vendor, existing)
        if match is not None:
            progress.duplicates += 1
            # Record as duplicate for admin review (do not blindly discard).
            vendor.status = VendorStatus.DUPLICATE.value
            vendor.notes = f"Possible duplicate of vendor #{match.vendor_id} ({match.reason})"
            self.db.add(vendor)
            self.db.commit()
            return

        self.db.add(vendor)
        self.db.commit()
        progress.new_vendors += 1
        if vendor.status == VendorStatus.NEEDS_VERIFICATION.value:
            progress.needs_verification += 1

    # -- public API --------------------------------------------------------
    def run_category(
        self,
        category: str,
        governorate: Optional[str] = None,
        deep: bool = False,
        progress: Optional[DiscoveryProgress] = None,
        on_progress: Optional[ProgressCB] = None,
        should_continue: Optional[Callable[[], bool]] = None,
    ) -> DiscoveryProgress:
        """Discover vendors for one category.

        Args:
            category: Category to search.
            governorate: Optional governorate to focus.
            deep: Deep-search mode (many more query variations).
            progress: Existing progress object to accumulate into.
            on_progress: Callback fired after each query for live updates.
            should_continue: Predicate returning False to stop early (pause/cancel).
        """
        progress = progress or DiscoveryProgress()
        progress.category = category

        per = settings.search_cfg.get(
            "deep_queries_per_category" if deep else "standard_queries_per_category",
            40 if deep else 8,
        )
        queries = generate_queries(category, governorate, deep=deep, limit=per)
        progress.total_queries += len(queries)
        num = int(settings.search_cfg.get("max_results_per_query", 10))

        for query in queries:
            if should_continue and not should_continue():
                break
            try:
                candidates = self.ig.discover(query, num=num)
                self.db.add(SearchQuery(category=category, query_text=query,
                                        results_count=len(candidates)))
                self.db.commit()
                progress.results_found += len(candidates)
                for cand in candidates:
                    try:
                        vendor = self._build_vendor(cand, category, governorate)
                        self._persist(vendor, progress)
                    except Exception:  # noqa: BLE001 - keep the run alive
                        self.db.rollback()
                        progress.errors += 1
            except Exception:  # noqa: BLE001
                self.db.rollback()
                progress.errors += 1
            finally:
                progress.completed_queries += 1
                if on_progress:
                    on_progress(progress)

        return progress

    def ingest_candidates(
        self,
        candidates: List[InstagramCandidate],
        category: Optional[str] = None,
        governorate: Optional[str] = None,
    ) -> DiscoveryProgress:
        """Run the enrichment/verification/dedup pipeline over manual candidates."""
        progress = DiscoveryProgress(category=category or "manual")
        for cand in candidates:
            try:
                vendor = self._build_vendor(cand, category or "", governorate)
                self._persist(vendor, progress)
            except Exception:  # noqa: BLE001
                self.db.rollback()
                progress.errors += 1
        return progress


def _json(obj: dict) -> str:
    import json

    return json.dumps(obj, ensure_ascii=False)
