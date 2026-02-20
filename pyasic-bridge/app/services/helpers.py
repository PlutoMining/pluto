"""
Helper functions for miner data processing.

Shared utilities used across multiple miner services to avoid duplication.
"""

import logging
from typing import Any

from app.models import MinerInfo
from app.normalizers import get_normalizer_for_miner

logger = logging.getLogger(__name__)


def extract_hashrate_rate(normalized_data: dict[str, Any]) -> float:
    """
    Extract hashrate rate from normalized data for backward compatibility.

    Args:
        normalized_data: Normalized miner data dictionary

    Returns:
        Hashrate rate as float, or 0.0 if not available
    """
    hashrate = normalized_data.get("hashrate")
    if isinstance(hashrate, dict) and "rate" in hashrate:
        return float(hashrate["rate"])
    return 0.0


def extract_miner_attributes(data: Any) -> dict[str, Any]:
    """
    Extract common attributes from miner data object.

    Args:
        data: Miner data object (from pyasic)

    Returns:
        Dictionary with mac, model, hostname attributes
    """
    return {
        "mac": getattr(data, "mac", None),
        "model": getattr(data, "model", None),
        "hostname": getattr(data, "hostname", None),
    }


async def process_miner_data(
    ip: str,
    data_dict: dict[str, Any],
) -> MinerInfo:
    """
    Process and normalize miner data into a MinerInfo object.

    This helper eliminates duplication between single IP and subnet scanning.

    Args:
        ip: IP address of the miner
        data_dict: Raw miner data dictionary

    Returns:
        MinerInfo object with normalized data
    """
    # Get appropriate normalizer for this miner
    normalizer = get_normalizer_for_miner(data_dict)
    # Normalize the data
    normalized_data = normalizer.normalize(data_dict)

    # Extract hashrate rate for the top-level hashrate field (for backward compatibility)
    normalized_hashrate_rate = extract_hashrate_rate(normalized_data)

    # Extract common attributes from the raw data dict
    # Note: We use data_dict here since we've already serialized it
    attrs = {
        "mac": data_dict.get("mac") or data_dict.get("macAddr"),
        "model": data_dict.get("model"),
        "hostname": data_dict.get("hostname"),
    }

    return MinerInfo(
        ip=ip,
        mac=attrs["mac"],
        model=attrs["model"],
        hostname=attrs["hostname"],
        hashrate=normalized_hashrate_rate,
        data={**normalized_data, "ip": ip},
    )
