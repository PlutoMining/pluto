"""
Miner service for pyasic-bridge.

Provides business logic for miner operations, coordinating between
MinerClient and MinerDataNormalizer.
"""

from typing import Any

from pyasic.config import MinerConfig

from .models import MinerInfo
from .normalization import DefaultMinerDataNormalizer, MinerDataNormalizer
from .pyasic_client import MinerClient, PyasicMinerClient


class MinerService:
    """
    Service class for miner operations.

    Coordinates between MinerClient (for pyasic operations) and
    MinerDataNormalizer (for data transformation) to provide
    high-level miner management operations.
    """

    def __init__(
        self,
        client: MinerClient | None = None,
        normalizer: MinerDataNormalizer | None = None
    ):
        """
        Initialize MinerService with dependencies.

        Args:
            client: MinerClient implementation (defaults to PyasicMinerClient)
            normalizer: MinerDataNormalizer implementation (defaults to DefaultMinerDataNormalizer)
        """
        self.client = client or PyasicMinerClient()
        self.normalizer = normalizer or DefaultMinerDataNormalizer()

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

        miners = []

        if ip:
            # Single IP scan
            miner = await self.client.get_miner(ip)
            if miner:
                data = await miner.get_data()
                # Serialize first to get the dict
                data_dict = data.as_dict() if hasattr(data, "as_dict") else {}

                # Normalize the data
                normalized_data = self.normalizer.normalize(data_dict)

                # Extract hashrate rate for the top-level hashrate field (for backward compatibility)
                normalized_hashrate_rate = (
                    normalized_data['hashrate']['rate']
                    if isinstance(normalized_data.get('hashrate'), dict)
                    else 0.0
                )

                miners.append(MinerInfo(
                    ip=ip,
                    mac=getattr(data, "mac", None),
                    model=getattr(data, "model", None),
                    hostname=getattr(data, "hostname", None),
                    hashrate=normalized_hashrate_rate,
                    data=normalized_data
                ))
        elif subnet:
            # Network scan
            found_miners = await self.client.scan_subnet(subnet)
            for miner in found_miners:
                data = await miner.get_data()
                # Serialize first to get the dict
                data_dict = data.as_dict() if hasattr(data, "as_dict") else {}

                # Normalize the data
                normalized_data = self.normalizer.normalize(data_dict)

                # Extract hashrate rate for the top-level hashrate field (for backward compatibility)
                normalized_hashrate_rate = (
                    normalized_data['hashrate']['rate']
                    if isinstance(normalized_data.get('hashrate'), dict)
                    else 0.0
                )

                miners.append(MinerInfo(
                    ip=miner.ip,
                    mac=getattr(data, "mac", None),
                    model=getattr(data, "model", None),
                    hostname=getattr(data, "hostname", None),
                    hashrate=normalized_hashrate_rate,
                    data=normalized_data
                ))

        return miners

    async def get_miner_data(self, ip: str) -> dict[str, Any]:
        """
        Get normalized data from a specific miner.

        Args:
            ip: IP address of the miner

        Returns:
            Normalized miner data dictionary

        Raises:
            ValueError: If miner is not found
        """
        miner = await self.client.get_miner(ip)
        if not miner:
            raise ValueError(f"Miner not found at {ip}")

        data = await miner.get_data()
        # Serialize first to get the dict
        data_dict = data.as_dict() if hasattr(data, "as_dict") else {}

        # Normalize the data
        return self.normalizer.normalize(data_dict)

    async def get_miner_config(self, ip: str) -> dict[str, Any]:
        """
        Get config from a specific miner.

        Args:
            ip: IP address of the miner

        Returns:
            Miner config dictionary

        Raises:
            ValueError: If miner is not found
        """
        miner = await self.client.get_miner(ip)
        if not miner:
            raise ValueError(f"Miner not found at {ip}")

        config = await miner.get_config()
        return config.as_dict() if hasattr(config, "as_dict") else {}

    async def update_miner_config(self, ip: str, config: dict[str, Any]) -> dict[str, str]:
        """
        Update miner config.

        Args:
            ip: IP address of the miner
            config: Config dictionary to apply

        Returns:
            Success status dictionary

        Raises:
            ValueError: If miner is not found
        """
        miner = await self.client.get_miner(ip)
        if not miner:
            raise ValueError(f"Miner not found at {ip}")

        miner_config = MinerConfig(**config)
        await miner.send_config(miner_config)
        return {"status": "success"}

    async def restart_miner(self, ip: str) -> dict[str, str]:
        """
        Restart a miner.

        Args:
            ip: IP address of the miner

        Returns:
            Success status dictionary

        Raises:
            ValueError: If miner is not found
        """
        miner = await self.client.get_miner(ip)
        if not miner:
            raise ValueError(f"Miner not found at {ip}")

        await miner.reboot()
        return {"status": "success"}

    async def fault_light_on(self, ip: str) -> dict[str, str]:
        """
        Turn on fault light.

        Args:
            ip: IP address of the miner

        Returns:
            Success status dictionary

        Raises:
            ValueError: If miner is not found
        """
        miner = await self.client.get_miner(ip)
        if not miner:
            raise ValueError(f"Miner not found at {ip}")

        await miner.fault_light_on()
        return {"status": "success"}

    async def fault_light_off(self, ip: str) -> dict[str, str]:
        """
        Turn off fault light.

        Args:
            ip: IP address of the miner

        Returns:
            Success status dictionary

        Raises:
            ValueError: If miner is not found
        """
        miner = await self.client.get_miner(ip)
        if not miner:
            raise ValueError(f"Miner not found at {ip}")

        await miner.fault_light_off()
        return {"status": "success"}

    async def get_miner_errors(self, ip: str) -> list[Any]:
        """
        Get miner errors if available.

        Args:
            ip: IP address of the miner

        Returns:
            List of error messages

        Raises:
            ValueError: If miner is not found
        """
        miner = await self.client.get_miner(ip)
        if not miner:
            raise ValueError(f"Miner not found at {ip}")

        errors = await miner.get_errors()
        return errors if errors else []
