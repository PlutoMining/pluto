"""
Pyasic Bridge Service
A FastAPI service that wraps pyasic library to provide REST API access
for miner discovery, data retrieval, and control operations.

This module serves as the entrypoint for the application.
The actual FastAPI app is configured in app.py.
"""

# Backward compatibility: re-export normalization functions for existing code
# Import the app from app.py to maintain compatibility with Dockerfile
# which expects "main:app"
from .app import app

# Re-export models for backward compatibility
from .models import MinerInfo, ScanRequest
from .normalization import (
    convert_hashrate_to_ghs,
    normalize_efficiency_structure,
    normalize_hashrate_structure,
    normalize_miner_data,
)

__all__ = [
    "app",
    "convert_hashrate_to_ghs",
    "normalize_hashrate_structure",
    "normalize_efficiency_structure",
    "normalize_miner_data",
    "MinerInfo",
    "ScanRequest",
]
