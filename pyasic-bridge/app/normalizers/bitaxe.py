"""
Bitaxe-specific miner data normalizer implementation.

Extends the default normalizer with Bitaxe-specific extra_fields handling.
"""

import logging
from collections.abc import Mapping
from typing import Any

from .base import normalize_efficiency_structure
from .default import DefaultMinerDataNormalizer

logger = logging.getLogger(__name__)


class BitaxeMinerDataNormalizer(DefaultMinerDataNormalizer):
    """
    Bitaxe-specific implementation of MinerDataNormalizer.

    Extends DefaultMinerDataNormalizer with Bitaxe-specific extra_fields normalization.
    Handles Bitaxe-specific fields in extra_fields that may require special processing.

    Normalizes:
    - All standard fields (hashrate, efficiency, difficulty) via parent class
    - Bitaxe-specific extra_fields with vendor-specific normalization logic
    """

    def _is_bitaxe_miner(self, context: Mapping[str, Any]) -> bool:
        """
        Check if the miner is a Bitaxe based on device_info.make and device_info.model.

        Args:
            context: The full normalized data context

        Returns:
            True if the miner appears to be a Bitaxe, False otherwise
        """
        # Get device_info dictionary, defaulting to empty dict if not present
        device_info = context.get('device_info') or {}

        # Get values from device_info and convert to lowercase for case-insensitive comparison
        # Handle None, empty strings, and non-string types gracefully
        make = str(device_info.get('make', '')).lower() if device_info.get('make') else ''
        model = str(device_info.get('model', '')).lower() if device_info.get('model') else ''

        # Check for Bitaxe indicators (case-insensitive)
        return (
            'bitaxe' in make or
            'bitaxe' in model
        )

    def _normalize_extra_fields(
        self,
        extra_fields: Any,
        context: Mapping[str, Any]
    ) -> Any:
        """
        Normalize Bitaxe-specific extra_fields from pyasic response model.

        This method extends the default normalization with Bitaxe-specific logic:
        - Detects Bitaxe miners from context
        - Normalizes Bitaxe-specific fields in extra_fields
        - Handles hashrate-like structures (inherited from default)
        - Preserves all other fields

        Args:
            extra_fields: The extra_fields value from the raw pyasic data
            context: The full normalized data context (for reference)

        Returns:
            Normalized extra_fields value with Bitaxe-specific processing applied
        """
        # First, apply default normalization (handles hashrate-like structures)
        normalized_extra = super()._normalize_extra_fields(extra_fields, context)

        # If not a Bitaxe miner, return the default normalized result
        if not self._is_bitaxe_miner(context):
            return normalized_extra

        # Bitaxe-specific normalization
        if normalized_extra is None:
            return None

        if not isinstance(normalized_extra, dict):
            # For non-dict types, return as-is (already normalized by parent)
            return normalized_extra

        # Create a copy to avoid mutating the parent's result
        bitaxe_normalized = dict(normalized_extra)

        # Extract context values that might be needed for Bitaxe-specific calculations
        hashrate_obj = context.get('hashrate')
        hashrate_ghs = (
            hashrate_obj['rate']
            if isinstance(hashrate_obj, dict) and 'rate' in hashrate_obj
            else (hashrate_obj if isinstance(hashrate_obj, (int, float)) else 0.0)
        )
        wattage = context.get('wattage')

        # Normalize Bitaxe-specific fields in extra_fields
        for key, value in bitaxe_normalized.items():
            # Handle efficiency-like structures in extra_fields
            # Bitaxe may have efficiency values in extra_fields that need normalization
            # Match keys that:
            # - Start with "efficiency" (e.g., "efficiency", "efficiency_custom", "efficiency_alt")
            # - End with "_efficiency" but don't start with "not_" (e.g., "custom_efficiency")
            # This excludes keys like "not_efficiency" which end with "_efficiency" but start with "not_"
            key_lower = key.lower()
            is_efficiency_field = (
                key_lower.startswith('efficiency') or
                (key_lower.endswith('_efficiency') and not key_lower.startswith('not_'))
            )
            if isinstance(value, (str, int, float)) and is_efficiency_field:
                try:
                    # Try to normalize as efficiency structure
                    bitaxe_normalized[key] = normalize_efficiency_structure(
                        value,
                        wattage=wattage,
                        hashrate_ghs=hashrate_ghs
                    )
                except Exception as e:
                    logger.debug(
                        f"Could not normalize efficiency-like field '{key}' in Bitaxe extra_fields: {e}"
                    )
                    # Keep original value if normalization fails

            # Handle difficulty-like fields in extra_fields
            # Bitaxe may have additional difficulty fields in extra_fields
            elif 'difficulty' in key.lower() and (value is None or isinstance(value, (int, float, str))):
                try:
                    # Convert to string format (consistent with main difficulty fields)
                    if value is not None:
                        bitaxe_normalized[key] = str(int(value))
                    else:
                        bitaxe_normalized[key] = "0"
                except (ValueError, TypeError) as e:
                    logger.debug(
                        f"Could not normalize difficulty-like field '{key}' in Bitaxe extra_fields: {e}"
                    )
                    bitaxe_normalized[key] = "0"

            # Handle temperature-like fields (convert to float if needed)
            elif isinstance(value, (int, float, str)) and 'temp' in key.lower():
                try:
                    bitaxe_normalized[key] = float(value)
                except (ValueError, TypeError) as e:
                    logger.debug(
                        f"Could not normalize temperature-like field '{key}' in Bitaxe extra_fields: {e}"
                    )
                    # Keep original value if conversion fails

            # Handle wattage/power-like fields (convert to float if needed)
            elif isinstance(value, (int, float, str)) and ('watt' in key.lower() or 'power' in key.lower()):
                try:
                    bitaxe_normalized[key] = float(value)
                except (ValueError, TypeError) as e:
                    logger.debug(
                        f"Could not normalize power-like field '{key}' in Bitaxe extra_fields: {e}"
                    )
                    # Keep original value if conversion fails

        return bitaxe_normalized
