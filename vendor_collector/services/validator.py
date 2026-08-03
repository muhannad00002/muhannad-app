"""Validation helpers to keep low-quality records out of the database."""

from __future__ import annotations

from typing import Any, Dict

from database.models import Vendor


class Validator:
    """Validate vendor records before persistence."""

    @staticmethod
    def is_valid_details(details: Dict[str, Any]) -> bool:
        """Return ``True`` when a details payload has the minimum viable data."""
        if not details:
            return False
        if not details.get("id"):
            return False
        name = (details.get("displayName", {}) or {}).get("text")
        return bool(name)

    @staticmethod
    def is_valid_vendor(vendor: Vendor) -> bool:
        """Return ``True`` when a :class:`Vendor` is safe to store."""
        return bool(vendor.place_id and vendor.business_name)
