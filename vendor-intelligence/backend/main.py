"""FastAPI application entry point.

Run with::

    uvicorn main:app --reload

Serves the JSON API under ``/api`` and, if a built frontend exists at
``../frontend/dist``, serves it as static files at ``/``.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import discovery, io, stats, vendors
from app.config import settings
from app.db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create database tables on startup."""
    init_db()
    yield


app = FastAPI(
    title="Oman Wedding Vendor Intelligence",
    version="0.1.0",
    description="Discover, verify and export Omani wedding-service vendors.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", tags=["health"])
def health() -> dict:
    return {"status": "ok", "search_provider": settings.search_provider,
            "google_maps_enabled": settings.google_maps_enabled}


app.include_router(vendors.router)
app.include_router(discovery.router)
app.include_router(stats.router)
app.include_router(io.router)

# Serve the built frontend if present (production single-origin deploy).
_frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if _frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(_frontend_dist), html=True), name="frontend")
