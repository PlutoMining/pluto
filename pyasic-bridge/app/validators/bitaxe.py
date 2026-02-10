"""
Bitaxe-specific config validator.

Validates extra_config fields specific to Bitaxe/espminer miners.
"""

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

from .base import ConfigValidator
from .exceptions import ConfigValidationError

try:
    from pyasic.config.extra import ESPMinerExtraConfig
except ImportError:
    ESPMinerExtraConfig = None

# Allowed values for Bitaxe extra_config fields
# These constants are used in both Field definitions (for JSON Schema) and validators (for runtime validation)
BITAXE_ROTATION_VALUES = [0, 90, 180, 270]
BITAXE_INVERTSCREEN_VALUES = [0, 1]
BITAXE_OVERHEAT_MODE_VALUES = [0, 1]
BITAXE_OVERCLOCK_ENABLED_VALUES = [0, 1]
BITAXE_DISPLAY_TIMEOUT_VALUES = [-1, 1, 2, 5, 15, 30, 60, 120, 240, 480]
BITAXE_FREQUENCY_VALUES = [400, 490, 525, 550, 600, 625]
BITAXE_CORE_VOLTAGE_VALUES = [1000, 1060, 1100, 1150, 1200, 1250]


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

    All fields optional. Validates types (int, no coercion) and allowed values for rotation, invertscreen, display_timeout, frequency and core_voltage.
    """

    rotation: Literal[0, 90, 180, 270] | None = Field(
        default=None,
        description="Display rotation in degrees. Valid values: 0, 90, 180, 270",
    )
    invertscreen: Literal[0, 1] | None = Field(
        default=None,
        description="Invert screen. Valid values: 0 (normal), 1 (inverted)",
    )
    display_timeout: Literal[-1, 1, 2, 5, 15, 30, 60, 120, 240, 480] | None = Field(
        default=None,
        description="Display timeout in seconds. Valid values: -1, 1, 2, 5, 15, 30, 60, 120, 240, 480",
    )
    overheat_mode: Literal[0, 1] | None = Field(
        default=None,
        description="Overheat mode. 0 = off, 1 = on.",
    )
    overclock_enabled: Literal[0, 1] | None = Field(
        default=None,
        description="Overclock enabled. 0 = disabled, 1 = enabled.",
    )
    stats_frequency: int | None = Field(default=None, description="Stats frequency (e.g. 0).")
    frequency: Literal[400, 490, 525, 550, 600, 625] | None = Field(
        default=None,
        description="Frequency in MHz. Valid values: 400, 490, 525, 550, 600, 625",
    )
    core_voltage: Literal[1000, 1060, 1100, 1150, 1200, 1250] | None = Field(
        default=None,
        description="Core voltage in mV. Valid values: 1000, 1060, 1100, 1150, 1200, 1250",
    )
    min_fan_speed: int | None = Field(default=None, description="Minimum fan speed (e.g. 25).")

    @field_validator("rotation", mode="before")
    @classmethod
    def validate_rotation(cls, v: int | None) -> int | None:
        """Validate rotation is one of the allowed Bitaxe values."""
        if v is None:
            return v

        # Let Pydantic handle non-int types (strict mode will reject them).
        if not isinstance(v, int):
            return v

        valid_rotations = set(BITAXE_ROTATION_VALUES)
        if v not in valid_rotations:
            raise ValueError(
                f"Invalid rotation {v} for Bitaxe miner. "
                f"Accepted values are: {sorted(valid_rotations)}"
            )
        return v

    @field_validator("invertscreen", mode="before")
    @classmethod
    def validate_invertscreen(cls, v: int | None) -> int | None:
        """Validate invertscreen is one of the allowed Bitaxe values."""
        if v is None:
            return v

        if not isinstance(v, int):
            return v

        valid_invertscreen = set(BITAXE_INVERTSCREEN_VALUES)
        if v not in valid_invertscreen:
            raise ValueError(
                f"Invalid invertscreen {v} for Bitaxe miner. "
                f"Accepted values are: {sorted(valid_invertscreen)}"
            )
        return v

    @field_validator("display_timeout", mode="before")
    @classmethod
    def validate_display_timeout(cls, v: int | None) -> int | None:
        """Validate display_timeout is one of the allowed Bitaxe values."""
        if v is None:
            return v

        if not isinstance(v, int):
            return v

        valid_display_timeouts = set(BITAXE_DISPLAY_TIMEOUT_VALUES)
        if v not in valid_display_timeouts:
            raise ValueError(
                f"Invalid display_timeout {v} for Bitaxe miner. "
                f"Accepted values are: {sorted(valid_display_timeouts)}"
            )
        return v

    @field_validator("overheat_mode", mode="before")
    @classmethod
    def validate_overheat_mode(cls, v: int | None) -> int | None:
        """Validate overheat_mode is one of the allowed Bitaxe values (0 or 1)."""
        if v is None:
            return v

        if not isinstance(v, int):
            return v

        valid_overheat = set(BITAXE_OVERHEAT_MODE_VALUES)
        if v not in valid_overheat:
            raise ValueError(
                f"Invalid overheat_mode {v} for Bitaxe miner. "
                f"Accepted values are: {sorted(valid_overheat)}"
            )
        return v

    @field_validator("overclock_enabled", mode="before")
    @classmethod
    def validate_overclock_enabled(cls, v: int | None) -> int | None:
        """Validate overclock_enabled is one of the allowed Bitaxe values (0 or 1)."""
        if v is None:
            return v

        if not isinstance(v, int):
            return v

        valid_overclock = set(BITAXE_OVERCLOCK_ENABLED_VALUES)
        if v not in valid_overclock:
            raise ValueError(
                f"Invalid overclock_enabled {v} for Bitaxe miner. "
                f"Accepted values are: {sorted(valid_overclock)}"
            )
        return v

    @field_validator("frequency", mode="before")
    @classmethod
    def validate_frequency(cls, v: int | None) -> int | None:
        """Validate frequency is one of the allowed Bitaxe values."""
        if v is None:
            return v

        if not isinstance(v, int):
            return v

        valid_frequencies = set(BITAXE_FREQUENCY_VALUES)
        if v not in valid_frequencies:
            raise ValueError(
                f"Invalid frequency {v} for Bitaxe miner. "
                f"Accepted values are: {sorted(valid_frequencies)}"
            )
        return v

    @field_validator("core_voltage", mode="before")
    @classmethod
    def validate_core_voltage(cls, v: int | None) -> int | None:
        """Validate core_voltage is one of the allowed Bitaxe values."""
        if v is None:
            return v

        if not isinstance(v, int):
            return v

        valid_core_voltages = set(BITAXE_CORE_VOLTAGE_VALUES)
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
        core_voltage, min_fan_speed. rotation, invertscreen, display_timeout, frequency and core_voltage must be in allowed sets.

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
