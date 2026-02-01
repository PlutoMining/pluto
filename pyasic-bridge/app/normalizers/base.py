"""
Base normalization utilities and Protocol.

Provides the MinerDataNormalizer Protocol and helper functions for
converting and normalizing miner data structures.
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


def convert_hashrate_to_ghs(hashrate_value: Any) -> float:
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


def normalize_hashrate_structure(hashrate_value: Any) -> dict[str, Any]:
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
    rate_ghs = convert_hashrate_to_ghs(hashrate_value)

    # Return normalized structure
    return {
        "unit": {
            "value": 1000000000,  # 1e9 for Gh/s
            "suffix": "Gh/s"
        },
        "rate": rate_ghs
    }


def normalize_efficiency_structure(
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
