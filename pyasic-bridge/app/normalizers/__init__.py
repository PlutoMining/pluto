"""
Normalizers package for pyasic-bridge.

Provides pluggable normalization strategies for transforming raw pyasic miner data
into consistent, normalized formats.
"""

from .base import (
    MinerDataNormalizer,
    convert_hashrate_to_ghs,
    normalize_efficiency_structure,
    normalize_hashrate_structure,
)
from .bitaxe import BitaxeMinerDataNormalizer
from .default import DefaultMinerDataNormalizer
from .factory import NormalizerFactory, get_normalizer_for_miner

__all__ = [
    "MinerDataNormalizer",
    "DefaultMinerDataNormalizer",
    "BitaxeMinerDataNormalizer",
    "NormalizerFactory",
    "get_normalizer_for_miner",
    "convert_hashrate_to_ghs",
    "normalize_hashrate_structure",
    "normalize_efficiency_structure",
]
