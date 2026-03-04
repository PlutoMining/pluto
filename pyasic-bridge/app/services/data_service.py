"""
Miner data service.

Handles retrieval of miner data (normalized and raw).
"""

import logging

from app.models import MinerData, MinerDataRaw
from app.normalizers import get_normalizer_for_miner
from app.pyasic_client import MinerClient

logger = logging.getLogger(__name__)


class MinerDataService:
    """
    Service for miner data retrieval operations.

    Handles getting normalized and raw miner data.
    Returns domain models (Pydantic) for type safety and TypeScript generation.
    """

    def __init__(self, client: MinerClient):
        """
        Initialize MinerDataService.

        Args:
            client: MinerClient implementation
        """
        self.client = client

    async def get_miner_data(self, ip: str) -> MinerData:
        """
        Get normalized data from a specific miner.

        Args:
            ip: IP address of the miner

        Returns:
            MinerData domain model instance

        Raises:
            ValueError: If miner is not found or not a valid miner
            ConnectionError: If connection to miner fails
            TimeoutError: If request times out
        """
        # Use client's abstracted method to get data dict
        data_dict = await self.client.get_miner_data_dict(ip)

        # Log raw data for debugging (especially mac/macAddr fields)
        logger.debug(
            f"Raw miner data dict for {ip} (before normalization): "
            f"has_mac={('mac' in data_dict)}, "
            f"has_macAddr={('macAddr' in data_dict)}, "
            f"mac={data_dict.get('mac')}, "
            f"macAddr={data_dict.get('macAddr')}, "
            f"keys={list(data_dict.keys())[:20]}"
        )

        # Get appropriate normalizer for this miner
        normalizer = get_normalizer_for_miner(data_dict)
        # Normalize the data to dict
        normalized_dict = normalizer.normalize(data_dict)
        # Add IP field (required by MinerData model)
        normalized_dict["ip"] = ip

        # Convert to domain model for type safety and TypeScript generation
        return MinerData.model_validate(normalized_dict)

    async def get_miner_data_raw(self, ip: str) -> MinerDataRaw:
        """
        Get raw data from a specific miner without normalization.

        Args:
            ip: IP address of the miner

        Returns:
            MinerDataRaw domain model instance

        Raises:
            ValueError: If miner is not found
        """
        # Use client's abstracted method to get data dict
        data_dict = await self.client.get_miner_data_dict(ip)
        # Convert to domain model for type safety and TypeScript generation
        return MinerDataRaw.model_validate(data_dict)
