"""
Bitaxe-specific config validator.

Validates extra_config fields specific to Bitaxe/espminer miners.
"""

from typing import Any

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

from .base import ConfigValidator
from .exceptions import ConfigValidationError

try:
    from pyasic.config.extra import ESPMinerExtraConfig
except ImportError:
    ESPMinerExtraConfig = None


def _bitaxe_extra_config_field_names() -> frozenset[str]:
    """Field names we validate for Bitaxe extra_config. Derived from pyasic ESPMinerExtraConfig when available."""
    if ESPMinerExtraConfig is not None:
        # Pydantic v2
        if hasattr(ESPMinerExtraConfig, "model_fields"):
            return frozenset(ESPMinerExtraConfig.model_fields)
        # Pydantic v1 or other
        if hasattr(ESPMinerExtraConfig, "__annotations__"):
            return frozenset(ESPMinerExtraConfig.__annotations__)
    # Fallback when pyasic not installed: use our own model's fields
    return frozenset(BitaxeExtraConfig.model_fields)


class BitaxeExtraConfig(BaseModel):
    """
    Pydantic model for Bitaxe extra_config validation.

    All fields optional. Validates types (int, no coercion) and allowed values for frequency and core_voltage.
    """

    rotation: int | None = Field(default=None, description="Display rotation (e.g. 0).")
    invertscreen: int | None = Field(default=None, description="Invert screen (e.g. 0).")
    display_timeout: int | None = Field(default=None, description="Display timeout (e.g. 1).")
    overheat_mode: int | None = Field(default=None, description="Overheat mode (e.g. 0).")
    overclock_enabled: int | None = Field(default=None, description="Overclock enabled (e.g. 0).")
    stats_frequency: int | None = Field(default=None, description="Stats frequency (e.g. 0).")
    frequency: int | None = Field(
        default=None,
        description="Frequency in MHz. Valid values: 400, 490, 525, 550, 600, 625",
    )
    core_voltage: int | None = Field(
        default=None,
        description="Core voltage in mV. Valid values: 1000, 1060, 1100, 1150, 1200, 1250",
    )
    min_fan_speed: int | None = Field(default=None, description="Minimum fan speed (e.g. 25).")

    @field_validator("frequency")
    @classmethod
    def validate_frequency(cls, v: int | None) -> int | None:
        """Validate frequency is one of the allowed Bitaxe values."""
        if v is None:
            return v

        valid_frequencies = {400, 490, 525, 550, 600, 625}
        if v not in valid_frequencies:
            raise ValueError(
                f"Invalid frequency {v} for Bitaxe miner. "
                f"Accepted values are: {sorted(valid_frequencies)}"
            )
        return v

    @field_validator("core_voltage")
    @classmethod
    def validate_core_voltage(cls, v: int | None) -> int | None:
        """Validate core_voltage is one of the allowed Bitaxe values."""
        if v is None:
            return v

        valid_core_voltages = {1000, 1060, 1100, 1150, 1200, 1250}
        if v not in valid_core_voltages:
            raise ValueError(
                f"Invalid core_voltage {v} for Bitaxe miner. "
                f"Accepted values are: {sorted(valid_core_voltages)}"
            )
        return v

    model_config = ConfigDict(
        extra="allow",  # Allow other fields in extra_config; we validate known Bitaxe fields above
        strict=True,    # Reject coercion: all int fields must be int, not string
    )


# Field names we validate for Bitaxe extra_config (from ESPMinerExtraConfig when pyasic available).
BITAXE_EXTRA_CONFIG_FIELDS = _bitaxe_extra_config_field_names()


class BitaxeConfigValidator(ConfigValidator):
    """
    Config validator for Bitaxe/espminer miners.

    Validates extra_config fields according to Bitaxe hardware constraints.
    """

    def validate(self, config: dict[str, Any], miner: Any) -> None:
        """
        Validate Bitaxe-specific config constraints.

        Validates known extra_config fields (all optional int): rotation, invertscreen,
        display_timeout, overheat_mode, overclock_enabled, stats_frequency, frequency,
        core_voltage, min_fan_speed. frequency and core_voltage must be in allowed sets.

        Args:
            config: Config dictionary to validate
            miner: Miner instance (unused, but kept for interface consistency)

        Raises:
            ValueError: If validation fails
        """
        extra_config = config.get("extra_config")
        if not extra_config or not isinstance(extra_config, dict):
            return

        # Validate when any known Bitaxe extra_config field is present
        if BITAXE_EXTRA_CONFIG_FIELDS & extra_config.keys():
            try:
                BitaxeExtraConfig(**extra_config)
            except (ValueError, ValidationError) as e:
                raise ConfigValidationError(str(e)) from e
