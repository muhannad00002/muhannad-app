"""Application-wide logging configuration.

Creates daily rotating log files under ``logs/`` and mirrors important events
to the console. Every module obtains its logger via :func:`get_logger` so log
records are consistently formatted across the code base.
"""

from __future__ import annotations

import logging
from datetime import date
from logging.handlers import TimedRotatingFileHandler
from typing import Optional

from config import LOGS_DIR

_CONFIGURED = False

_LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def configure_logging(level: int = logging.INFO) -> None:
    """Configure root logging handlers exactly once.

    Args:
        level: Minimum severity written to the log file/console.
    """
    global _CONFIGURED
    if _CONFIGURED:
        return

    log_file = LOGS_DIR / f"collector-{date.today().isoformat()}.log"

    file_handler = TimedRotatingFileHandler(
        log_file, when="midnight", backupCount=30, encoding="utf-8"
    )
    file_handler.setFormatter(logging.Formatter(_LOG_FORMAT, _DATE_FORMAT))
    file_handler.setLevel(level)

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(logging.Formatter("%(levelname)-8s | %(message)s"))
    console_handler.setLevel(logging.WARNING)

    root = logging.getLogger()
    root.setLevel(level)
    root.addHandler(file_handler)
    root.addHandler(console_handler)

    _CONFIGURED = True


def get_logger(name: Optional[str] = None) -> logging.Logger:
    """Return a configured logger for ``name``.

    Ensures :func:`configure_logging` has run so callers never receive an
    unconfigured logger.
    """
    if not _CONFIGURED:
        configure_logging()
    return logging.getLogger(name)
