"""Oman Wedding Vendor Collector — command-line entry point.

Run with::

    python app.py

and choose an action from the interactive menu. The application searches the
official Google Places API (New) for every wedding-related category, stores
unique businesses in SQLite and exports them to Excel/CSV/JSON.
"""

from __future__ import annotations

import sys
from typing import Callable, Dict, List

from config import settings
from database.database import Database
from exporters.csv import CSVExporter, JSONExporter
from exporters.excel import ExcelExporter
from logging_config import get_logger
from services.collector import Collector, Statistics

logger = get_logger(__name__)

# Cities used for the "Entire Oman" sweep. Extendable via the menu/keyword search.
OMAN_CITIES: List[str] = [
    "Muscat",
    "Salalah",
    "Nizwa",
    "Sohar",
    "Sur",
    "Ibri",
    "Rustaq",
    "Khasab",
    "Ibra",
    "Buraimi",
    "Bahla",
    "Barka",
]


# ---------------------------------------------------------------------------
# Console colour helpers (no external dependency required)
# ---------------------------------------------------------------------------
class C:
    """ANSI colour codes for lightweight colourised output."""

    RESET = "\033[0m"
    BOLD = "\033[1m"
    CYAN = "\033[96m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    BLUE = "\033[94m"


def cprint(text: str, colour: str = C.RESET) -> None:
    """Print ``text`` wrapped in an ANSI colour code."""
    print(f"{colour}{text}{C.RESET}")


# ---------------------------------------------------------------------------
# Statistics rendering
# ---------------------------------------------------------------------------
def render_statistics(stats: Statistics) -> None:
    """Pretty-print a :class:`Statistics` summary."""
    cprint("\n=== Run Statistics ===", C.BOLD + C.CYAN)
    print(f"  Businesses collected : {stats.collected}")
    print(f"  Businesses updated   : {stats.updated}")
    print(f"  Duplicates skipped   : {stats.duplicates}")
    print(f"  API requests         : {stats.api_requests}")
    print(f"  Errors               : {stats.errors}")
    print(f"  Elapsed time         : {stats.elapsed_seconds:.1f}s")

    if stats.by_category:
        cprint("\n  By category:", C.BLUE)
        for name, count in sorted(stats.by_category.items(), key=lambda x: -x[1]):
            print(f"    {name:<22} {count}")

    if stats.by_governorate:
        cprint("\n  By governorate:", C.BLUE)
        for name, count in sorted(stats.by_governorate.items(), key=lambda x: -x[1]):
            print(f"    {name:<22} {count}")


def render_database_statistics() -> None:
    """Print aggregate statistics straight from the database."""
    with Database() as db:
        total = db.count_vendors()
        cprint(f"\nTotal vendors in database: {total}", C.BOLD + C.GREEN)
        cprint("\nBy category:", C.BLUE)
        for name, count in db.counts_by("category").items():
            print(f"  {name:<22} {count}")
        cprint("\nBy governorate:", C.BLUE)
        for name, count in db.counts_by("governorate").items():
            print(f"  {name:<22} {count}")


# ---------------------------------------------------------------------------
# Actions
# ---------------------------------------------------------------------------
def _run_collection(city: str, resume: bool = False) -> None:
    """Backup, collect a city and print statistics."""
    if settings.backup_database:
        with Database() as db:
            db.backup()
    collector = Collector()
    cprint(f"\nStarting collection for {city}...", C.CYAN)
    stats = collector.collect_city(city, resume=resume)
    render_statistics(stats)
    _auto_export()


def _run_collection_all(resume: bool = False) -> None:
    """Collect every configured Oman city."""
    if settings.backup_database:
        with Database() as db:
            db.backup()
    collector = Collector()
    cprint("\nStarting full-Oman collection...", C.CYAN)
    stats = collector.collect_all_oman(OMAN_CITIES, resume=resume)
    render_statistics(stats)
    _auto_export()


def _auto_export() -> None:
    """Export according to the configured EXPORT_* flags."""
    with Database() as db:
        rows = db.fetch_vendors()
    if settings.export_excel:
        path = ExcelExporter().export(rows)
        cprint(f"Excel written to {path}", C.GREEN)
    if settings.export_csv:
        path = CSVExporter().export(rows)
        cprint(f"CSV written to {path}", C.GREEN)
    if settings.export_json:
        path = JSONExporter().export(rows)
        cprint(f"JSON written to {path}", C.GREEN)


def action_export_excel() -> None:
    with Database() as db:
        rows = db.fetch_vendors()
    path = ExcelExporter().export(rows)
    cprint(f"Exported {len(rows)} vendors to {path}", C.GREEN)


def action_export_csv() -> None:
    with Database() as db:
        rows = db.fetch_vendors()
    path = CSVExporter().export(rows)
    cprint(f"Exported {len(rows)} vendors to {path}", C.GREEN)


def action_keyword_search() -> None:
    """Collect a single custom city/keyword entered by the user."""
    city = input("Enter city or keyword (e.g. 'Barka'): ").strip()
    if city:
        _run_collection(city)


# ---------------------------------------------------------------------------
# Menu
# ---------------------------------------------------------------------------
MENU = """
=========================
 Oman Vendor Collector
=========================

1 Collect Muscat
2 Collect Salalah
3 Collect Nizwa
4 Collect Entire Oman
5 Export Excel
6 Export CSV
7 View Statistics
8 Resume Previous Run
9 Exit
"""


def build_actions() -> Dict[str, Callable[[], None]]:
    """Return the mapping of menu keys to action callables."""
    return {
        "1": lambda: _run_collection("Muscat"),
        "2": lambda: _run_collection("Salalah"),
        "3": lambda: _run_collection("Nizwa"),
        "4": lambda: _run_collection_all(),
        "5": action_export_excel,
        "6": action_export_csv,
        "7": render_database_statistics,
        "8": lambda: _run_collection_all(resume=True),
        "0": action_keyword_search,
    }


def main() -> None:
    """Run the interactive CLI loop."""
    try:
        settings.validate()
    except ValueError as exc:
        cprint(f"Configuration error: {exc}", C.RED)
        sys.exit(1)

    actions = build_actions()

    while True:
        cprint(MENU, C.BOLD + C.CYAN)
        cprint("(Tip: press 0 for a custom city/keyword search)", C.YELLOW)
        choice = input("Select an option: ").strip()

        if choice == "9":
            cprint("Goodbye!", C.GREEN)
            break

        action = actions.get(choice)
        if action is None:
            cprint("Invalid option, please try again.", C.RED)
            continue

        try:
            action()
        except KeyboardInterrupt:
            cprint("\nInterrupted. Progress is saved — choose 8 to resume.", C.YELLOW)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Action failed: %s", exc)
            cprint(f"Error: {exc}", C.RED)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        cprint("\nInterrupted. Progress is saved — run again and choose 8 to resume.", C.YELLOW)
        sys.exit(130)
