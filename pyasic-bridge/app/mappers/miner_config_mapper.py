"""
High-level mapper between internal MinerConfigModel and pyasic MinerConfig.

This module composes the per-class mappers (pools, fan_mode, temperature,
mining_mode) and keeps all conversions field-by-field with no dict-based
model_dump/as_dict usage.
"""

from __future__ import annotations

from typing import Any

from app.models import MinerConfigModel

from .fan_mode_mapper import fan_mode_from_pyasic, fan_mode_to_pyasic
from .mining_mode_mapper import mining_mode_from_pyasic, mining_mode_to_pyasic
from .pools_mapper import pools_from_pyasic, pools_to_pyasic
from .temperature_mapper import temperature_from_pyasic, temperature_to_pyasic

try:  # pragma: no cover - pyasic is an optional dependency
    from pyasic.config import MinerConfig as PyasicMinerConfig
    from pyasic.config.fans import FanModeConfig as PyasicFanModeConfig
    from pyasic.config.mining import MiningModeConfig as PyasicMiningModeConfig
    from pyasic.config.pools import PoolConfig as PyasicPoolConfig
    from pyasic.config.temperature import (
        TemperatureConfig as PyasicTemperatureConfig,
    )
except ImportError:  # pragma: no cover - handled gracefully at runtime
    PyasicMinerConfig = None  # type: ignore[assignment]
    PyasicFanModeConfig = None  # type: ignore[assignment]
    PyasicMiningModeConfig = None  # type: ignore[assignment]
    PyasicPoolConfig = None  # type: ignore[assignment]
    PyasicTemperatureConfig = None  # type: ignore[assignment]


def _extra_config_from_pyasic(extra_config: Any) -> dict[str, Any] | None:
    """
    Build a plain dict from a pyasic extra_config object by reading attributes.

    This mirrors the previous behavior from config_mapper, but lives locally so
    miner_config_mapper is self-contained.
    """
    if extra_config is None:
        return None
    # Pydantic v2: model_fields
    if hasattr(extra_config, "model_fields"):
        return {k: getattr(extra_config, k, None) for k in extra_config.model_fields}
    # Pydantic v1 or other: __annotations__
    if hasattr(extra_config, "__annotations__"):
        return {k: getattr(extra_config, k, None) for k in extra_config.__annotations__}
    return None


def miner_config_from_pyasic(pyasic_config: Any) -> MinerConfigModel:
    """
    Convert a pyasic MinerConfig instance to internal MinerConfigModel.

    All nested types (pools, fan_mode, temperature, mining_mode) are converted
    via the dedicated per-class mappers.
    """
    if pyasic_config is None:
        return MinerConfigModel()

    pools_internal = pools_from_pyasic(getattr(pyasic_config, "pools", None))
    fan_mode_internal = fan_mode_from_pyasic(getattr(pyasic_config, "fan_mode", None))
    temperature_internal = temperature_from_pyasic(
        getattr(pyasic_config, "temperature", None)
    )
    mining_mode_internal = mining_mode_from_pyasic(
        getattr(pyasic_config, "mining_mode", None)
    )
    extra_internal = _extra_config_from_pyasic(
        getattr(pyasic_config, "extra_config", None)
    )

    return MinerConfigModel(
        pools=pools_internal,
        fan_mode=fan_mode_internal,
        temperature=temperature_internal,
        mining_mode=mining_mode_internal,
        extra_config=extra_internal,
    )


def miner_config_to_pyasic(
    internal_config: MinerConfigModel,
    existing_pyasic_config: Any,
) -> Any:
    """
    Convert an internal MinerConfigModel to pyasic MinerConfig for send_config.

    Nested pyasic types are built via dedicated per-class mappers. extra_config
    preserves the existing concrete pyasic extra_config type from
    ``existing_pyasic_config`` when present.
    """
    if PyasicMinerConfig is None:
        raise RuntimeError("pyasic is not installed; cannot build MinerConfig")

    pools_pyasic = pools_to_pyasic(internal_config.pools)
    fan_mode_pyasic = fan_mode_to_pyasic(internal_config.fan_mode)
    temperature_pyasic = temperature_to_pyasic(internal_config.temperature)
    mining_mode_pyasic = mining_mode_to_pyasic(internal_config.mining_mode)

    pyasic_config = PyasicMinerConfig(  # type: ignore[call-arg]
        pools=pools_pyasic
        if pools_pyasic is not None
        else PyasicPoolConfig.default()
        if PyasicPoolConfig is not None
        else None,
        fan_mode=fan_mode_pyasic
        if fan_mode_pyasic is not None
        else PyasicFanModeConfig.default()
        if PyasicFanModeConfig is not None
        else None,
        temperature=temperature_pyasic
        if temperature_pyasic is not None
        else PyasicTemperatureConfig.default()
        if PyasicTemperatureConfig is not None
        else None,
        mining_mode=mining_mode_pyasic
        if mining_mode_pyasic is not None
        else PyasicMiningModeConfig.default()
        if PyasicMiningModeConfig is not None
        else None,
        extra_config=None,
    )

    # Preserve and merge extra_config.
    # We prefer to keep the existing concrete MinerExtraConfig type (e.g. ESPMinerExtraConfig,
    # AntMinerExtraConfig, default MinerExtraConfig) and update only known fields, so that
    # pyasic can still call methods like ``as_espminer()`` when sending configs.
    existing_extra = getattr(existing_pyasic_config, "extra_config", None)
    if existing_extra is None:
        return pyasic_config

    extra_dict = internal_config.extra_config or {}
    if not extra_dict:
        # No changes requested for extra_config; keep existing object as-is.
        pyasic_config.extra_config = existing_extra
        return pyasic_config

    # Case 1: existing_extra is a Pydantic model (MinerExtraConfig or miner-specific subclass).
    if hasattr(existing_extra, "model_fields") or hasattr(existing_extra, "__annotations__"):
        # Collect field names from Pydantic v2 (model_fields) or v1 (__annotations__).
        if hasattr(existing_extra, "model_fields"):
            fields = existing_extra.model_fields
            field_names = (
                list(fields.keys())
                if isinstance(fields, dict)
                else list(fields)
            )
        else:
            annotations = getattr(existing_extra, "__annotations__", {}) or {}
            field_names = list(annotations.keys())

        # Update only known fields; unknown keys in extra_dict are ignored.
        for key, value in extra_dict.items():
            if key in field_names:
                setattr(existing_extra, key, value)

        pyasic_config.extra_config = existing_extra
        return pyasic_config

    # Case 2: existing_extra is already a dict – merge dictionaries as a fallback.
    if isinstance(existing_extra, dict):
        merged_extra = {**existing_extra, **extra_dict}
        pyasic_config.extra_config = merged_extra
    else:
        # Fallback: we don't know how to safely merge this type; keep it unchanged.
        pyasic_config.extra_config = existing_extra

    return pyasic_config

