"""Pydantic request/response models for the API."""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class VendorOut(BaseModel):
    """Vendor as returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    business_name: str
    category: Optional[str] = None
    subcategory: Optional[str] = None
    phone_number: Optional[str] = None
    whatsapp_number: Optional[str] = None
    governorate: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    instagram_username: Optional[str] = None
    instagram_url: Optional[str] = None
    website: Optional[str] = None
    google_maps_url: Optional[str] = None
    google_place_id: Optional[str] = None
    google_rating: Optional[float] = None
    google_review_count: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: Optional[str] = None
    source: Optional[str] = None
    source_url: Optional[str] = None
    oman_verified: bool = False
    verification_status: Optional[str] = None
    confidence_score: int = 0
    category_confidence: int = 0
    quality_score: int = 0
    status: str
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class VendorList(BaseModel):
    """A page of vendors."""

    total: int
    page: int
    page_size: int
    items: List[VendorOut]


class VendorUpdate(BaseModel):
    """Editable fields for manual verification/correction."""

    business_name: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    phone_number: Optional[str] = None
    governorate: Optional[str] = None
    city: Optional[str] = None
    instagram_url: Optional[str] = None
    website: Optional[str] = None
    google_maps_url: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    confidence_score: Optional[int] = None


class BulkAction(BaseModel):
    """Bulk approve/reject/status change over selected ids."""

    ids: List[int]
    status: str


class MergeRequest(BaseModel):
    """Merge ``duplicate_id`` into ``primary_id``."""

    primary_id: int
    duplicate_id: int


class DiscoveryRequest(BaseModel):
    """Parameters for starting a discovery job."""

    categories: List[str] = []
    governorate: Optional[str] = None
    sources: List[str] = ["instagram", "google_maps"]
    deep: bool = False


class JobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str
    governorate: Optional[str] = None
    depth: str
    total_queries: int
    completed_queries: int
    results_found: int
    new_vendors: int
    duplicates: int
    needs_verification: int
    errors: int
    current_category: Optional[str] = None
    message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class StatsOut(BaseModel):
    """Dashboard summary statistics."""

    total_vendors: int
    verified: int
    needs_verification: int
    approved: int
    rejected: int
    categories: int
    governorates: int
    instagram_accounts: int
    google_maps_matches: int
    by_category: dict
    by_governorate: dict
    by_status: dict


class ImportResult(BaseModel):
    parsed: int
    new_vendors: int
    duplicates: int
    needs_verification: int
    errors: int
