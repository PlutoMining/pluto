"""
Miner control service.

Handles miner control operations like restart and fault light control.
"""

import logging

from app.models import StatusResponse
from app.pyasic_client import MinerClient

logger = logging.getLogger(__name__)


class MinerControlService:
    """
    Service for miner control operations.

    Handles restarting miners and controlling fault lights.
    Returns domain models (Pydantic) for type safety and TypeScript generation.
    """

    def __init__(self, client: MinerClient):
        """
        Initialize MinerControlService.

        Args:
            client: MinerClient implementation
        """
        self.client = client

    async def restart_miner(self, ip: str) -> StatusResponse:
        """
        Restart a miner.

        Args:
            ip: IP address of the miner

        Returns:
            StatusResponse domain model instance

        Raises:
            ValueError: If miner is not found
        """
        # Use client's abstracted method
        await self.client.restart_miner(ip)
        return StatusResponse(status="success")

    async def fault_light_on(self, ip: str) -> StatusResponse:
        """
        Turn on fault light.

        Args:
            ip: IP address of the miner

        Returns:
            StatusResponse domain model instance

        Raises:
            ValueError: If miner is not found
        """
        # Use client's abstracted method
        await self.client.fault_light_on(ip)
        return StatusResponse(status="success")

    async def fault_light_off(self, ip: str) -> StatusResponse:
        """
        Turn off fault light.

        Args:
            ip: IP address of the miner

        Returns:
            StatusResponse domain model instance

        Raises:
            ValueError: If miner is not found
        """
        # Use client's abstracted method
        await self.client.fault_light_off(ip)
        return StatusResponse(status="success")
