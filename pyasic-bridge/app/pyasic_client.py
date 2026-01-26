"""
Miner client abstraction for pyasic-bridge.

Provides an abstraction layer over pyasic library operations to enable
dependency injection and testing.
"""

from typing import Any, Protocol

from pyasic import get_miner
from pyasic.network import MinerNetwork


class MinerClient(Protocol):
    """
    Protocol defining the interface for miner client operations.

    Implementations should provide async methods for interacting with miners
    via the pyasic library or other backends.
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


class PyasicMinerClient:
    """
    Default implementation of MinerClient using pyasic library.

    Wraps pyasic.get_miner and MinerNetwork operations to provide
    a clean async interface.
    """

    async def get_miner(self, ip: str) -> Any:
        """
        Get a miner instance for the given IP address.

        Args:
            ip: IP address of the miner

        Returns:
            Miner instance or None if not found
        """
        return await get_miner(ip)

    async def scan_subnet(self, subnet: str) -> list[Any]:
        """
        Scan a subnet for miners.

        Args:
            subnet: Subnet CIDR (e.g., "192.168.1.0/24")

        Returns:
            List of miner instances found
        """
        network = MinerNetwork.from_subnet(subnet)
        return await network.scan()
