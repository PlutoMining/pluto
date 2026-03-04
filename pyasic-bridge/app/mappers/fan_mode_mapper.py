"""
Mapper between internal FanModeConfig model and pyasic FanModeConfig types.

Uses explicit field-by-field mapping only (no dict-based conversion),
so internal and pyasic models can evolve independently.
"""

from __future__ import annotations

from typing import Any

from app.models import FanModeConfig as InternalFanModeConfig

try:  # pragma: no cover - pyasic is an optional dependency
    from pyasic.config.fans import (
        FanModeConfig as PyasicFanModeConfig,
    )
    from pyasic.config.fans import (
        FanModeImmersion,
        FanModeManual,
        FanModeNormal,
    )
except ImportError:  # pragma: no cover - handled gracefully at runtime
    PyasicFanModeConfig = None  # type: ignore[assignment]
    FanModeImmersion = None  # type: ignore[assignment]
    FanModeManual = None  # type: ignore[assignment]
    FanModeNormal = None  # type: ignore[assignment]


def fan_mode_from_pyasic(fan_mode: Any) -> InternalFanModeConfig | None:
    """
    Convert a pyasic FanMode* instance to internal FanModeConfig.

    Returns None when the input is falsy or lacks a ``mode`` attribute.
    """
    if fan_mode is None:
        return None

    mode = getattr(fan_mode, "mode", None)
    # Guard against mocks/unknown types – only accept real string modes.
    if not isinstance(mode, str):
        return None

    # Internal model only exposes mode, speed and minimum_fans.
    raw_speed = getattr(fan_mode, "speed", None)
    speed = raw_speed if isinstance(raw_speed, (int, float)) else None
    raw_min_fans = getattr(fan_mode, "minimum_fans", None)
    minimum_fans = raw_min_fans if isinstance(raw_min_fans, int) else None

    return InternalFanModeConfig(
        mode=mode,
        speed=speed,
        minimum_fans=minimum_fans,
    )


def fan_mode_to_pyasic(internal: InternalFanModeConfig | None) -> Any:
    """
    Convert internal FanModeConfig to a concrete pyasic FanMode* instance.

    Falls back to pyasic defaults when internal is None or has no mode.
    """
    if PyasicFanModeConfig is None:
        # pyasic is not available in this environment; keep the mapper a no-op.
        return None

    if internal is None or internal.mode is None:
        return PyasicFanModeConfig.default()

    mode = internal.mode

    if mode == "manual":
        return FanModeManual(  # type: ignore[call-arg]
            speed=internal.speed if internal.speed is not None else 100,
            minimum_fans=internal.minimum_fans if internal.minimum_fans is not None else 1,
        )

    if mode == "immersion":
        return FanModeImmersion()  # type: ignore[call-arg]

    # normal or unknown -> treat as normal with safe defaults
    return FanModeNormal(  # type: ignore[call-arg]
        minimum_fans=internal.minimum_fans if internal.minimum_fans is not None else 1,
        minimum_speed=0,
    )

