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

    Automatically detects miner type from data (make, model, hostname) and
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
        Check if the miner is a Bitaxe based on make, model, or hostname.

        Uses case-insensitive matching to detect Bitaxe miners.

        Args:
            data: Raw miner data dictionary

        Returns:
            True if the miner appears to be a Bitaxe, False otherwise
        """
        # Get values and convert to lowercase for case-insensitive comparison
        # Handle None, empty strings, and non-string types gracefully
        make = str(data.get('make', '')).lower() if data.get('make') else ''
        model = str(data.get('model', '')).lower() if data.get('model') else ''
        hostname = str(data.get('hostname', '')).lower() if data.get('hostname') else ''

        # Check for Bitaxe indicators (case-insensitive)
        return (
            'bitaxe' in make or
            'bitaxe' in model or
            'bitaxe' in hostname
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
