"""Database schema creation and migration.

The schema is intentionally simple: a single ``vendors`` table keyed on the
Google ``place_id`` plus a ``progress`` table used for the resume feature.
"""

from __future__ import annotations

import sqlite3

from logging_config import get_logger

logger = get_logger(__name__)

VENDORS_TABLE = """
CREATE TABLE IF NOT EXISTS vendors (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    place_id        TEXT    NOT NULL UNIQUE,
    business_name   TEXT    NOT NULL,
    category        TEXT,
    phone           TEXT,
    website         TEXT,
    rating          REAL,
    rating_count    INTEGER,
    address         TEXT,
    governorate     TEXT,
    latitude        REAL,
    longitude       REAL,
    maps_url        TEXT,
    business_status TEXT,
    opening_hours   TEXT,
    last_updated    TEXT
);
"""

# Tracks which (city, category) pairs have already been collected so an
# interrupted run can resume without repeating work.
PROGRESS_TABLE = """
CREATE TABLE IF NOT EXISTS progress (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    city         TEXT NOT NULL,
    category     TEXT NOT NULL,
    completed_at TEXT NOT NULL,
    UNIQUE (city, category)
);
"""

INDEXES = [
    "CREATE INDEX IF NOT EXISTS idx_vendors_category ON vendors (category);",
    "CREATE INDEX IF NOT EXISTS idx_vendors_governorate ON vendors (governorate);",
]


def run_migrations(connection: sqlite3.Connection) -> None:
    """Create tables and indexes if they do not already exist."""
    cursor = connection.cursor()
    cursor.execute(VENDORS_TABLE)
    cursor.execute(PROGRESS_TABLE)
    for statement in INDEXES:
        cursor.execute(statement)
    connection.commit()
    logger.info("Database schema is up to date.")
