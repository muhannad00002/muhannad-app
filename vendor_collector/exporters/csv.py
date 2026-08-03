"""CSV and JSON exporters."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List

import pandas as pd

from config import OUTPUT_DIR
from exporters.excel import COLUMN_MAP, _to_dataframe
from logging_config import get_logger

logger = get_logger(__name__)


class CSVExporter:
    """Export vendor rows to a ``.csv`` file."""

    def __init__(self, output_dir: Path = OUTPUT_DIR) -> None:
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def export(
        self, rows: List[Dict[str, object]], filename: str = "vendors.csv"
    ) -> Path:
        """Write ``rows`` to a CSV file and return its path."""
        path = self.output_dir / filename
        frame = _to_dataframe(rows)
        frame.to_csv(path, index=False, encoding="utf-8-sig")
        logger.info("Exported %s vendors to %s", len(frame), path)
        return path


class JSONExporter:
    """Export vendor rows to a ``.json`` file (raw database columns)."""

    def __init__(self, output_dir: Path = OUTPUT_DIR) -> None:
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def export(
        self, rows: List[Dict[str, object]], filename: str = "vendors.json"
    ) -> Path:
        """Write ``rows`` to a JSON file and return its path."""
        path = self.output_dir / filename
        with path.open("w", encoding="utf-8") as handle:
            json.dump(rows, handle, ensure_ascii=False, indent=2)
        logger.info("Exported %s vendors to %s", len(rows), path)
        return path
