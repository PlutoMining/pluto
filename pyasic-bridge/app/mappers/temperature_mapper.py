"""
Mapper between internal TemperatureConfig model and pyasic TemperatureConfig type.

Uses explicit field-by-field mapping only (no dict-based conversion).
"""

from __future__ import annotations

from typing import Any

from app.models import TemperatureConfig as InternalTemperatureConfig

try:  # pragma: no cover - pyasic is an optional dependency
    from pyasic.config.temperature import (
        TemperatureConfig as PyasicTemperatureConfig,
    )
except ImportError:  # pragma: no cover - handled gracefully at runtime
    PyasicTemperatureConfig = None  # type: ignore[assignment]


def temperature_from_pyasic(temperature: Any) -> InternalTemperatureConfig | None:
    """
    Convert a pyasic TemperatureConfig instance to internal TemperatureConfig.
    """
    if temperature is None:
        return None

    return InternalTemperatureConfig(
        target=getattr(temperature, "target", None),
        hot=getattr(temperature, "hot", None),
        danger=getattr(temperature, "danger", None),
    )


def temperature_to_pyasic(internal: InternalTemperatureConfig | None) -> Any:
    """
    Convert internal TemperatureConfig to a pyasic TemperatureConfig instance.

    Falls back to pyasic defaults when internal is None.
    """
    if PyasicTemperatureConfig is None:
        return None

    if internal is None:
        return PyasicTemperatureConfig.default()

    return PyasicTemperatureConfig(  # type: ignore[call-arg]
        target=internal.target,
        hot=internal.hot,
        danger=internal.danger,
    )

