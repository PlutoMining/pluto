"""
Pyasic Bridge Service
A FastAPI service that wraps pyasic library to provide REST API access
for miner discovery, data retrieval, and control operations.

This module serves as the entrypoint for the application.
The actual FastAPI app is configured in app.py.
"""

import logging
import sys

from .app import app
from .models import MinerInfo, ScanRequest
from .normalizers import (
    convert_hashrate_to_ghs,
    normalize_efficiency_structure,
    normalize_hashrate_structure,
)


def _setup_root_logging() -> None:
    """Ensure app loggers emit to stdout (uvicorn only shows its own access log otherwise)."""
    _root = logging.getLogger()
    _root.setLevel(logging.INFO)
    if not _root.handlers:
        _h = logging.StreamHandler(sys.stdout)
        _h.setLevel(logging.INFO)
        _h.setFormatter(logging.Formatter("%(levelname)s [%(name)s] %(message)s"))
        _root.addHandler(_h)
    logging.getLogger("app").setLevel(logging.INFO)


_setup_root_logging()

__all__ = [
    "app",
    "convert_hashrate_to_ghs",
    "normalize_hashrate_structure",
    "normalize_efficiency_structure",
    "MinerInfo",
    "ScanRequest",
]
