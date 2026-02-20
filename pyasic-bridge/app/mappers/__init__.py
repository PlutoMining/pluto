"""
Mappers between pyasic-bridge internal models and pyasic (Pydantic) types.

This layer keeps pyasic config types (MinerConfig, FanModeConfig, etc.) out of
the rest of the application. Use internal models for API, validation, and
future TypeScript generation; convert to/from pyasic only at the boundary
(get_config / send_config).

Per-class mappers live in separate modules (fan_mode_mapper, pools_mapper,
temperature_mapper, mining_mode_mapper, miner_config_mapper) to keep
responsibilities narrow and conversions explicit and type-safe.
"""

from .fan_mode_mapper import fan_mode_from_pyasic, fan_mode_to_pyasic
from .miner_config_mapper import miner_config_from_pyasic, miner_config_to_pyasic
from .mining_mode_mapper import mining_mode_from_pyasic, mining_mode_to_pyasic
from .pools_mapper import pools_from_pyasic, pools_to_pyasic
from .temperature_mapper import temperature_from_pyasic, temperature_to_pyasic

__all__ = [
    # Per-class object mappers
    "fan_mode_from_pyasic",
    "fan_mode_to_pyasic",
    "pools_from_pyasic",
    "pools_to_pyasic",
    "temperature_from_pyasic",
    "temperature_to_pyasic",
    "mining_mode_from_pyasic",
    "mining_mode_to_pyasic",
    "miner_config_from_pyasic",
    "miner_config_to_pyasic",
]

