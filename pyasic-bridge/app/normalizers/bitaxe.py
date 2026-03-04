"""
Bitaxe-specific miner data normalizer.

Extends DefaultMinerDataNormalizer with Bitaxe-specific normalization
for extra_fields returned by pyasic for Bitaxe miners.
"""

import logging
from collections.abc import Mapping
from typing import Any

from .base import normalize_efficiency_structure
from .default import DefaultMinerDataNormalizer

logger = logging.getLogger(__name__)


class BitaxeMinerDataNormalizer(DefaultMinerDataNormalizer):
    """
    Normalizer for Bitaxe miners.

    Extends default normalization with Bitaxe-specific extra_fields handling:
    - Efficiency-like fields (key contains "efficiency") → J/Th structure
    - Difficulty-like fields (key contains "difficulty") → string
    - Temperature-like fields (key contains "temp") → float
    - Power-like fields (key contains "power", "wattage", or "watt") → float
    """

    def _is_bitaxe_miner(self, data: Mapping[str, Any]) -> bool:
        """
        Detect whether the given miner data belongs to a Bitaxe device.

        Checks device_info.make and device_info.model for "bitaxe" (case-insensitive).
        """
        device_info = data.get("device_info")
        if not device_info or not isinstance(device_info, dict):
            return False

        make = device_info.get("make")
        if isinstance(make, str) and "bitaxe" in make.lower():
            return True

        model = device_info.get("model")
        if isinstance(model, str) and "bitaxe" in model.lower():
            return True

        return False

    def _normalize_extra_fields(
        self,
        extra_fields: Any,
        context: Mapping[str, Any],
    ) -> Any:
        """
        Normalize extra_fields with Bitaxe-specific logic when applicable.

        Calls parent normalization first (handles hashrate-like structures),
        then applies Bitaxe-specific normalization if this is a Bitaxe miner.
        """
        result = super()._normalize_extra_fields(extra_fields, context)

        if not isinstance(result, dict) or not self._is_bitaxe_miner(context):
            return result

        hashrate_obj = context.get("hashrate")
        hashrate_ghs = (
            hashrate_obj.get("rate")
            if isinstance(hashrate_obj, dict)
            else 0.0
        )
        wattage = context.get("wattage")

        for key in list(result.keys()):
            value = result[key]
            key_lower = key.lower()

            if "efficiency" in key_lower and not key_lower.startswith("not_"):
                try:
                    result[key] = normalize_efficiency_structure(
                        value,
                        wattage=wattage,
                        hashrate_ghs=hashrate_ghs,
                    )
                except Exception as e:
                    logger.debug(
                        f"Could not normalize efficiency field '{key}': {e}"
                    )

            elif "difficulty" in key_lower:
                if value is None:
                    result[key] = "0"
                else:
                    try:
                        result[key] = str(int(value))
                    except (ValueError, TypeError):
                        result[key] = "0"

            elif "temp" in key_lower:
                try:
                    result[key] = float(value)
                except (ValueError, TypeError):
                    pass

            elif "power" in key_lower or "wattage" in key_lower or "watt" in key_lower:
                try:
                    result[key] = float(value)
                except (ValueError, TypeError):
                    pass

        return result
