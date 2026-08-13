"""Phone-number normalization for Oman (+968).

Oman mobile/landline national numbers are 8 digits. This module converts the
many ways a number is written (spaces, dashes, 00968, local 8-digit) into a
canonical international form ``+968 XXXX XXXX`` and can build WhatsApp links.
"""

from __future__ import annotations

import re
from typing import Optional

OMAN_CC = "968"


def normalize_oman_phone(raw: Optional[str]) -> Optional[str]:
    """Return a canonical ``+968 XXXX XXXX`` string, or ``None`` if invalid.

    Accepts inputs like ``96891234567``, ``0096891234567``, ``+968 9123 4567``,
    ``9123 4567`` (bare 8-digit national number). Non-Oman numbers that already
    carry a different country code are returned trimmed but unchanged.
    """
    if not raw:
        return None

    # Keep a leading +, drop everything else that isn't a digit.
    text = raw.strip()
    plus = text.startswith("+") or text.startswith("00")
    digits = re.sub(r"\D", "", text)
    if not digits:
        return None

    # Strip international prefixes.
    if digits.startswith("00"):
        digits = digits[2:]
    if digits.startswith(OMAN_CC):
        national = digits[len(OMAN_CC):]
    elif len(digits) == 8:
        national = digits
    elif plus:
        # Already international, non-Oman — return normalized with +.
        return "+" + digits
    else:
        # Ambiguous; if it's 8 digits treat as Oman, else give up.
        national = digits[-8:] if len(digits) >= 8 else digits

    national = national[:8]
    if len(national) != 8 or not national.isdigit():
        return None
    return f"+{OMAN_CC} {national[:4]} {national[4:]}"


def is_oman_phone(raw: Optional[str]) -> bool:
    """True if ``raw`` normalizes to a valid 8-digit Oman number."""
    norm = normalize_oman_phone(raw)
    return bool(norm and norm.startswith(f"+{OMAN_CC} "))


def whatsapp_link(raw: Optional[str]) -> Optional[str]:
    """Return a ``https://wa.me/`` link for a phone number, or ``None``."""
    norm = normalize_oman_phone(raw)
    if not norm:
        return None
    digits = re.sub(r"\D", "", norm)
    return f"https://wa.me/{digits}" if digits else None
