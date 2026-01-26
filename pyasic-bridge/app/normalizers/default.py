"""
Default miner data normalizer implementation.

Provides the standard normalization logic for all miner types.
"""

import logging
from collections.abc import Mapping
from typing import Any

from .base import (
    normalize_efficiency_structure,
    normalize_hashrate_structure,
)

logger = logging.getLogger(__name__)


class DefaultMinerDataNormalizer:
    """
    Default implementation of MinerDataNormalizer.

    Normalizes miner data with consistent formats:
    - Convert hashrate values to Gh/s
    - Convert difficulty values to strings
    - Ensure efficiency is a proper number (not scientific notation)
    - Handle extra_fields from pyasic response model
    """

    def normalize(self, data: Mapping[str, Any]) -> dict[str, Any]:
        """
        Normalize miner data to ensure consistent formats.

        Args:
            data: Raw miner data dictionary from pyasic

        Returns:
            Dict: Normalized miner data
        """
        normalized = dict(data)  # Create a copy

        # Normalize main hashrate - preserve structure but convert rate to Gh/s
        if 'hashrate' in normalized and normalized['hashrate'] is not None:
            normalized['hashrate'] = normalize_hashrate_structure(normalized['hashrate'])
        else:
            normalized['hashrate'] = {
                "unit": {
                    "value": 1000000000,
                    "suffix": "Gh/s"
                },
                "rate": 0.0
            }

        # Normalize difficulty fields (convert to string, handle None)
        if 'best_difficulty' in normalized:
            if normalized['best_difficulty'] is not None:
                try:
                    normalized['best_difficulty'] = str(int(normalized['best_difficulty']))
                except (ValueError, TypeError):
                    normalized['best_difficulty'] = "0"
            else:
                normalized['best_difficulty'] = "0"
        else:
            normalized['best_difficulty'] = "0"

        if 'best_session_difficulty' in normalized:
            if normalized['best_session_difficulty'] is not None:
                try:
                    normalized['best_session_difficulty'] = str(int(normalized['best_session_difficulty']))
                except (ValueError, TypeError):
                    normalized['best_session_difficulty'] = "0"
            else:
                normalized['best_session_difficulty'] = "0"
        else:
            normalized['best_session_difficulty'] = "0"

        # Normalize efficiency - preserve structure but convert rate to J/Th
        # Extract hashrate rate for efficiency calculation if needed
        hashrate_obj = normalized.get('hashrate')
        hashrate_ghs = (
            hashrate_obj['rate']
            if isinstance(hashrate_obj, dict) and 'rate' in hashrate_obj
            else (hashrate_obj if isinstance(hashrate_obj, (int, float)) else 0.0)
        )
        wattage = normalized.get('wattage')

        # Get efficiency value (check efficiency_fract as fallback)
        efficiency_value = normalized.get('efficiency')
        if (efficiency_value is None or efficiency_value == 0) and 'efficiency_fract' in normalized:
            efficiency_value = normalized.get('efficiency_fract')

        # Normalize efficiency to structured format
        normalized['efficiency'] = normalize_efficiency_structure(
            efficiency_value,
            wattage=wattage,
            hashrate_ghs=hashrate_ghs
        )

        # Normalize extra_fields if present
        if 'extra_fields' in normalized:
            normalized['extra_fields'] = self._normalize_extra_fields(
                normalized['extra_fields'],
                normalized
            )

        return normalized

    def _normalize_extra_fields(
        self,
        extra_fields: Any,
        context: Mapping[str, Any]
    ) -> Any:
        """
        Normalize extra_fields from pyasic response model.

        This method can be overridden by subclasses to provide vendor-specific
        or model-specific normalization logic for extra_fields.

        Args:
            extra_fields: The extra_fields value from the raw pyasic data
            context: The full normalized data context (for reference)

        Returns:
            Normalized extra_fields value (preserved as-is by default, but can
            be customized to normalize nested hashrate/efficiency patterns)
        """
        # Default implementation: preserve extra_fields as-is
        # Future implementations can normalize known patterns:
        # - Nested hashrate values using normalize_hashrate_structure
        # - Nested efficiency values using normalize_efficiency_structure
        # - Vendor-specific fields based on make/model from context

        if extra_fields is None:
            return None

        # If extra_fields is a dict, create a shallow copy to avoid mutating the original
        if isinstance(extra_fields, dict):
            normalized_extra = dict(extra_fields)

            # Optionally normalize known patterns in extra_fields
            # For example, if extra_fields contains hashrate-like structures:
            for key, value in normalized_extra.items():
                # Check for hashrate-like fields (can be extended)
                if isinstance(value, dict) and 'rate' in value and 'unit' in value:
                    # This looks like a hashrate structure, normalize it
                    try:
                        normalized_extra[key] = normalize_hashrate_structure(value)
                    except Exception as e:
                        logger.debug(f"Could not normalize hashrate-like field '{key}' in extra_fields: {e}")
                        # Keep original value if normalization fails

            return normalized_extra

        # For other types (list, primitive), return as-is
        return extra_fields
