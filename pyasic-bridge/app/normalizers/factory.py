"""
Normalizer factory for selecting the appropriate normalizer based on miner type.
"""

import logging
from collections.abc import Mapping
from typing import Any

from .base import MinerDataNormalizer
from .bitaxe import BitaxeMinerDataNormalizer
from .default import DefaultMinerDataNormalizer

logger = logging.getLogger(__name__)


class NormalizerFactory:
    """
    Factory for selecting the appropriate normalizer based on miner data.

    Automatically detects miner type from device_info (make, model) and
    returns the appropriate normalizer instance.
    """

    def __init__(self):
        """Initialize the factory with available normalizers."""
        self._default_normalizer = DefaultMinerDataNormalizer()
        self._bitaxe_normalizer = BitaxeMinerDataNormalizer()

    def get_normalizer(self, data: Mapping[str, Any]) -> MinerDataNormalizer:
        """
        Get the appropriate normalizer for the given miner data.

        Args:
            data: Raw miner data dictionary from pyasic

        Returns:
            MinerDataNormalizer instance appropriate for the miner type
        """
        # Check if this is a Bitaxe miner
        if self._is_bitaxe_miner(data):
            logger.debug("Detected Bitaxe miner, using BitaxeMinerDataNormalizer")
            return self._bitaxe_normalizer

        # Default to standard normalizer
        logger.debug("Using DefaultMinerDataNormalizer")
        return self._default_normalizer

    def _is_bitaxe_miner(self, data: Mapping[str, Any]) -> bool:
        """
        Check if the miner is a Bitaxe based on device_info.make and device_info.model.

        Uses case-insensitive matching to detect Bitaxe miners.
        Checks device_info.make and device_info.model fields from the miner data.
        Also checks top-level make and model fields for convenience.

        Args:
            data: Raw miner data dictionary

        Returns:
            True if the miner appears to be a Bitaxe, False otherwise
        """
        # Get device_info dictionary, defaulting to empty dict if not present
        device_info = data.get('device_info') or {}

        # Get values from device_info and convert to lowercase for case-insensitive comparison
        # Handle None, empty strings, and non-string types gracefully
        make = str(device_info.get('make', '')).lower() if device_info.get('make') else ''
        model = str(device_info.get('model', '')).lower() if device_info.get('model') else ''

        # Also check top-level make and model fields
        top_make = str(data.get('make', '')).lower() if data.get('make') else ''
        top_model = str(data.get('model', '')).lower() if data.get('model') else ''

        # Check for Bitaxe indicators (case-insensitive)
        return (
            'bitaxe' in make or
            'bitaxe' in model or
            'bitaxe' in top_make or
            'bitaxe' in top_model
        )


# Global factory instance
_factory = NormalizerFactory()


def get_normalizer_for_miner(data: Mapping[str, Any]) -> MinerDataNormalizer:
    """
    Convenience function to get the appropriate normalizer for miner data.

    Args:
        data: Raw miner data dictionary from pyasic

    Returns:
        MinerDataNormalizer instance appropriate for the miner type
    """
    return _factory.get_normalizer(data)
