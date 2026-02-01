"""
Pyasic-backed miner client implementation.
"""

import inspect
import logging
from typing import Any

from pyasic import get_miner
from pyasic.network import MinerNetwork

logger = logging.getLogger(__name__)


class PyasicMinerClient:
    """
    Implementation of MinerClient using pyasic library.

    Uses pyasic library for all devices including mocks. Supports custom ports
    by extracting port information from IP addresses (e.g., "host.docker.internal:7751")
    and passing them to pyasic's get_miner() via rpc_port and web_port parameters.
    """

    def _normalize_ip(self, ip: str) -> str:
        """
        Normalize IP address by removing port if present.

        Extracts the host/IP portion from an address that may include a port.
        The port is extracted separately and passed to pyasic via rpc_port/web_port.

        Args:
            ip: IP address or hostname, potentially with port (e.g., "host.docker.internal:7751")

        Returns:
            IP address or hostname without port (e.g., "host.docker.internal")
        """
        # Handle IPv6 addresses with ports: [::1]:8080
        if ip.startswith('[') and ']:' in ip:
            # Extract IPv6 address from [::1]:8080 format
            end_bracket = ip.index(']:')
            return ip[1:end_bracket]

        # Handle regular host:port format
        if ':' in ip:
            # Split on ':' but be careful with IPv6 addresses
            # For IPv6, colons are part of the address, so we only split on the last ':'
            # which should be the port separator
            parts = ip.rsplit(':', 1)
            if len(parts) == 2:
                # If the part before the last colon ends with ':', it's IPv6 (e.g. 2001:db8::1 -> parts[0]='2001:db8:')
                if parts[0].endswith(':'):
                    return ip
                try:
                    port = int(parts[1])
                    if 0 < port <= 65535:
                        # It's a port, return just the host part
                        return parts[0]
                except ValueError:
                    # Not a valid port number, might be part of IPv6 address
                    pass

        # No port found, return as-is
        return ip

    def _extract_port(self, ip: str) -> int | None:
        """
        Extract port number from IP address string.

        Args:
            ip: IP address or hostname, potentially with port (e.g., "host.docker.internal:7751")

        Returns:
            Port number if found, None otherwise
        """
        # Handle IPv6 addresses with ports: [::1]:8080
        if ip.startswith('[') and ']:' in ip:
            end_bracket = ip.index(']:')
            port_str = ip[end_bracket + 2:]
            try:
                return int(port_str)
            except ValueError:
                return None

        # Handle regular host:port format
        if ':' in ip:
            parts = ip.rsplit(':', 1)
            if len(parts) == 2:
                try:
                    port = int(parts[1])
                    if 0 < port <= 65535:
                        return port
                except ValueError:
                    pass

        return None

    def _supports_custom_ports(self) -> bool:
        """
        Check if pyasic's get_miner() supports rpc_port and web_port parameters.

        Returns:
            True if custom ports are supported, False otherwise
        """
        try:
            sig = inspect.signature(get_miner)
            return 'rpc_port' in sig.parameters and 'web_port' in sig.parameters
        except Exception:
            return False

    async def get_miner(self, ip: str) -> Any:
        """
        Get a miner instance for the given IP address using pyasic library.

        Args:
            ip: IP address of the miner (may include port, e.g., "host.docker.internal:7751")

        Returns:
            Miner instance or None if not found
        """
        # Extract port before normalizing
        port = self._extract_port(ip)

        # Normalize IP by removing port if present
        normalized_ip = self._normalize_ip(ip)

        # Check if pyasic supports custom ports
        supports_custom_ports = self._supports_custom_ports()

        if port is not None:
            if supports_custom_ports:
                logger.debug(
                    f"Extracted port {port} from IP '{ip}', using '{normalized_ip}' "
                    f"with rpc_port={port} and web_port={port}"
                )
                # For mock devices, RPC and web are typically on the same port
                # Pass both ports to pyasic's get_miner()
                miner = await get_miner(
                    normalized_ip,
                    rpc_port=port,
                    web_port=port
                )
            else:
                logger.warning(
                    f"Extracted port {port} from IP '{ip}', but pyasic version doesn't support "
                    f"custom ports. Using '{normalized_ip}' with default ports. "
                    f"Please rebuild pyasic-bridge container with updated pyasic library."
                )
                # Fallback: try without port (will likely fail for mock devices)
                miner = await get_miner(normalized_ip)
        else:
            logger.debug(f"IP address '{ip}' has no port, using pyasic default port detection")
            # No custom port specified, let pyasic use its default port detection
            miner = await get_miner(normalized_ip)

        return miner

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

