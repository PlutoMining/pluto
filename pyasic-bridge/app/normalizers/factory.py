"""
Normalizer factory for selecting the appropriate normalizer based on miner type.
"""

import logging
from collections.abc import Mapping
from typing import Any

from app.miner_detection import is_bitaxe_from_data

from .base import MinerDataNormalizer
from .bitaxe import BitaxeMinerDataNormalizer
from .default import DefaultMinerDataNormalizer

logger = logging.getLogger(__name__)


class NormalizerFactory:
    """
    Factory for selecting the appropriate normalizer based on miner data.
    """

    def __init__(self):
        self._default_normalizer = DefaultMinerDataNormalizer()
        self._bitaxe_normalizer = BitaxeMinerDataNormalizer()

    def get_normalizer(self, data: Mapping[str, Any]) -> MinerDataNormalizer:
        """Get the normalizer for the given miner data."""
        if is_bitaxe_from_data(data):
            logger.debug("Detected Bitaxe miner, using BitaxeMinerDataNormalizer")
            return self._bitaxe_normalizer
        logger.debug("Using DefaultMinerDataNormalizer")
        return self._default_normalizer


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
