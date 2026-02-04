"""
Miner service for pyasic-bridge.

Facade service that composes focused services for miner operations.
This maintains backward compatibility while using properly separated services.
"""

import logging
from typing import Any

from app.models import (
    MinerConfigModel,
    MinerData,
    MinerDataRaw,
    MinerErrorEntry,
    MinerInfo,
    MinerValidationResult,
    StatusResponse,
)
from app.pyasic_client import MinerClient, PyasicMinerClient
from app.services.config_service import MinerConfigService
from app.services.control_service import MinerControlService
from app.services.data_service import MinerDataService
from app.services.discovery_service import MinerDiscoveryService
from app.services.error_service import MinerErrorService

logger = logging.getLogger(__name__)


class MinerService:
    """
    Facade service for miner operations.

    Composes focused services (Discovery, Data, Config, Control, Error)
    to provide a unified interface while maintaining proper separation
    of concerns. This maintains backward compatibility with existing API code.
    """

    def __init__(
        self,
        client: MinerClient | None = None
    ):
        """
        Initialize MinerService with dependencies.

        Args:
            client: MinerClient implementation (defaults to PyasicMinerClient)
        """
        self.client = client or PyasicMinerClient()

        # Initialize focused services
        self.discovery = MinerDiscoveryService(self.client)
        self.data = MinerDataService(self.client)
        self.config = MinerConfigService(self.client)
        self.control = MinerControlService(self.client)
        self.errors = MinerErrorService(self.client)

    async def scan_miners(
        self,
        ip: str | None = None,
        subnet: str | None = None
    ) -> list[MinerInfo]:
        """
        Scan for miners using either a single IP or a subnet.

        Args:
            ip: Single IP address to scan
            subnet: Subnet CIDR to scan

        Returns:
            List of MinerInfo objects

        Raises:
            ValueError: If neither ip nor subnet is provided
        """
        return await self.discovery.scan_miners(ip=ip, subnet=subnet)

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
        return await self.data.get_miner_data(ip)

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
        return await self.data.get_miner_data_raw(ip)

    async def get_miner_config(self, ip: str) -> MinerConfigModel:
        """
        Get config from a specific miner.

        Args:
            ip: IP address of the miner

        Returns:
            MinerConfigModel domain model instance

        Raises:
            ValueError: If miner is not found
        """
        return await self.config.get_miner_config(ip)

    async def update_miner_config(self, ip: str, config: dict[str, Any]) -> StatusResponse:
        """
        Update miner config.

        Args:
            ip: IP address of the miner
            config: Config dictionary to apply

        Returns:
            StatusResponse domain model instance

        Raises:
            ValueError: If miner is not found
        """
        return await self.config.update_miner_config(ip, config)

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
        return await self.control.restart_miner(ip)

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
        return await self.control.fault_light_on(ip)

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
        return await self.control.fault_light_off(ip)

    async def get_miner_errors(self, ip: str) -> list[MinerErrorEntry]:
        """
        Get miner errors if available.

        Args:
            ip: IP address of the miner

        Returns:
            List of MinerErrorEntry domain model instances

        Raises:
            ValueError: If miner is not found
        """
        return await self.errors.get_miner_errors(ip)

    async def validate_miners(self, ips: list[str]) -> list[MinerValidationResult]:
        """
        Validate multiple IPs to check if they are supported miners.

        Args:
            ips: List of IP addresses to validate

        Returns:
            List of MinerValidationResult objects with validation status for each IP
        """
        return await self.discovery.validate_miners(ips)

