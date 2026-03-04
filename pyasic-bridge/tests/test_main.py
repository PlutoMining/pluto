"""
Tests for app.main entrypoint to improve coverage.
"""

import logging

from fastapi import FastAPI

from app.main import (
    MinerInfo,
    ScanRequest,
    _setup_root_logging,
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


def test_setup_root_logging_adds_handler_when_none():
    """Cover _setup_root_logging when root logger has no handlers."""
    root = logging.getLogger()
    original_handlers = root.handlers.copy()
    for h in original_handlers:
        root.removeHandler(h)
    try:
        _setup_root_logging()
        assert len(root.handlers) >= 1
    finally:
        for h in root.handlers[:]:
            root.removeHandler(h)
        for h in original_handlers:
            root.addHandler(h)

