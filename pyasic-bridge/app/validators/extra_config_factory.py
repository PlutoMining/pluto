"""
Factory for creating miner-specific ExtraConfig instances.

Handles construction of the correct ExtraConfig type (e.g. ESPMinerExtraConfig
for Bitaxe/espminer) before passing to pyasic.MinerConfig.
"""

from typing import Any

from app.miner_detection import is_espminer

try:
    from pyasic.config.extra import ESPMinerExtraConfig, MinerExtraConfig
except ImportError:
    # Fallback: if pyasic doesn't expose these types, we'll use dict
    ESPMinerExtraConfig = None
    MinerExtraConfig = None


def get_extra_config_class(
    miner: Any,
    existing_extra_config: dict[str, Any] | None = None,
) -> type[Any] | None:
    """
    Get the appropriate ExtraConfig class for a miner.

    Args:
        miner: Miner instance from pyasic
        existing_extra_config: Optional existing extra_config dict (from get_config());
            used as fallback to detect Bitaxe when model/class/module are not set.

    Returns:
        ExtraConfig class (e.g. ESPMinerExtraConfig) or None if not available/needed
    """
    if ESPMinerExtraConfig is None:
        return None

    if is_espminer(miner, existing_extra_config):
        return ESPMinerExtraConfig

    return MinerExtraConfig if MinerExtraConfig is not None else None


def build_extra_config(
    miner: Any,
    extra_config_dict: dict[str, Any] | None,
    existing_extra_config: dict[str, Any] | None = None,
) -> Any | None:
    """
    Build the appropriate ExtraConfig instance for a miner.

    Args:
        miner: Miner instance from pyasic
        extra_config_dict: Dictionary with extra_config fields
        existing_extra_config: Optional existing extra_config (from get_config());
            used to detect Bitaxe when miner model/class/module are not set.

    Returns:
        ExtraConfig instance (e.g. ESPMinerExtraConfig) or None
    """
    if not extra_config_dict:
        return None

    extra_config_class = get_extra_config_class(miner, existing_extra_config)
    if extra_config_class is None:
        # Types not available or miner doesn't need typed extra_config
        # Return dict as-is (pyasic may accept it)
        return extra_config_dict

    try:
        return extra_config_class(**extra_config_dict)
    except Exception as e:
        # If construction fails, raise ConfigValidationError so API returns 400
        from .exceptions import ConfigValidationError

        raise ConfigValidationError(
            f"Invalid extra_config for {miner.__class__.__name__}: {str(e)}"
        ) from e
