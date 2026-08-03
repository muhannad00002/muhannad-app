"""Pytest configuration ensuring the package root is importable."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
