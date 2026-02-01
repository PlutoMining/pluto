"""
Miner service for pyasic-bridge.

Provides business logic for miner operations, coordinating between
MinerClient and MinerDataNormalizer.
"""

import asyncio
import logging
from typing import Any

from pyasic.config import MinerConfig

from app.models import MinerInfo, MinerValidationResult
from app.normalizers import get_normalizer_for_miner
from app.pyasic_client import MinerClient, PyasicMinerClient

logger = logging.getLogger(__name__)


class MinerService:
    """
    Service class for miner operations.

    Coordinates between MinerClient (for pyasic operations) and
    MinerDataNormalizer (for data transformation) to provide
    high-level miner management operations.

    Automatically selects the appropriate normalizer for each miner
    based on miner type detection.
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
                data = await miner.get_data()
                # Serialize first to get the dict
                data_dict = data.as_dict() if hasattr(data, "as_dict") else {}

                # Get appropriate normalizer for this miner
                normalizer = get_normalizer_for_miner(data_dict)
                # Normalize the data
                normalized_data = normalizer.normalize(data_dict)

                # Extract hashrate rate for the top-level hashrate field (for backward compatibility)
                normalized_hashrate_rate = (
                    normalized_data["hashrate"]["rate"]
                    if isinstance(normalized_data.get("hashrate"), dict)
                    else 0.0
                )

                miners.append(
                    MinerInfo(
                        ip=ip,
                        mac=getattr(data, "mac", None),
                        model=getattr(data, "model", None),
                        hostname=getattr(data, "hostname", None),
                        hashrate=normalized_hashrate_rate,
                        data={**normalized_data, "ip": ip},
                    )
                )
        elif subnet:
            # Network scan
            found_miners = await self.client.scan_subnet(subnet)
            for miner in found_miners:
                data = await miner.get_data()
                # Serialize first to get the dict
                data_dict = data.as_dict() if hasattr(data, "as_dict") else {}

                # Get appropriate normalizer for this miner
                normalizer = get_normalizer_for_miner(data_dict)
                # Normalize the data
                normalized_data = normalizer.normalize(data_dict)

                # Extract hashrate rate for the top-level hashrate field (for backward compatibility)
                normalized_hashrate_rate = (
                    normalized_data["hashrate"]["rate"]
                    if isinstance(normalized_data.get("hashrate"), dict)
                    else 0.0
                )

                miners.append(
                    MinerInfo(
                        ip=miner.ip,
                        mac=getattr(data, "mac", None),
                        model=getattr(data, "model", None),
                        hostname=getattr(data, "hostname", None),
                        hashrate=normalized_hashrate_rate,
                        data={**normalized_data, "ip": miner.ip},
                    )
                )

        return miners

    async def get_miner_data(self, ip: str) -> dict[str, Any]:
        """
        Get normalized data from a specific miner.

        Args:
            ip: IP address of the miner

        Returns:
            Normalized miner data dictionary

        Raises:
            ValueError: If miner is not found or not a valid miner
            ConnectionError: If connection to miner fails
            TimeoutError: If request times out
        """
        miner = await self.client.get_miner(ip)
        if not miner:
            raise ValueError(f"Miner not found at {ip}")

        try:
            data = await miner.get_data()
        except Exception as e:
            # Log the full exception details for debugging
            logger.exception(
                f"Error calling get_data() for miner at {ip}. "
                f"Exception type: {type(e).__name__}, "
                f"Exception message: {str(e)}"
            )
            # If get_data() fails, treat it as miner not found/not valid
            # Re-raise as ValueError so API returns 404, not 500
            # Include exception type and message in the error for debugging
            raise ValueError(
                f"Could not retrieve data from miner at {ip}: "
                f"{type(e).__name__}: {str(e)}"
            ) from e

        # Serialize first to get the dict
        data_dict = data.as_dict() if hasattr(data, "as_dict") else {}

        # Log raw data for debugging (especially mac/macAddr fields)
        logger.debug(
            f"Raw miner data dict for {ip} (before normalization): "
            f"has_mac={('mac' in data_dict)}, "
            f"has_macAddr={('macAddr' in data_dict)}, "
            f"mac={data_dict.get('mac')}, "
            f"macAddr={data_dict.get('macAddr')}, "
            f"keys={list(data_dict.keys())[:20]}"
        )

        # Also check if mac is available as an attribute on the data object
        if hasattr(data, "mac"):
            logger.debug(f"Miner data object has .mac attribute: {getattr(data, 'mac', None)}")
        if hasattr(data, "macAddr"):
            logger.debug(f"Miner data object has .macAddr attribute: {getattr(data, 'macAddr', None)}")

        # Get appropriate normalizer for this miner
        normalizer = get_normalizer_for_miner(data_dict)
        # Normalize the data
        return normalizer.normalize(data_dict)

    async def get_miner_data_raw(self, ip: str) -> dict[str, Any]:
        """
        Get raw data from a specific miner without normalization.

        Args:
            ip: IP address of the miner

        Returns:
            Raw miner data dictionary (as returned by pyasic library)

        Raises:
            ValueError: If miner is not found
        """
        miner = await self.client.get_miner(ip)
        if not miner:
            raise ValueError(f"Miner not found at {ip}")

        data = await miner.get_data()
        # Serialize to get the dict without normalization
        return data.as_dict() if hasattr(data, "as_dict") else {}

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
        if not errors:
            return []
        # Serialize to MinerErrorEntry-shaped dicts (pyasic BaseMinerError has at least error_code)
        return [
            e.model_dump() if hasattr(e, "model_dump") else (e if isinstance(e, dict) else {"error_code": 0, "message": str(e)})
            for e in errors
        ]

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
                    model = getattr(miner, "model", None)
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

