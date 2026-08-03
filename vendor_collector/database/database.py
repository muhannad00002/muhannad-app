"""SQLite persistence layer.

Encapsulates all database access so the rest of the application never touches
SQL directly. Uses upsert semantics keyed on ``place_id`` to guarantee that a
business is never duplicated.
"""

from __future__ import annotations

import shutil
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from config import settings
from database.migrations import run_migrations
from database.models import Vendor
from logging_config import get_logger

logger = get_logger(__name__)


class Database:
    """A small repository around the ``vendors`` SQLite database.

    Can be used as a context manager::

        with Database() as db:
            db.upsert_vendor(vendor)
    """

    def __init__(self, db_path: Optional[Path] = None) -> None:
        self.db_path = Path(db_path) if db_path else settings.db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.connection = sqlite3.connect(self.db_path)
        self.connection.row_factory = sqlite3.Row
        run_migrations(self.connection)

    # -- context manager ---------------------------------------------------
    def __enter__(self) -> "Database":
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()

    def close(self) -> None:
        """Close the underlying connection."""
        self.connection.close()

    # -- backup ------------------------------------------------------------
    def backup(self) -> Optional[Path]:
        """Copy the database file to a timestamped backup and return its path."""
        if not self.db_path.exists():
            return None
        stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
        backup_path = self.db_path.with_name(f"{self.db_path.stem}-backup-{stamp}.db")
        shutil.copy2(self.db_path, backup_path)
        logger.info("Database backed up to %s", backup_path)
        return backup_path

    # -- vendor CRUD -------------------------------------------------------
    def vendor_exists(self, place_id: str) -> bool:
        """Return ``True`` if a vendor with ``place_id`` is already stored."""
        cur = self.connection.execute(
            "SELECT 1 FROM vendors WHERE place_id = ? LIMIT 1", (place_id,)
        )
        return cur.fetchone() is not None

    def upsert_vendor(self, vendor: Vendor) -> str:
        """Insert or update a vendor keyed on ``place_id``.

        Returns:
            ``"inserted"`` for a new record or ``"updated"`` when an existing
            record was refreshed.
        """
        existed = self.vendor_exists(vendor.place_id)
        vendor.last_updated = datetime.now(timezone.utc).isoformat()
        row = vendor.to_row()

        self.connection.execute(
            """
            INSERT INTO vendors (
                place_id, business_name, category, phone, website, rating,
                rating_count, address, governorate, latitude, longitude,
                maps_url, business_status, opening_hours, last_updated
            ) VALUES (
                :place_id, :business_name, :category, :phone, :website, :rating,
                :rating_count, :address, :governorate, :latitude, :longitude,
                :maps_url, :business_status, :opening_hours, :last_updated
            )
            ON CONFLICT(place_id) DO UPDATE SET
                business_name   = excluded.business_name,
                category        = excluded.category,
                phone           = excluded.phone,
                website         = excluded.website,
                rating          = excluded.rating,
                rating_count    = excluded.rating_count,
                address         = excluded.address,
                governorate     = excluded.governorate,
                latitude        = excluded.latitude,
                longitude       = excluded.longitude,
                maps_url        = excluded.maps_url,
                business_status = excluded.business_status,
                opening_hours   = excluded.opening_hours,
                last_updated    = excluded.last_updated
            """,
            row,
        )
        self.connection.commit()
        return "updated" if existed else "inserted"

    def fetch_vendors(
        self,
        category: Optional[str] = None,
        governorate: Optional[str] = None,
        since: Optional[str] = None,
    ) -> List[Dict[str, object]]:
        """Return vendors, optionally filtered.

        Args:
            category: Restrict to a single category.
            governorate: Restrict to a single governorate.
            since: ISO timestamp; only rows updated at/after it are returned
                (used by "export only new businesses").
        """
        clauses: List[str] = []
        params: List[object] = []
        if category:
            clauses.append("category = ?")
            params.append(category)
        if governorate:
            clauses.append("governorate = ?")
            params.append(governorate)
        if since:
            clauses.append("last_updated >= ?")
            params.append(since)

        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        cur = self.connection.execute(
            f"SELECT * FROM vendors {where} ORDER BY category, business_name", params
        )
        return [dict(row) for row in cur.fetchall()]

    def count_vendors(self) -> int:
        """Return the total number of stored vendors."""
        cur = self.connection.execute("SELECT COUNT(*) AS c FROM vendors")
        return int(cur.fetchone()["c"])

    def counts_by(self, column: str) -> Dict[str, int]:
        """Return a mapping of ``column`` value -> vendor count."""
        if column not in {"category", "governorate", "business_status"}:
            raise ValueError(f"Unsupported grouping column: {column}")
        cur = self.connection.execute(
            f"SELECT {column} AS key, COUNT(*) AS c FROM vendors "
            f"GROUP BY {column} ORDER BY c DESC"
        )
        return {(row["key"] or "Unknown"): int(row["c"]) for row in cur.fetchall()}

    # -- progress / resume -------------------------------------------------
    def mark_completed(self, city: str, category: str) -> None:
        """Record that ``(city, category)`` has been fully collected."""
        self.connection.execute(
            "INSERT OR REPLACE INTO progress (city, category, completed_at) "
            "VALUES (?, ?, ?)",
            (city, category, datetime.now(timezone.utc).isoformat()),
        )
        self.connection.commit()

    def completed_categories(self, city: str) -> List[str]:
        """Return the categories already completed for ``city``."""
        cur = self.connection.execute(
            "SELECT category FROM progress WHERE city = ?", (city,)
        )
        return [row["category"] for row in cur.fetchall()]

    def reset_progress(self, city: Optional[str] = None) -> None:
        """Clear resume progress (all cities, or a single ``city``)."""
        if city:
            self.connection.execute("DELETE FROM progress WHERE city = ?", (city,))
        else:
            self.connection.execute("DELETE FROM progress")
        self.connection.commit()
