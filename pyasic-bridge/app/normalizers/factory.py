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


def _is_bitaxe(data: Mapping[str, Any]) -> bool:
    """
    Detect Bitaxe miners from miner data.

    Checks device_info.make, device_info.model, and top-level make for
    the string "bitaxe" (case-insensitive).
    """
    device_info = data.get("device_info")
    if isinstance(device_info, dict):
        make = device_info.get("make")
        if isinstance(make, str) and "bitaxe" in make.lower():
            return True
        model = device_info.get("model")
        if isinstance(model, str) and "bitaxe" in model.lower():
            return True

    # Also check top-level make field
    top_make = data.get("make")
    if isinstance(top_make, str) and "bitaxe" in top_make.lower():
        return True

    return False


class NormalizerFactory:
    """Factory for selecting the appropriate normalizer based on miner data."""

    def __init__(self):
        self._default_normalizer = DefaultMinerDataNormalizer()
        self._bitaxe_normalizer = BitaxeMinerDataNormalizer()

    def get_normalizer(self, data: Mapping[str, Any]) -> MinerDataNormalizer:
        """Get the normalizer for the given miner data."""
        if _is_bitaxe(data):
            return self._bitaxe_normalizer
        return self._default_normalizer


_factory = NormalizerFactory()


def get_normalizer_for_miner(data: Mapping[str, Any]) -> MinerDataNormalizer:
    return _factory.get_normalizer(data)
