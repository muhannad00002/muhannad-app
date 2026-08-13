"""Discovery job control + keyword preview."""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.jobs import job_manager
from app.keywords import ALL_CATEGORIES, GOVERNORATES, generate_queries
from app.models import SearchJob
from app.schemas import DiscoveryRequest, JobOut

router = APIRouter(prefix="/api/discovery", tags=["discovery"])


@router.get("/meta", response_model=dict)
def meta():
    """Categories, governorates and current search mode (for the UI)."""
    return {
        "categories": ALL_CATEGORIES,
        "governorates": list(GOVERNORATES.keys()),
        "search_provider": settings.search_provider,
        "google_maps_enabled": settings.google_maps_enabled,
        "manual_mode": settings.search_provider == "none",
    }


@router.get("/preview", response_model=dict)
def preview(category: str, governorate: str | None = None, deep: bool = False):
    """Preview the queries that would run for a category (transparency)."""
    if category not in ALL_CATEGORIES:
        raise HTTPException(400, "Unknown category")
    queries = generate_queries(category, governorate, deep=deep)
    return {"category": category, "count": len(queries), "queries": queries}


@router.post("/start", response_model=JobOut)
def start(payload: DiscoveryRequest, db: Session = Depends(get_db)):
    """Start a background discovery job."""
    categories = payload.categories or ALL_CATEGORIES
    unknown = [c for c in categories if c not in ALL_CATEGORIES]
    if unknown:
        raise HTTPException(400, f"Unknown categories: {unknown}")

    job_id = job_manager.start(categories, payload.governorate, payload.sources, payload.deep)
    job = db.get(SearchJob, job_id)
    return JobOut.model_validate(job)


@router.get("/jobs", response_model=List[JobOut])
def list_jobs(db: Session = Depends(get_db), limit: int = 20):
    jobs = db.query(SearchJob).order_by(SearchJob.id.desc()).limit(limit).all()
    return [JobOut.model_validate(j) for j in jobs]


@router.get("/jobs/{job_id}", response_model=JobOut)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.get(SearchJob, job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return JobOut.model_validate(job)


@router.post("/jobs/{job_id}/{action}", response_model=dict)
def control_job(job_id: int, action: str):
    """Pause / resume / cancel a running job."""
    actions = {"pause": job_manager.pause, "resume": job_manager.resume,
               "cancel": job_manager.cancel}
    if action not in actions:
        raise HTTPException(400, "action must be pause, resume or cancel")
    ok = actions[action](job_id)
    if not ok:
        raise HTTPException(404, "Job not running")
    return {"job_id": job_id, "action": action}
