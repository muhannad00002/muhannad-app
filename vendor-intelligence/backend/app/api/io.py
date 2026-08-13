"""Import (CSV/Excel/TXT) and export (Excel/CSV) endpoints."""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Vendor, VendorStatus
from app.schemas import ImportResult
from app.search.factory import get_search_provider
from app.services.discovery import DiscoveryEngine
from app.services.export import to_csv, to_excel
from app.services.importer import parse_upload

router = APIRouter(prefix="/api", tags=["io"])


def _select_for_export(db: Session, scope: str, ids: Optional[List[int]]) -> List[Vendor]:
    """Resolve which vendors to export for a given scope."""
    query = db.query(Vendor)
    if scope == "selected" and ids:
        query = query.filter(Vendor.id.in_(ids))
    elif scope == "approved":
        query = query.filter(Vendor.status == VendorStatus.APPROVED.value)
    elif scope == "verified":
        query = query.filter(Vendor.status.in_(
            [VendorStatus.VERIFIED.value, VendorStatus.APPROVED.value]))
    elif scope == "all":
        pass
    else:  # "default" -> approved OR verified, excluding rejected
        query = query.filter(Vendor.status.in_(
            [VendorStatus.APPROVED.value, VendorStatus.VERIFIED.value]))
    return query.order_by(Vendor.category, Vendor.business_name).all()


@router.get("/export.xlsx")
def export_excel(
    db: Session = Depends(get_db),
    scope: str = Query("default"),
    ids: Optional[str] = None,
):
    """Export vendors to a professional Excel workbook."""
    id_list = [int(x) for x in ids.split(",") if x.strip().isdigit()] if ids else None
    vendors = _select_for_export(db, scope, id_list)
    data = to_excel(vendors)
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="oman-wedding-vendors.xlsx"'},
    )


@router.get("/export.csv")
def export_csv(
    db: Session = Depends(get_db),
    scope: str = Query("default"),
    ids: Optional[str] = None,
):
    """Export vendors to CSV."""
    id_list = [int(x) for x in ids.split(",") if x.strip().isdigit()] if ids else None
    vendors = _select_for_export(db, scope, id_list)
    return Response(
        content=to_csv(vendors),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="oman-wedding-vendors.csv"'},
    )


@router.post("/import", response_model=ImportResult)
async def import_vendors(
    db: Session = Depends(get_db),
    file: UploadFile = File(...),
    category: Optional[str] = Form(None),
    governorate: Optional[str] = Form(None),
):
    """Import manually collected vendors (CSV/Excel/TXT of Instagram URLs).

    Parsed rows flow through the same enrichment/verification/dedup pipeline as
    automated discovery.
    """
    raw = await file.read()
    candidates = parse_upload(file.filename or "", raw)
    if not candidates:
        raise HTTPException(400, "No valid vendors/Instagram URLs found in the file")

    engine = DiscoveryEngine(db, get_search_provider())
    progress = engine.ingest_candidates(candidates, category=category, governorate=governorate)
    return ImportResult(
        parsed=len(candidates),
        new_vendors=progress.new_vendors,
        duplicates=progress.duplicates,
        needs_verification=progress.needs_verification,
        errors=progress.errors,
    )
