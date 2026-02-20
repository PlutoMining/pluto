"""
Miner discovery service.

Handles scanning for miners and validation operations.
"""

import asyncio
import logging

from app.models import MinerInfo, MinerValidationResult
from app.pyasic_client import MinerClient
from app.services.helpers import process_miner_data

logger = logging.getLogger(__name__)


class MinerDiscoveryService:
    """
    Service for miner discovery and validation operations.

    Handles scanning for miners (single IP or subnet) and validating
    whether IPs are supported miners.
    """

    def __init__(self, client: MinerClient):
        """
        Initialize MinerDiscoveryService.

        Args:
            client: MinerClient implementation
        """
        self.client = client

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
        if not ip and not subnet:
            raise ValueError("Either 'ip' or 'subnet' must be provided")

        miners: list[MinerInfo] = []

        if ip:
            # Single IP scan
            miner = await self.client.get_miner(ip)
            if miner:
                # Use client's abstracted method to get data dict
                try:
                    data_dict = await self.client.get_miner_data_dict(ip)
                    miners.append(await process_miner_data(ip, data_dict))
                except ValueError:
                    # Miner found but data retrieval failed - skip this miner
                    logger.warning(f"Could not retrieve data from miner at {ip}, skipping")
        elif subnet:
            # Network scan
            found_miners = await self.client.scan_subnet(subnet)
            for miner in found_miners:
                miner_ip = self.client.get_miner_ip(miner)
                # Use client's abstracted method to get data dict
                try:
                    data_dict = await self.client.get_miner_data_dict(miner_ip)
                    miners.append(await process_miner_data(miner_ip, data_dict))
                except ValueError:
                    # Miner found but data retrieval failed - skip this miner
                    logger.warning(f"Could not retrieve data from miner at {miner_ip}, skipping")

        return miners

    async def validate_miners(self, ips: list[str]) -> list[MinerValidationResult]:
        """
        Validate multiple IPs to check if they are supported miners.

        Args:
            ips: List of IP addresses to validate

        Returns:
            List of MinerValidationResult objects with validation status for each IP
        """
        async def validate_single_ip(ip: str) -> MinerValidationResult:
            """Validate a single IP address."""
            try:
                miner = await asyncio.wait_for(
                    self.client.get_miner(ip),
                    timeout=3.0,
                )
                if miner:
                    # Get model if available (without full data fetch for speed)
                    model = self.client.get_miner_model(miner)
                    return MinerValidationResult(
                        ip=ip,
                        is_miner=True,
                        model=model,
                    )
                else:
                    return MinerValidationResult(
                        ip=ip,
                        is_miner=False,
                        error="Miner not detected",
                    )
            except TimeoutError:
                return MinerValidationResult(
                    ip=ip,
                    is_miner=False,
                    error="Timeout",
                )
            except Exception as e:
                return MinerValidationResult(
                    ip=ip,
                    is_miner=False,
                    error=str(e),
                )

        # Validate all IPs in parallel
        results = await asyncio.gather(*[validate_single_ip(ip) for ip in ips])
        return list(results)
