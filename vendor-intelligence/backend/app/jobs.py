"""Background discovery-job manager.

Runs discovery in worker threads so the API never blocks, persists live
progress to the ``search_jobs`` table, and supports pause / resume / cancel.
The design is intentionally simple (thread + control flags) but structured so a
Celery/RQ backend can replace it without changing the API or pipeline.
"""

from __future__ import annotations

import json
import threading
from datetime import datetime, timezone
from typing import Dict, List, Optional

from app.db import SessionLocal
from app.models import SearchJob
from app.search.factory import get_search_provider
from app.services.discovery import DiscoveryEngine, DiscoveryProgress


class _JobControl:
    """Per-job control flags used to pause/resume/cancel a running thread."""

    def __init__(self) -> None:
        self.pause = threading.Event()
        self.cancel = threading.Event()
        self.thread: Optional[threading.Thread] = None


class JobManager:
    """Owns running discovery jobs and their control state."""

    def __init__(self) -> None:
        self._controls: Dict[int, _JobControl] = {}
        self._lock = threading.Lock()

    # -- lifecycle ---------------------------------------------------------
    def start(
        self, categories: List[str], governorate: Optional[str], sources: List[str], deep: bool
    ) -> int:
        """Create a SearchJob row and launch its worker thread. Returns job id."""
        db = SessionLocal()
        try:
            job = SearchJob(
                status="running",
                governorate=governorate,
                categories=json.dumps(categories, ensure_ascii=False),
                sources=json.dumps(sources, ensure_ascii=False),
                depth="deep" if deep else "standard",
                started_at=datetime.now(timezone.utc),
            )
            db.add(job)
            db.commit()
            job_id = job.id
        finally:
            db.close()

        control = _JobControl()
        with self._lock:
            self._controls[job_id] = control
        control.thread = threading.Thread(
            target=self._run, args=(job_id, categories, governorate, deep, control), daemon=True
        )
        control.thread.start()
        return job_id

    def pause(self, job_id: int) -> bool:
        c = self._controls.get(job_id)
        if not c:
            return False
        c.pause.set()
        self._set_status(job_id, "paused")
        return True

    def resume(self, job_id: int) -> bool:
        c = self._controls.get(job_id)
        if not c:
            return False
        c.pause.clear()
        self._set_status(job_id, "running")
        return True

    def cancel(self, job_id: int) -> bool:
        c = self._controls.get(job_id)
        if not c:
            return False
        c.cancel.set()
        c.pause.clear()
        return True

    # -- worker ------------------------------------------------------------
    def _run(
        self, job_id: int, categories: List[str], governorate: Optional[str],
        deep: bool, control: _JobControl,
    ) -> None:
        db = SessionLocal()
        progress = DiscoveryProgress()
        try:
            engine = DiscoveryEngine(db, get_search_provider())

            def on_progress(p: DiscoveryProgress) -> None:
                self._save_progress(db, job_id, p)

            def should_continue() -> bool:
                # Block while paused; abort if cancelled.
                while control.pause.is_set() and not control.cancel.is_set():
                    control.pause.wait(timeout=0.5)
                return not control.cancel.is_set()

            for category in categories:
                if control.cancel.is_set():
                    break
                self._set_current(db, job_id, category)
                engine.run_category(
                    category, governorate=governorate, deep=deep,
                    progress=progress, on_progress=on_progress,
                    should_continue=should_continue,
                )

            final = "cancelled" if control.cancel.is_set() else "completed"
            self._finish(db, job_id, progress, final)
        except Exception as exc:  # noqa: BLE001
            self._finish(db, job_id, progress, "failed", message=str(exc))
        finally:
            db.close()
            with self._lock:
                self._controls.pop(job_id, None)

    # -- persistence helpers ----------------------------------------------
    def _save_progress(self, db, job_id: int, p: DiscoveryProgress) -> None:
        job = db.get(SearchJob, job_id)
        if not job:
            return
        job.total_queries = p.total_queries
        job.completed_queries = p.completed_queries
        job.results_found = p.results_found
        job.new_vendors = p.new_vendors
        job.duplicates = p.duplicates
        job.needs_verification = p.needs_verification
        job.errors = p.errors
        db.commit()

    def _set_current(self, db, job_id: int, category: str) -> None:
        job = db.get(SearchJob, job_id)
        if job:
            job.current_category = category
            db.commit()

    def _set_status(self, job_id: int, status: str) -> None:
        db = SessionLocal()
        try:
            job = db.get(SearchJob, job_id)
            if job and job.status not in {"completed", "cancelled", "failed"}:
                job.status = status
                db.commit()
        finally:
            db.close()

    def _finish(self, db, job_id: int, p: DiscoveryProgress, status: str,
                message: Optional[str] = None) -> None:
        self._save_progress(db, job_id, p)
        job = db.get(SearchJob, job_id)
        if job:
            job.status = status
            job.completed_at = datetime.now(timezone.utc)
            if message:
                job.message = message
            db.commit()


# Singleton used by the API layer.
job_manager = JobManager()
