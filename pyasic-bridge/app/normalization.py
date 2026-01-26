"""
Normalization module for pyasic-bridge.

Provides a pluggable normalization strategy interface and default implementation
for transforming raw pyasic miner data into consistent, normalized formats.
"""

import logging
from collections.abc import Mapping
from typing import Any, Protocol

logger = logging.getLogger(__name__)


class MinerDataNormalizer(Protocol):
    """
    Protocol defining the interface for miner data normalization strategies.

    Implementations should transform raw pyasic miner data dictionaries into
    normalized formats with consistent units and structures.
    """

    def normalize(self, data: Mapping[str, Any]) -> dict[str, Any]:
        """
        Normalize miner data to ensure consistent formats.

        Args:
            data: Raw miner data dictionary from pyasic

        Returns:
            Dict: Normalized miner data with consistent units and structures
        """
        ...


def _convert_hashrate_to_ghs(hashrate_value: Any) -> float:
    """
    Convert hashrate value to Gh/s, handling different units and formats.

    Args:
        hashrate_value: Can be:
            - AlgoHashRateType object with rate and unit
            - Number (int or float) in various units
            - Dict with rate/unit keys (from as_dict serialization)
            - Dict with nested unit.value structure
            - None

    Returns:
        float: Hashrate in Gh/s, or 0.0 if invalid
    """
    if hashrate_value is None:
        return 0.0

    try:
        rate = None
        unit = None

        # Try to get rate and unit from AlgoHashRateType object
        if hasattr(hashrate_value, 'rate') and hasattr(hashrate_value, 'unit'):
            rate = float(hashrate_value.rate)
            # Unit might be a number or an object with 'value'
            if hasattr(hashrate_value.unit, 'value'):
                unit = float(hashrate_value.unit.value)
            elif isinstance(hashrate_value.unit, (int, float)):
                unit = float(hashrate_value.unit)
            else:
                unit = 1  # Default to H/s if we can't determine
        # Try dict format (from as_dict) - handle nested unit structure
        elif isinstance(hashrate_value, dict) and 'rate' in hashrate_value:
            rate = float(hashrate_value['rate'])
            unit_obj = hashrate_value.get('unit')
            if unit_obj is not None:
                # Unit might be a dict with 'value' key (nested structure)
                if isinstance(unit_obj, dict) and 'value' in unit_obj:
                    unit = float(unit_obj['value'])
                elif isinstance(unit_obj, (int, float)):
                    unit = float(unit_obj)
                else:
                    unit = 1  # Default to H/s
            else:
                unit = 1  # Default to H/s if unit is missing
        # Try direct number
        elif isinstance(hashrate_value, (int, float)):
            rate = float(hashrate_value)
            # Detect unit based on magnitude
            if rate >= 1e8:
                unit = 1  # H/s
            elif rate >= 1e6:
                unit = 1  # H/s
            elif rate >= 1e3:
                unit = 1e9  # Gh/s
            else:
                unit = 1e12  # Th/s
        else:
            # Last resort: try to convert to float
            rate = float(hashrate_value)
            # Detect unit based on magnitude
            if rate >= 1e8:
                unit = 1  # H/s
            elif rate >= 1e6:
                unit = 1  # H/s
            elif rate >= 1e3:
                unit = 1e9  # Gh/s
            else:
                unit = 1e12  # Th/s

        # Convert to Gh/s based on unit
        if abs(unit - 1) < 0.1:
            result = rate / 1e9  # H/s -> Gh/s
        elif abs(unit - 1e6) < 1e3:
            result = rate / 1000  # MH/s -> Gh/s
        elif abs(unit - 1e9) < 1e6:
            result = rate  # Already Gh/s
        elif abs(unit - 1e12) < 1e9:
            result = rate * 1000  # Th/s -> Gh/s
        else:
            # Fallback: detect by magnitude
            if rate >= 1e9:
                result = rate / 1e9
            elif rate >= 1e6:
                result = rate / 1000
            elif rate >= 1000:
                result = rate
            else:
                result = rate * 1000

        return float(result) if result >= 0 else 0.0
    except Exception as e:
        logger.warning(f"Error converting hashrate: {e}, value: {hashrate_value}, type: {type(hashrate_value)}")
        return 0.0


def _normalize_hashrate_structure(hashrate_value: Any) -> dict[str, Any]:
    """
    Normalize hashrate to Gh/s while preserving the nested structure with unit information.

    Args:
        hashrate_value: Can be:
            - AlgoHashRateType object with rate and unit
            - Number (int or float) in various units
            - Dict with rate/unit keys (from as_dict serialization)
            - None

    Returns:
        Dict: Normalized hashrate structure with rate in Gh/s and unit info
        {
            "unit": {
                "value": 1000000000,  # 1e9 for Gh/s
                "suffix": "Gh/s"
            },
            "rate": <number in Gh/s>
        }
    """
    if hashrate_value is None:
        return {
            "unit": {
                "value": 1000000000,
                "suffix": "Gh/s"
            },
            "rate": 0.0
        }

    # Convert to Gh/s value
    rate_ghs = _convert_hashrate_to_ghs(hashrate_value)

    # Return normalized structure
    return {
        "unit": {
            "value": 1000000000,  # 1e9 for Gh/s
            "suffix": "Gh/s"
        },
        "rate": rate_ghs
    }


def _normalize_efficiency_structure(
    efficiency_value: Any,
    wattage: float | None = None,
    hashrate_ghs: float | None = None
) -> dict[str, Any]:
    """
    Normalize efficiency to J/Th while preserving the nested structure with unit information.

    Priority order:
    1. Calculate from wattage and hashrate (most precise, real-time)
    2. Fallback to pyasic's efficiency value (converted from its unit)

    Args:
        efficiency_value: Can be:
            - String (scientific notation like "1.8e-11") - used as fallback
            - Number (int or float) - used as fallback
            - None
        wattage: Power in watts (used for calculation - priority 1)
        hashrate_ghs: Hashrate in Gh/s (used for calculation - priority 1)

    Returns:
        Dict: Normalized efficiency structure with rate in J/Th and unit info
        {
            "unit": {
                "suffix": "J/Th"
            },
            "rate": <number in J/Th>
        }
    """
    try:
        rate_jth = 0.0
        calculated = False

        # Priority 1: Calculate efficiency from wattage and hashrate (most precise, real-time)
        # efficiency (J/Th) = power (W) / hashrate (Th/s)
        # Note: hashrate_ghs is normalized to Gh/s by normalize_hashrate_structure()
        # So we need to convert Gh/s to Th/s: hashrate_ths = hashrate_ghs / 1000
        if wattage is not None and wattage > 0 and hashrate_ghs is not None and hashrate_ghs > 0:
            try:
                # Convert Gh/s to Th/s
                hashrate_ths = hashrate_ghs / 1000
                # Calculate efficiency: efficiency (J/Th) = power (W) / hashrate (Th/s)
                rate_jth = wattage / hashrate_ths

                # Sanity check: if efficiency is unreasonably high (> 1000 J/Th),
                # the hashrate might be incorrectly normalized (maybe it's already in Th/s)
                # In that case, try using hashrate directly as Th/s
                if rate_jth > 1000:
                    logger.warning(f"Calculated efficiency {rate_jth:.2f} J/Th seems too high. "
                                 f"Hashrate might be in Th/s already. Hashrate: {hashrate_ghs}, Power: {wattage}")
                    # Try treating hashrate as Th/s directly
                    rate_jth = wattage / hashrate_ghs
                    calculated = True
                else:
                    calculated = True
            except ZeroDivisionError:
                rate_jth = 0.0

        # Priority 2: Fallback to pyasic's efficiency value if calculation not possible
        if not calculated and efficiency_value is not None and efficiency_value != 0:
            # Convert to float (handles scientific notation strings)
            if isinstance(efficiency_value, str):
                rate_raw = float(efficiency_value)
            else:
                rate_raw = float(efficiency_value)

            # Convert from pyasic's efficiency unit to J/Th
            # pyasic provides efficiency in a unit that needs to be converted to J/Th
            # Conversion factor: multiply by 1e12 to convert to J/Th
            # Example: 1.8e-11 * 1e12 = 18.20 J/Th
            rate_jth = rate_raw * 1e12

        # Ensure non-negative
        rate_jth = max(0.0, float(rate_jth))

    except (ValueError, TypeError, ZeroDivisionError) as e:
        logger.warning(f"Error normalizing efficiency: {e}")
        rate_jth = 0.0

    return {
        "unit": {
            "suffix": "J/Th"
        },
        "rate": rate_jth
    }


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
            normalized['hashrate'] = _normalize_hashrate_structure(normalized['hashrate'])
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
        normalized['efficiency'] = _normalize_efficiency_structure(
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
        # - Nested hashrate values using _normalize_hashrate_structure
        # - Nested efficiency values using _normalize_efficiency_structure
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
                        normalized_extra[key] = _normalize_hashrate_structure(value)
                    except Exception as e:
                        logger.debug(f"Could not normalize hashrate-like field '{key}' in extra_fields: {e}")
                        # Keep original value if normalization fails

            return normalized_extra

        # For other types (list, primitive), return as-is
        return extra_fields


# Backward compatibility: export functions for existing code that imports from main
# These will be removed once all code is migrated to use the normalizer class
def convert_hashrate_to_ghs(hashrate_value: Any) -> float:
    """Backward compatibility wrapper for _convert_hashrate_to_ghs."""
    return _convert_hashrate_to_ghs(hashrate_value)


def normalize_hashrate_structure(hashrate_value: Any) -> dict[str, Any]:
    """Backward compatibility wrapper for _normalize_hashrate_structure."""
    return _normalize_hashrate_structure(hashrate_value)


def normalize_efficiency_structure(
    efficiency_value: Any,
    wattage: float | None = None,
    hashrate_ghs: float | None = None
) -> dict[str, Any]:
    """Backward compatibility wrapper for _normalize_efficiency_structure."""
    return _normalize_efficiency_structure(efficiency_value, wattage, hashrate_ghs)


def normalize_miner_data(data_dict: dict[str, Any]) -> dict[str, Any]:
    """
    Backward compatibility wrapper for DefaultMinerDataNormalizer.normalize.

    This function maintains the existing API for code that imports from main.py.
    """
    normalizer = DefaultMinerDataNormalizer()
    return normalizer.normalize(data_dict)
