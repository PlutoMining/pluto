"""
Unit tests for pyasic_client module.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.pyasic_client import PyasicMinerClient


class TestPyasicMinerClient:
    """Test PyasicMinerClient class."""

    @pytest.mark.asyncio
    @patch('app.pyasic_client.pyasic.get_miner')
    async def test_get_miner_success(self, mock_get_miner):
        """Test getting miner successfully without port."""
        mock_miner = AsyncMock()
        mock_get_miner.return_value = mock_miner

        client = PyasicMinerClient()
        result = await client.get_miner("192.168.1.100")

        assert result is mock_miner
        mock_get_miner.assert_called_once_with("192.168.1.100")

    @pytest.mark.asyncio
    @patch('app.pyasic_client.pyasic.get_miner')
    @patch('app.pyasic_client.pyasic.inspect.signature')
    async def test_get_miner_with_port(self, mock_signature, mock_get_miner):
        """Test getting miner successfully with custom port."""
        mock_miner = AsyncMock()
        mock_get_miner.return_value = mock_miner

        # Mock inspect.signature to return a signature with rpc_port and web_port parameters
        mock_sig = MagicMock()
        mock_sig.parameters = {
            'rpc_port': MagicMock(),
            'web_port': MagicMock(),
        }
        mock_signature.return_value = mock_sig

        client = PyasicMinerClient()
        result = await client.get_miner("host.docker.internal:7751")

        assert result is mock_miner
        mock_get_miner.assert_called_once_with(
            "host.docker.internal",
            rpc_port=7751,
            web_port=7751
        )

    @pytest.mark.asyncio
    @patch('app.pyasic_client.pyasic.get_miner')
    async def test_get_miner_not_found(self, mock_get_miner):
        """Test getting miner when not found."""
        mock_get_miner.return_value = None

        client = PyasicMinerClient()
        result = await client.get_miner("192.168.1.100")

        assert result is None

    @pytest.mark.asyncio
    @patch('app.pyasic_client.pyasic.MinerNetwork')
    async def test_scan_subnet_success(self, mock_network_class):
        """Test scanning subnet successfully."""
        mock_miner1 = AsyncMock()
        mock_miner2 = AsyncMock()
        mock_network = AsyncMock()
        mock_network.scan = AsyncMock(return_value=[mock_miner1, mock_miner2])
        mock_network_class.from_subnet.return_value = mock_network

        client = PyasicMinerClient()
        result = await client.scan_subnet("192.168.1.0/24")

        assert len(result) == 2
        assert result[0] is mock_miner1
        assert result[1] is mock_miner2
        mock_network_class.from_subnet.assert_called_once_with("192.168.1.0/24")
        mock_network.scan.assert_called_once()

    @pytest.mark.asyncio
    @patch('app.pyasic_client.pyasic.MinerNetwork')
    async def test_scan_subnet_empty(self, mock_network_class):
        """Test scanning subnet with no results."""
        mock_network = AsyncMock()
        mock_network.scan = AsyncMock(return_value=[])
        mock_network_class.from_subnet.return_value = mock_network

        client = PyasicMinerClient()
        result = await client.scan_subnet("192.168.1.0/24")

        assert len(result) == 0

    def test_normalize_ip_ipv6_with_port(self):
        """Test _normalize_ip with IPv6 address and port [::1]:8080."""
        client = PyasicMinerClient()
        assert client._normalize_ip("[::1]:8080") == "::1"

    def test_normalize_ip_host_port_returns_host(self):
        """Test _normalize_ip with host:port returns host."""
        client = PyasicMinerClient()
        assert client._normalize_ip("host.docker.internal:7751") == "host.docker.internal"

    def test_normalize_ip_invalid_port_returns_unchanged(self):
        """Test _normalize_ip with colon but invalid port (e.g. IPv6) returns as-is."""
        client = PyasicMinerClient()
        assert client._normalize_ip("2001:db8::1") == "2001:db8::1"

    def test_extract_port_ipv6_with_port(self):
        """Test _extract_port with IPv6 [::1]:8080."""
        client = PyasicMinerClient()
        assert client._extract_port("[::1]:8080") == 8080

    def test_extract_port_invalid_port_returns_none(self):
        """Test _extract_port with non-numeric port returns None."""
        client = PyasicMinerClient()
        assert client._extract_port("host:notaport") is None

    def test_extract_port_ipv6_invalid_port_returns_none(self):
        """Test _extract_port with IPv6 and non-numeric port returns None."""
        client = PyasicMinerClient()
        assert client._extract_port("[::1]:notaport") is None

    @pytest.mark.asyncio
    @patch('app.pyasic_client.pyasic.get_miner')
    @patch('app.pyasic_client.pyasic.inspect.signature')
    async def test_get_miner_with_port_but_no_custom_port_support(self, mock_signature, mock_get_miner):
        """Test get_miner with port when pyasic does not support rpc_port/web_port."""
        mock_miner = AsyncMock()
        mock_get_miner.return_value = mock_miner
        mock_sig = MagicMock()
        mock_sig.parameters = {}  # No rpc_port, web_port
        mock_signature.return_value = mock_sig

        client = PyasicMinerClient()
        result = await client.get_miner("host.docker.internal:7751")

        assert result is mock_miner
        mock_get_miner.assert_called_once_with("host.docker.internal")

    @pytest.mark.asyncio
    @patch('app.pyasic_client.pyasic.get_miner')
    @patch('app.pyasic_client.pyasic.inspect.signature')
    async def test_get_miner_no_port_uses_default_detection(self, mock_signature, mock_get_miner):
        """Test get_miner without port uses pyasic default port detection."""
        mock_miner = AsyncMock()
        mock_get_miner.return_value = mock_miner
        mock_sig = MagicMock()
        mock_sig.parameters = {"rpc_port": MagicMock(), "web_port": MagicMock()}
        mock_signature.return_value = mock_sig

        client = PyasicMinerClient()
        result = await client.get_miner("192.168.1.100")

        assert result is mock_miner
        mock_get_miner.assert_called_once_with("192.168.1.100")

    @pytest.mark.asyncio
    @patch('app.pyasic_client.pyasic.get_miner')
    @patch('app.pyasic_client.pyasic.inspect.signature')
    async def test_get_miner_supports_custom_ports_exception_fallback(self, mock_signature, mock_get_miner):
        """Test get_miner when _supports_custom_ports raises (inspect.signature fails) uses fallback."""
        mock_miner = AsyncMock()
        mock_get_miner.return_value = mock_miner
        mock_signature.side_effect = TypeError("signature() got unexpected argument")

        client = PyasicMinerClient()
        result = await client.get_miner("host.docker.internal:7751")

        assert result is mock_miner
        mock_get_miner.assert_called_once_with("host.docker.internal")
