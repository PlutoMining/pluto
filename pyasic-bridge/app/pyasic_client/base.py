"""
Base protocol for miner clients.
"""

from __future__ import annotations

from typing import Any, Protocol


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

