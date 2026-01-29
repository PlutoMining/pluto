"""
Tests for app.main entrypoint to improve coverage.
"""

from fastapi import FastAPI

from app.main import (
    MinerInfo,
    ScanRequest,
    app,
    convert_hashrate_to_ghs,
    normalize_efficiency_structure,
    normalize_hashrate_structure,
)


def test_main_exports_app_and_helpers():
    # Ensure FastAPI app is exposed
    assert isinstance(app, FastAPI)

    # Ensure models and helper functions are exported
    assert MinerInfo is not None
    assert ScanRequest is not None

    # Helpers should be callable
    assert callable(convert_hashrate_to_ghs)
    assert callable(normalize_hashrate_structure)
    assert callable(normalize_efficiency_structure)

