"""
Base protocol for miner clients.

This protocol abstracts all miner operations, decoupling the service layer
from pyasic-specific implementations. All miner interactions should go
through this protocol.
"""

from __future__ import annotations

from typing import Any, Protocol


class MinerClient(Protocol):
    """
    Protocol defining the interface for miner client operations.

    Implementations should provide async methods for interacting with miners
    via the pyasic library or other backends. This protocol abstracts all
    miner operations to ensure proper decoupling between domain logic and
    the pyasic library.
    """

    async def get_miner(self, ip: str) -> Any:
        """
        Get a miner instance for the given IP address.

        Args:
            ip: IP address of the miner

        Returns:
            Miner instance or None if not found
        """
        ...

    async def scan_subnet(self, subnet: str) -> list[Any]:
        """
        Scan a subnet for miners.

        Args:
            subnet: Subnet CIDR (e.g., "192.168.1.0/24")

        Returns:
            List of miner instances found
        """
        ...

    async def get_miner_data_dict(self, ip: str) -> dict[str, Any]:
        """
        Get raw miner data as a dictionary.

        Args:
            ip: IP address of the miner

        Returns:
            Raw miner data dictionary (from pyasic's get_data().as_dict())

        Raises:
            ValueError: If miner is not found or data cannot be retrieved
        """
        ...

    async def get_miner_config_dict(self, ip: str) -> Any:
        """
        Get miner configuration object.

        Args:
            ip: IP address of the miner

        Returns:
            Miner config object (pyasic MinerConfig or similar)

        Raises:
            ValueError: If miner is not found or config cannot be retrieved
        """
        ...

    async def send_miner_config(self, ip: str, config: Any) -> None:
        """
        Send configuration to a miner.

        Args:
            ip: IP address of the miner
            config: Miner config object (pyasic MinerConfig or similar)

        Raises:
            ValueError: If miner is not found or config cannot be sent
        """
        ...

    async def restart_miner(self, ip: str) -> None:
        """
        Restart a miner.

        Args:
            ip: IP address of the miner

        Raises:
            ValueError: If miner is not found or restart fails
        """
        ...

    async def fault_light_on(self, ip: str) -> None:
        """
        Turn on fault light.

        Args:
            ip: IP address of the miner

        Raises:
            ValueError: If miner is not found or operation fails
        """
        ...

    async def fault_light_off(self, ip: str) -> None:
        """
        Turn off fault light.

        Args:
            ip: IP address of the miner

        Raises:
            ValueError: If miner is not found or operation fails
        """
        ...

    async def get_miner_errors(self, ip: str) -> list[Any]:
        """
        Get miner errors.

        Args:
            ip: IP address of the miner

        Returns:
            List of error objects (pyasic BaseMinerError or similar)

        Raises:
            ValueError: If miner is not found
        """
        ...

    def get_miner_model(self, miner: Any) -> str | None:
        """
        Extract model name from a miner instance.

        Args:
            miner: Miner instance

        Returns:
            Model name or None if not available
        """
        ...

    def get_miner_ip(self, miner: Any) -> str:
        """
        Extract IP address from a miner instance.

        Args:
            miner: Miner instance

        Returns:
            IP address
        """
        ...
