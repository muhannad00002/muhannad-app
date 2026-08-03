"""Excel exporter using pandas + openpyxl."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Optional

import pandas as pd

from config import OUTPUT_DIR
from logging_config import get_logger

logger = get_logger(__name__)

# Mapping of database columns to human-friendly Excel headers, in order.
COLUMN_MAP: Dict[str, str] = {
    "business_name": "Business Name",
    "category": "Category",
    "phone": "Phone Number",
    "governorate": "Governorate",
    "address": "Address",
    "maps_url": "Google Maps URL",
    "rating": "Rating",
    "rating_count": "Review Count",
    "website": "Website",
    "latitude": "Latitude",
    "longitude": "Longitude",
    "business_status": "Business Status",
    "opening_hours": "Opening Hours",
}


def _to_dataframe(rows: List[Dict[str, object]]) -> pd.DataFrame:
    """Convert vendor rows into an ordered, human-readable DataFrame."""
    frame = pd.DataFrame(rows)
    for column in COLUMN_MAP:
        if column not in frame.columns:
            frame[column] = None

    # Opening hours are stored as a JSON array; render them as readable text.
    if "opening_hours" in frame.columns:
        frame["opening_hours"] = frame["opening_hours"].apply(_format_hours)

    frame = frame[list(COLUMN_MAP.keys())].rename(columns=COLUMN_MAP)
    return frame


def _format_hours(value: Optional[str]) -> str:
    """Turn a JSON opening-hours array into a newline-separated string."""
    if not value:
        return ""
    try:
        parsed = json.loads(value)
        if isinstance(parsed, list):
            return "\n".join(str(item) for item in parsed)
    except (json.JSONDecodeError, TypeError):
        pass
    return str(value)


class ExcelExporter:
    """Export vendor rows to a formatted ``.xlsx`` file."""

    def __init__(self, output_dir: Path = OUTPUT_DIR) -> None:
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def export(
        self, rows: List[Dict[str, object]], filename: str = "vendors.xlsx"
    ) -> Path:
        """Write ``rows`` to an Excel workbook and return its path."""
        path = self.output_dir / filename
        frame = _to_dataframe(rows)

        with pd.ExcelWriter(path, engine="openpyxl") as writer:
            frame.to_excel(writer, index=False, sheet_name="Vendors")
            self._autosize(writer, frame)

        logger.info("Exported %s vendors to %s", len(frame), path)
        return path

    @staticmethod
    def _autosize(writer: "pd.ExcelWriter", frame: pd.DataFrame) -> None:
        """Best-effort column auto-sizing for readability."""
        worksheet = writer.sheets["Vendors"]
        for idx, column in enumerate(frame.columns, start=1):
            series = frame[column].astype(str)
            width = min(max(series.map(len).max() if len(series) else 0, len(column)) + 2, 60)
            worksheet.column_dimensions[worksheet.cell(row=1, column=idx).column_letter].width = width
