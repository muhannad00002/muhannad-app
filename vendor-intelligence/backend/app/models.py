"""SQLAlchemy ORM models.

The schema is designed to be portable to PostgreSQL: no SQLite-specific column
types, timestamps stored as timezone-aware ``DateTime``, and enums represented
as plain strings validated in the service layer for flexibility.
"""

from __future__ import annotations

import enum
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class VendorStatus(str, enum.Enum):
    """Lifecycle status for a vendor record."""

    NEW = "New"
    NEEDS_VERIFICATION = "Needs Verification"
    VERIFIED = "Verified"
    REJECTED = "Rejected"
    DUPLICATE = "Duplicate"
    APPROVED = "Approved"


class Vendor(Base):
    """A wedding-service business discovered for the Oman database."""

    __tablename__ = "vendors"
    __table_args__ = (
        Index("ix_vendors_category", "category"),
        Index("ix_vendors_governorate", "governorate"),
        Index("ix_vendors_status", "status"),
        UniqueConstraint("google_place_id", name="uq_vendors_place_id"),
        UniqueConstraint("instagram_username", name="uq_vendors_instagram"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    business_name: Mapped[str] = mapped_column(String(300), nullable=False)
    category: Mapped[Optional[str]] = mapped_column(String(80))
    subcategory: Mapped[Optional[str]] = mapped_column(String(80))

    phone_number: Mapped[Optional[str]] = mapped_column(String(40))
    whatsapp_number: Mapped[Optional[str]] = mapped_column(String(40))

    governorate: Mapped[Optional[str]] = mapped_column(String(60))
    city: Mapped[Optional[str]] = mapped_column(String(80))
    address: Mapped[Optional[str]] = mapped_column(Text)

    instagram_username: Mapped[Optional[str]] = mapped_column(String(120))
    instagram_url: Mapped[Optional[str]] = mapped_column(String(300))
    website: Mapped[Optional[str]] = mapped_column(String(300))

    google_maps_url: Mapped[Optional[str]] = mapped_column(String(500))
    google_place_id: Mapped[Optional[str]] = mapped_column(String(200))
    google_rating: Mapped[Optional[float]] = mapped_column(Float)
    google_review_count: Mapped[Optional[int]] = mapped_column(Integer)

    latitude: Mapped[Optional[float]] = mapped_column(Float)
    longitude: Mapped[Optional[float]] = mapped_column(Float)

    description: Mapped[Optional[str]] = mapped_column(Text)

    # Provenance & scoring.
    source: Mapped[Optional[str]] = mapped_column(String(60))
    source_url: Mapped[Optional[str]] = mapped_column(String(500))
    field_sources: Mapped[Optional[str]] = mapped_column(Text)  # JSON: {field: source}

    oman_verified: Mapped[bool] = mapped_column(default=False)
    verification_status: Mapped[Optional[str]] = mapped_column(String(30))  # Very High..Low
    confidence_score: Mapped[int] = mapped_column(Integer, default=0)  # Oman confidence 0-100
    category_confidence: Mapped[int] = mapped_column(Integer, default=0)  # 0-100
    quality_score: Mapped[int] = mapped_column(Integer, default=0)  # 0-100

    status: Mapped[str] = mapped_column(String(30), default=VendorStatus.NEW.value)
    notes: Mapped[Optional[str]] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )


class SearchJob(Base):
    """A discovery run over one or more categories/governorates."""

    __tablename__ = "search_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending/running/paused/completed/cancelled/failed
    governorate: Mapped[Optional[str]] = mapped_column(String(60))
    categories: Mapped[Optional[str]] = mapped_column(Text)  # JSON list
    sources: Mapped[Optional[str]] = mapped_column(Text)  # JSON list
    depth: Mapped[str] = mapped_column(String(20), default="standard")

    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    total_queries: Mapped[int] = mapped_column(Integer, default=0)
    completed_queries: Mapped[int] = mapped_column(Integer, default=0)
    results_found: Mapped[int] = mapped_column(Integer, default=0)
    new_vendors: Mapped[int] = mapped_column(Integer, default=0)
    duplicates: Mapped[int] = mapped_column(Integer, default=0)
    needs_verification: Mapped[int] = mapped_column(Integer, default=0)
    errors: Mapped[int] = mapped_column(Integer, default=0)
    current_category: Mapped[Optional[str]] = mapped_column(String(80))
    message: Mapped[Optional[str]] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    queries: Mapped[list["SearchQuery"]] = relationship(
        back_populates="job", cascade="all, delete-orphan"
    )


class SearchQuery(Base):
    """An individual query executed as part of a job (dedupes future runs)."""

    __tablename__ = "search_queries"
    __table_args__ = (Index("ix_queries_text", "query_text"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    job_id: Mapped[Optional[int]] = mapped_column(ForeignKey("search_jobs.id"))
    category: Mapped[Optional[str]] = mapped_column(String(80))
    language: Mapped[Optional[str]] = mapped_column(String(8))
    query_text: Mapped[str] = mapped_column(Text, nullable=False)
    results_count: Mapped[int] = mapped_column(Integer, default=0)
    executed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    job: Mapped[Optional[SearchJob]] = relationship(back_populates="queries")


class AuditLog(Base):
    """Records administrative actions for auditability."""

    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    vendor_id: Mapped[Optional[int]] = mapped_column(Integer)
    action: Mapped[str] = mapped_column(String(60), nullable=False)
    field: Mapped[Optional[str]] = mapped_column(String(60))
    old_value: Mapped[Optional[str]] = mapped_column(Text)
    new_value: Mapped[Optional[str]] = mapped_column(Text)
    actor: Mapped[str] = mapped_column(String(80), default="admin")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
