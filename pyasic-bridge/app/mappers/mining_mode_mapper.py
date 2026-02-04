"""
Mapper between internal MiningModeConfig model and pyasic MiningModeConfig type.

Uses explicit field-by-field mapping only (no dict-based conversion).
"""

from __future__ import annotations

from typing import Any

from app.models import MiningModeConfig as InternalMiningModeConfig

try:  # pragma: no cover - pyasic is an optional dependency
    from pyasic.config.mining import MiningModeConfig as PyasicMiningModeConfig
except ImportError:  # pragma: no cover - handled gracefully at runtime
    PyasicMiningModeConfig = None  # type: ignore[assignment]


def mining_mode_from_pyasic(mining_mode: Any) -> InternalMiningModeConfig | None:
    """
    Convert a pyasic MiningModeConfig instance to internal MiningModeConfig.
    """
    if mining_mode is None:
        return None

    mode = getattr(mining_mode, "mode", None)
    if mode is None:
        return None

    return InternalMiningModeConfig(mode=mode)


def mining_mode_to_pyasic(internal: InternalMiningModeConfig | None) -> Any:
    """
    Convert internal MiningModeConfig to a pyasic MiningModeConfig instance.

    Falls back to pyasic defaults when internal is None.
    """
    if PyasicMiningModeConfig is None:
        return None

    if internal is None or internal.mode is None:
        return PyasicMiningModeConfig.default()

    mode = internal.mode
    if mode == "sleep":
        return PyasicMiningModeConfig.sleep()
    if mode == "low":
        return PyasicMiningModeConfig.low()
    if mode == "high":
        return PyasicMiningModeConfig.high()
    return PyasicMiningModeConfig.normal()

