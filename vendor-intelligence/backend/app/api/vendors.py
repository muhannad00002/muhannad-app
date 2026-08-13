"""Vendor CRUD, filtering, bulk actions, merge and audit."""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import AuditLog, Vendor
from app.schemas import BulkAction, MergeRequest, VendorList, VendorOut, VendorUpdate
from app.services.phone import normalize_oman_phone, whatsapp_link
from app.services.quality import quality_score

router = APIRouter(prefix="/api/vendors", tags=["vendors"])


def _audit(db: Session, vendor_id: int, action: str, field: Optional[str] = None,
           old: Optional[str] = None, new: Optional[str] = None) -> None:
    db.add(AuditLog(vendor_id=vendor_id, action=action, field=field,
                    old_value=str(old) if old is not None else None,
                    new_value=str(new) if new is not None else None))


@router.get("", response_model=VendorList)
def list_vendors(
    db: Session = Depends(get_db),
    q: Optional[str] = None,
    category: Optional[str] = None,
    governorate: Optional[str] = None,
    city: Optional[str] = None,
    status: Optional[str] = None,
    verification_status: Optional[str] = None,
    has_instagram: Optional[bool] = None,
    has_google_maps: Optional[bool] = None,
    has_phone: Optional[bool] = None,
    has_website: Optional[bool] = None,
    min_rating: Optional[float] = None,
    min_confidence: Optional[int] = None,
    sort: str = "updated_at:desc",
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
):
    """Return a filtered, sorted, paginated page of vendors."""
    query = db.query(Vendor)

    if q:
        like = f"%{q}%"
        query = query.filter(
            (Vendor.business_name.ilike(like))
            | (Vendor.phone_number.ilike(like))
            | (Vendor.instagram_username.ilike(like))
            | (Vendor.address.ilike(like))
        )
    if category:
        query = query.filter(Vendor.category == category)
    if governorate:
        query = query.filter(Vendor.governorate == governorate)
    if city:
        query = query.filter(Vendor.city == city)
    if status:
        query = query.filter(Vendor.status == status)
    if verification_status:
        query = query.filter(Vendor.verification_status == verification_status)
    if has_instagram is not None:
        query = query.filter(Vendor.instagram_url.isnot(None) if has_instagram
                             else Vendor.instagram_url.is_(None))
    if has_google_maps is not None:
        query = query.filter(Vendor.google_place_id.isnot(None) if has_google_maps
                             else Vendor.google_place_id.is_(None))
    if has_phone is not None:
        query = query.filter(Vendor.phone_number.isnot(None) if has_phone
                             else Vendor.phone_number.is_(None))
    if has_website is not None:
        query = query.filter(Vendor.website.isnot(None) if has_website
                             else Vendor.website.is_(None))
    if min_rating is not None:
        query = query.filter(Vendor.google_rating >= min_rating)
    if min_confidence is not None:
        query = query.filter(Vendor.confidence_score >= min_confidence)

    total = query.count()

    key, _, direction = sort.partition(":")
    col = getattr(Vendor, key, Vendor.updated_at)
    query = query.order_by(col.desc() if direction != "asc" else col.asc())

    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return VendorList(total=total, page=page, page_size=page_size,
                      items=[VendorOut.model_validate(v) for v in items])


@router.get("/{vendor_id}", response_model=VendorOut)
def get_vendor(vendor_id: int, db: Session = Depends(get_db)):
    vendor = db.get(Vendor, vendor_id)
    if not vendor:
        raise HTTPException(404, "Vendor not found")
    return VendorOut.model_validate(vendor)


@router.patch("/{vendor_id}", response_model=VendorOut)
def update_vendor(vendor_id: int, payload: VendorUpdate, db: Session = Depends(get_db)):
    """Manually edit a vendor; every changed field is written to the audit log."""
    vendor = db.get(Vendor, vendor_id)
    if not vendor:
        raise HTTPException(404, "Vendor not found")

    data = payload.model_dump(exclude_unset=True)
    if "phone_number" in data and data["phone_number"]:
        data["phone_number"] = normalize_oman_phone(data["phone_number"]) or data["phone_number"]
        vendor.whatsapp_number = whatsapp_link(data["phone_number"])

    for field, new_value in data.items():
        old_value = getattr(vendor, field, None)
        if old_value != new_value:
            setattr(vendor, field, new_value)
            _audit(db, vendor_id, "update", field, old_value, new_value)

    vendor.quality_score = quality_score(vendor)
    db.commit()
    db.refresh(vendor)
    return VendorOut.model_validate(vendor)


@router.post("/bulk", response_model=dict)
def bulk_action(payload: BulkAction, db: Session = Depends(get_db)):
    """Apply a status (e.g. Approved/Rejected) to many vendors at once."""
    updated = 0
    for vendor in db.query(Vendor).filter(Vendor.id.in_(payload.ids)).all():
        old = vendor.status
        vendor.status = payload.status
        _audit(db, vendor.id, "bulk_status", "status", old, payload.status)
        updated += 1
    db.commit()
    return {"updated": updated, "status": payload.status}


@router.post("/merge", response_model=VendorOut)
def merge_vendors(payload: MergeRequest, db: Session = Depends(get_db)):
    """Merge a duplicate into a primary vendor, keeping the best fields."""
    primary = db.get(Vendor, payload.primary_id)
    dup = db.get(Vendor, payload.duplicate_id)
    if not primary or not dup:
        raise HTTPException(404, "Vendor not found")

    # Fill any empty field on the primary from the duplicate.
    for col in Vendor.__table__.columns.keys():
        if col in {"id", "created_at", "updated_at"}:
            continue
        if not getattr(primary, col, None) and getattr(dup, col, None):
            setattr(primary, col, getattr(dup, col))

    primary.notes = " | ".join(filter(None, [primary.notes, f"merged #{dup.id}"]))
    primary.quality_score = quality_score(primary)
    _audit(db, primary.id, "merge", "duplicate_id", None, dup.id)
    db.delete(dup)
    db.commit()
    db.refresh(primary)
    return VendorOut.model_validate(primary)


@router.delete("/{vendor_id}", response_model=dict)
def delete_vendor(vendor_id: int, db: Session = Depends(get_db)):
    vendor = db.get(Vendor, vendor_id)
    if not vendor:
        raise HTTPException(404, "Vendor not found")
    _audit(db, vendor_id, "delete", "business_name", vendor.business_name, None)
    db.delete(vendor)
    db.commit()
    return {"deleted": vendor_id}


@router.get("/{vendor_id}/audit", response_model=List[dict])
def vendor_audit(vendor_id: int, db: Session = Depends(get_db)):
    rows = db.query(AuditLog).filter(AuditLog.vendor_id == vendor_id).order_by(
        AuditLog.created_at.desc()).all()
    return [
        {"action": r.action, "field": r.field, "old": r.old_value,
         "new": r.new_value, "actor": r.actor, "at": r.created_at.isoformat()}
        for r in rows
    ]
