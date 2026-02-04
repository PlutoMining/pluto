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

    def test_normalize_ip_value_error_handling(self):
        """Test _normalize_ip handles ValueError when port is not numeric."""
        client = PyasicMinerClient()
        # IPv6 address that ends with colon but port is not numeric
        result = client._normalize_ip("2001:db8::1:invalid")
        # Should return as-is when ValueError is raised
        assert result == "2001:db8::1:invalid"

    def test_normalize_ip_ipv6_ends_with_colon(self):
        """Test _normalize_ip with IPv6 address ending with colon."""
        client = PyasicMinerClient()
        # IPv6 address ending with colon (not a port)
        result = client._normalize_ip("2001:db8::1:")
        assert result == "2001:db8::1:"

    @pytest.mark.asyncio
    @patch('app.pyasic_client.pyasic.get_miner')
    async def test_get_miner_data_dict_success(self, mock_get_miner):
        """Test get_miner_data_dict successfully retrieves data."""
        mock_miner = AsyncMock()
        mock_data = MagicMock()
        mock_data.as_dict = MagicMock(return_value={"hashrate": 1.0})
        mock_miner.get_data = AsyncMock(return_value=mock_data)
        mock_get_miner.return_value = mock_miner

        client = PyasicMinerClient()
        result = await client.get_miner_data_dict("192.168.1.100")

        assert result == {"hashrate": 1.0}
        mock_miner.get_data.assert_called_once()

    @pytest.mark.asyncio
    @patch('app.pyasic_client.pyasic.get_miner')
    async def test_get_miner_data_dict_not_found(self, mock_get_miner):
        """Test get_miner_data_dict raises ValueError when miner not found."""
        mock_get_miner.return_value = None

        client = PyasicMinerClient()
        with pytest.raises(ValueError, match="Miner not found"):
            await client.get_miner_data_dict("192.168.1.100")

    @pytest.mark.asyncio
    @patch('app.pyasic_client.pyasic.get_miner')
    async def test_get_miner_data_dict_exception(self, mock_get_miner):
        """Test get_miner_data_dict raises ValueError when get_data raises."""
        mock_miner = AsyncMock()
        mock_miner.get_data = AsyncMock(side_effect=RuntimeError("Connection failed"))
        mock_get_miner.return_value = mock_miner

        client = PyasicMinerClient()
        with pytest.raises(ValueError, match="Could not retrieve data"):
            await client.get_miner_data_dict("192.168.1.100")

    @pytest.mark.asyncio
    @patch('app.pyasic_client.pyasic.get_miner')
    async def test_get_miner_data_dict_no_as_dict(self, mock_get_miner):
        """Test get_miner_data_dict returns empty dict when data has no as_dict."""
        mock_miner = AsyncMock()
        mock_data = MagicMock()
        del mock_data.as_dict  # Remove as_dict attribute
        mock_miner.get_data = AsyncMock(return_value=mock_data)
        mock_get_miner.return_value = mock_miner

        client = PyasicMinerClient()
        result = await client.get_miner_data_dict("192.168.1.100")

        assert result == {}

    @pytest.mark.asyncio
    @patch('app.pyasic_client.pyasic.get_miner')
    async def test_get_miner_config_dict_success(self, mock_get_miner):
        """Test get_miner_config_dict successfully retrieves config."""
        mock_miner = AsyncMock()
        mock_config = MagicMock()
        mock_miner.get_config = AsyncMock(return_value=mock_config)
        mock_get_miner.return_value = mock_miner

        client = PyasicMinerClient()
        result = await client.get_miner_config_dict("192.168.1.100")

        assert result is mock_config

    @pytest.mark.asyncio
    @patch('app.pyasic_client.pyasic.get_miner')
    async def test_get_miner_config_dict_not_found(self, mock_get_miner):
        """Test get_miner_config_dict raises ValueError when miner not found."""
        mock_get_miner.return_value = None

        client = PyasicMinerClient()
        with pytest.raises(ValueError, match="Miner not found"):
            await client.get_miner_config_dict("192.168.1.100")

    @pytest.mark.asyncio
    @patch('app.pyasic_client.pyasic.get_miner')
    async def test_get_miner_config_dict_exception(self, mock_get_miner):
        """Test get_miner_config_dict raises ValueError when get_config raises."""
        mock_miner = AsyncMock()
        mock_miner.get_config = AsyncMock(side_effect=RuntimeError("Config failed"))
        mock_get_miner.return_value = mock_miner

        client = PyasicMinerClient()
        with pytest.raises(ValueError, match="Could not retrieve config"):
            await client.get_miner_config_dict("192.168.1.100")

    @pytest.mark.asyncio
    @patch('app.pyasic_client.pyasic.get_miner')
    async def test_send_miner_config_success(self, mock_get_miner):
        """Test send_miner_config successfully sends config."""
        mock_miner = AsyncMock()
        mock_miner.send_config = AsyncMock()
        mock_get_miner.return_value = mock_miner
        mock_config = MagicMock()

        client = PyasicMinerClient()
        await client.send_miner_config("192.168.1.100", mock_config)

        mock_miner.send_config.assert_called_once_with(mock_config)

    @pytest.mark.asyncio
    @patch('app.pyasic_client.pyasic.get_miner')
    async def test_send_miner_config_not_found(self, mock_get_miner):
        """Test send_miner_config raises ValueError when miner not found."""
        mock_get_miner.return_value = None

        client = PyasicMinerClient()
        with pytest.raises(ValueError, match="Miner not found"):
            await client.send_miner_config("192.168.1.100", MagicMock())

    @pytest.mark.asyncio
    @patch('app.pyasic_client.pyasic.get_miner')
    async def test_send_miner_config_exception(self, mock_get_miner):
        """Test send_miner_config raises ValueError when send_config raises."""
        mock_miner = AsyncMock()
        mock_miner.send_config = AsyncMock(side_effect=RuntimeError("Send failed"))
        mock_get_miner.return_value = mock_miner

        client = PyasicMinerClient()
        with pytest.raises(ValueError, match="Could not send config"):
            await client.send_miner_config("192.168.1.100", MagicMock())

    @pytest.mark.asyncio
    @patch('app.pyasic_client.pyasic.get_miner')
    async def test_restart_miner_success(self, mock_get_miner):
        """Test restart_miner successfully restarts miner."""
        mock_miner = AsyncMock()
        mock_miner.reboot = AsyncMock()
        mock_get_miner.return_value = mock_miner

        client = PyasicMinerClient()
        await client.restart_miner("192.168.1.100")

        mock_miner.reboot.assert_called_once()

    @pytest.mark.asyncio
    @patch('app.pyasic_client.pyasic.get_miner')
    async def test_restart_miner_not_found(self, mock_get_miner):
        """Test restart_miner raises ValueError when miner not found."""
        mock_get_miner.return_value = None

        client = PyasicMinerClient()
        with pytest.raises(ValueError, match="Miner not found"):
            await client.restart_miner("192.168.1.100")

    @pytest.mark.asyncio
    @patch('app.pyasic_client.pyasic.get_miner')
    async def test_restart_miner_exception(self, mock_get_miner):
        """Test restart_miner raises ValueError when reboot raises."""
        mock_miner = AsyncMock()
        mock_miner.reboot = AsyncMock(side_effect=RuntimeError("Reboot failed"))
        mock_get_miner.return_value = mock_miner

        client = PyasicMinerClient()
        with pytest.raises(ValueError, match="Could not restart miner"):
            await client.restart_miner("192.168.1.100")

    @pytest.mark.asyncio
    @patch('app.pyasic_client.pyasic.get_miner')
    async def test_fault_light_on_success(self, mock_get_miner):
        """Test fault_light_on successfully turns on fault light."""
        mock_miner = AsyncMock()
        mock_miner.fault_light_on = AsyncMock()
        mock_get_miner.return_value = mock_miner

        client = PyasicMinerClient()
        await client.fault_light_on("192.168.1.100")

        mock_miner.fault_light_on.assert_called_once()

    @pytest.mark.asyncio
    @patch('app.pyasic_client.pyasic.get_miner')
    async def test_fault_light_on_not_found(self, mock_get_miner):
        """Test fault_light_on raises ValueError when miner not found."""
        mock_get_miner.return_value = None

        client = PyasicMinerClient()
        with pytest.raises(ValueError, match="Miner not found"):
            await client.fault_light_on("192.168.1.100")

    @pytest.mark.asyncio
    @patch('app.pyasic_client.pyasic.get_miner')
    async def test_fault_light_on_exception(self, mock_get_miner):
        """Test fault_light_on raises ValueError when operation raises."""
        mock_miner = AsyncMock()
        mock_miner.fault_light_on = AsyncMock(side_effect=RuntimeError("Fault light failed"))
        mock_get_miner.return_value = mock_miner

        client = PyasicMinerClient()
        with pytest.raises(ValueError, match="Could not turn on fault light"):
            await client.fault_light_on("192.168.1.100")

    @pytest.mark.asyncio
    @patch('app.pyasic_client.pyasic.get_miner')
    async def test_fault_light_off_success(self, mock_get_miner):
        """Test fault_light_off successfully turns off fault light."""
        mock_miner = AsyncMock()
        mock_miner.fault_light_off = AsyncMock()
        mock_get_miner.return_value = mock_miner

        client = PyasicMinerClient()
        await client.fault_light_off("192.168.1.100")

        mock_miner.fault_light_off.assert_called_once()

    @pytest.mark.asyncio
    @patch('app.pyasic_client.pyasic.get_miner')
    async def test_fault_light_off_not_found(self, mock_get_miner):
        """Test fault_light_off raises ValueError when miner not found."""
        mock_get_miner.return_value = None

        client = PyasicMinerClient()
        with pytest.raises(ValueError, match="Miner not found"):
            await client.fault_light_off("192.168.1.100")

    @pytest.mark.asyncio
    @patch('app.pyasic_client.pyasic.get_miner')
    async def test_fault_light_off_exception(self, mock_get_miner):
        """Test fault_light_off raises ValueError when operation raises."""
        mock_miner = AsyncMock()
        mock_miner.fault_light_off = AsyncMock(side_effect=RuntimeError("Fault light failed"))
        mock_get_miner.return_value = mock_miner

        client = PyasicMinerClient()
        with pytest.raises(ValueError, match="Could not turn off fault light"):
            await client.fault_light_off("192.168.1.100")

    @pytest.mark.asyncio
    @patch('app.pyasic_client.pyasic.get_miner')
    async def test_get_miner_errors_success(self, mock_get_miner):
        """Test get_miner_errors successfully retrieves errors."""
        mock_miner = AsyncMock()
        mock_errors = [MagicMock(), MagicMock()]
        mock_miner.get_errors = AsyncMock(return_value=mock_errors)
        mock_get_miner.return_value = mock_miner

        client = PyasicMinerClient()
        result = await client.get_miner_errors("192.168.1.100")

        assert result == mock_errors

    @pytest.mark.asyncio
    @patch('app.pyasic_client.pyasic.get_miner')
    async def test_get_miner_errors_empty(self, mock_get_miner):
        """Test get_miner_errors returns empty list when errors is None."""
        mock_miner = AsyncMock()
        mock_miner.get_errors = AsyncMock(return_value=None)
        mock_get_miner.return_value = mock_miner

        client = PyasicMinerClient()
        result = await client.get_miner_errors("192.168.1.100")

        assert result == []

    @pytest.mark.asyncio
    @patch('app.pyasic_client.pyasic.get_miner')
    async def test_get_miner_errors_not_found(self, mock_get_miner):
        """Test get_miner_errors raises ValueError when miner not found."""
        mock_get_miner.return_value = None

        client = PyasicMinerClient()
        with pytest.raises(ValueError, match="Miner not found"):
            await client.get_miner_errors("192.168.1.100")

    @pytest.mark.asyncio
    @patch('app.pyasic_client.pyasic.get_miner')
    async def test_get_miner_errors_exception(self, mock_get_miner):
        """Test get_miner_errors raises ValueError when get_errors raises."""
        mock_miner = AsyncMock()
        mock_miner.get_errors = AsyncMock(side_effect=RuntimeError("Get errors failed"))
        mock_get_miner.return_value = mock_miner

        client = PyasicMinerClient()
        with pytest.raises(ValueError, match="Could not retrieve errors"):
            await client.get_miner_errors("192.168.1.100")

    def test_get_miner_model_with_model(self):
        """Test get_miner_model returns model when present."""
        mock_miner = MagicMock()
        mock_miner.model = "BitAxe Gamma"

        client = PyasicMinerClient()
        result = client.get_miner_model(mock_miner)

        assert result == "BitAxe Gamma"

    def test_get_miner_model_without_model(self):
        """Test get_miner_model returns None when model not present."""
        mock_miner = MagicMock()
        del mock_miner.model  # Remove model attribute

        client = PyasicMinerClient()
        result = client.get_miner_model(mock_miner)

        assert result is None

    def test_get_miner_ip_with_ip(self):
        """Test get_miner_ip returns IP when present."""
        mock_miner = MagicMock()
        mock_miner.ip = "192.168.1.100"

        client = PyasicMinerClient()
        result = client.get_miner_ip(mock_miner)

        assert result == "192.168.1.100"

    def test_get_miner_ip_without_ip(self):
        """Test get_miner_ip returns empty string when IP not present."""
        mock_miner = MagicMock()
        del mock_miner.ip  # Remove ip attribute

        client = PyasicMinerClient()
        result = client.get_miner_ip(mock_miner)

        assert result == ""
