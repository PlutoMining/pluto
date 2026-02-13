"""
Base config validator interface.
"""

from typing import Any


class ConfigValidator:
    """
    Base class for miner-specific config validators.

    Each miner type can implement its own validator to enforce
    vendor-specific constraints on config fields (e.g. extra_config).
    """

    def validate(self, config: dict[str, Any], miner: Any) -> None:
        """
        Validate config dictionary before sending to miner.

        Args:
            config: Config dictionary to validate (merged config)
            miner: Miner instance (for accessing miner-specific attributes)

        Raises:
            ValueError: If validation fails with a descriptive error message
        """
        # Default implementation: no validation
        pass
