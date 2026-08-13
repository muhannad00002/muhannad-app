"""Dashboard statistics."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Vendor, VendorStatus
from app.schemas import StatsOut

router = APIRouter(prefix="/api/stats", tags=["stats"])


def _counts(db: Session, column) -> dict:
    rows = db.query(column, func.count(Vendor.id)).group_by(column).all()
    return {(k or "Unknown"): n for k, n in rows}


@router.get("", response_model=StatsOut)
def dashboard_stats(db: Session = Depends(get_db)):
    """Return the headline counts and breakdowns for the dashboard."""
    total = db.query(func.count(Vendor.id)).scalar() or 0

    def status_count(status: str) -> int:
        return db.query(func.count(Vendor.id)).filter(Vendor.status == status).scalar() or 0

    by_category = _counts(db, Vendor.category)
    by_gov = _counts(db, Vendor.governorate)
    by_status = _counts(db, Vendor.status)

    ig = db.query(func.count(Vendor.id)).filter(Vendor.instagram_url.isnot(None)).scalar() or 0
    gmaps = db.query(func.count(Vendor.id)).filter(Vendor.google_place_id.isnot(None)).scalar() or 0

    return StatsOut(
        total_vendors=total,
        verified=status_count(VendorStatus.VERIFIED.value),
        needs_verification=status_count(VendorStatus.NEEDS_VERIFICATION.value),
        approved=status_count(VendorStatus.APPROVED.value),
        rejected=status_count(VendorStatus.REJECTED.value),
        categories=len([k for k in by_category if k != "Unknown"]),
        governorates=len([k for k in by_gov if k != "Unknown"]),
        instagram_accounts=ig,
        google_maps_matches=gmaps,
        by_category=by_category,
        by_governorate=by_gov,
        by_status=by_status,
    )
