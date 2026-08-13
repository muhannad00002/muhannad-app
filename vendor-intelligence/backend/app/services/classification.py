"""Category classification with a confidence score.

Scores how strongly a business's public text (name, bio, website, query it was
found under, description) matches each of the 35 categories, using the same
bilingual keyword dictionary that drives discovery. Returns the best category,
a confidence 0–100, and any secondary categories that also matched strongly.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional

from app.keywords import CATEGORY_KEYWORDS


@dataclass
class ClassificationResult:
    """Result of classifying a business into a category."""

    category: Optional[str]
    confidence: int
    secondary: List[str] = field(default_factory=list)
    scores: Dict[str, int] = field(default_factory=dict)


def _terms(category: str) -> List[str]:
    kw = CATEGORY_KEYWORDS[category]
    # Use the individual words of each seed term for robust substring matching.
    terms: List[str] = []
    for seed in kw.en + kw.ar:
        terms.append(seed.lower())
        terms.extend(w for w in seed.lower().split() if len(w) > 2)
    return terms


def classify(
    text: str, hint_category: Optional[str] = None
) -> ClassificationResult:
    """Classify ``text`` into a category.

    Args:
        text: Combined public text (name + bio + website + query + description).
        hint_category: The category the vendor was discovered under; given a
            small boost so discovery context breaks ties.
    """
    haystack = (text or "").lower()
    if not haystack.strip():
        return ClassificationResult(category=hint_category, confidence=0)

    raw: Dict[str, int] = {}
    for category in CATEGORY_KEYWORDS:
        hits = 0
        for term in set(_terms(category)):
            if term and term in haystack:
                hits += 1
        if category == hint_category and hits > 0:
            hits += 2  # discovery-context boost
        if hits:
            raw[category] = hits

    if not raw:
        return ClassificationResult(category=hint_category, confidence=0)

    ranked = sorted(raw.items(), key=lambda kv: kv[1], reverse=True)
    best_cat, best_hits = ranked[0]
    total = sum(raw.values())
    confidence = int(round(100 * best_hits / total)) if total else 0
    # A single weak hit shouldn't read as high confidence.
    confidence = min(confidence, 60 + min(best_hits, 4) * 10)

    secondary = [c for c, h in ranked[1:] if h >= max(2, best_hits - 1)][:2]
    return ClassificationResult(
        category=best_cat, confidence=confidence, secondary=secondary, scores=raw
    )
