"""
Factory for miner-specific config validators.
"""

from typing import Any

from app.miner_detection import is_espminer

from .base import ConfigValidator
from .bitaxe import BitaxeConfigValidator


class ConfigValidatorFactory:
    """
    Factory for selecting the appropriate config validator based on miner type.
    """

    def __init__(self):
        self._default_validator = ConfigValidator()
        self._bitaxe_validator = BitaxeConfigValidator()

    def get_validator(self, miner: Any) -> ConfigValidator:
        """Get the validator for the given miner type."""
        if is_espminer(miner):
            return self._bitaxe_validator
        return self._default_validator


# Global factory instance
_factory = ConfigValidatorFactory()


def get_config_validator(miner: Any) -> ConfigValidator:
    """
    Get the appropriate config validator for a miner.

    Args:
        miner: Miner instance from pyasic

    Returns:
        ConfigValidator instance appropriate for the miner type
    """
    return _factory.get_validator(miner)
