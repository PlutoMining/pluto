"""
Unit tests for services module.
"""

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models import MinerInfo
from app.services import MinerService


class MockMinerClient:
    """Mock MinerClient for testing."""

    def __init__(self):
        self.miners = {}
        self.scan_results = []

    async def get_miner(self, ip: str):
        """Get mock miner."""
        return self.miners.get(ip)

    async def scan_subnet(self, subnet: str):
        """Get mock scan results."""
        return self.scan_results


class MockMiner:
    """Mock miner object."""

    def __init__(self, ip: str, data_dict: dict):
        self.ip = ip
        self._data_dict = data_dict
        self.mac = data_dict.get("mac")
        self.model = data_dict.get("model")
        self.hostname = data_dict.get("hostname")

    async def get_data(self):
        """Get mock data."""
        data = MagicMock()
        data.as_dict = MagicMock(return_value=self._data_dict)
        data.mac = self.mac
        data.model = self.model
        data.hostname = self.hostname
        return data

    async def get_config(self):
        """Get mock config."""
        config = MagicMock()
        config.as_dict = MagicMock(return_value={"pool": "stratum+tcp://pool.example.com:3333"})
        return config

    async def send_config(self, config):
        """Mock send config."""
        pass

    async def reboot(self):
        """Mock reboot."""
        pass

    async def fault_light_on(self):
        """Mock fault light on."""
        pass

    async def fault_light_off(self):
        """Mock fault light off."""
        pass

    async def get_errors(self):
        """Get mock errors."""
        return []


class MockNormalizer:
    """Mock normalizer for testing."""

    def __init__(self, normalize_func=None):
        self.normalize_func = normalize_func or (lambda x: x.copy())

    def normalize(self, data):
        """Normalize data."""
        return self.normalize_func(data)


class TestMinerService:
    """Test MinerService class."""

    def test_init_defaults(self):
        """Test initialization with defaults."""
        service = MinerService()
        assert service.client is not None

    def test_init_with_client(self):
        """Test initialization with provided client."""
        client = MockMinerClient()
        service = MinerService(client=client)
        assert service.client is client

    @pytest.mark.asyncio
    async def test_scan_miners_single_ip_found(self):
        """Test scanning single IP when miner is found."""
        client = MockMinerClient()

        data_dict = {
            "hashrate": {"rate": 1.0, "unit": {"value": 1000000000, "suffix": "GH/s"}},
            "mac": "00:11:22:33:44:55",
            "model": "TestMiner",
            "hostname": "test-miner",
            "wattage": 50.0,
            "efficiency": 20.0
        }
        miner = MockMiner("192.168.1.100", data_dict)
        client.miners["192.168.1.100"] = miner

        service = MinerService(client=client)
        result = await service.scan_miners(ip="192.168.1.100")

        assert len(result) == 1
        assert isinstance(result[0], MinerInfo)
        assert result[0].ip == "192.168.1.100"
        assert result[0].mac == "00:11:22:33:44:55"
        assert result[0].model == "TestMiner"
        assert result[0].hostname == "test-miner"

    @pytest.mark.asyncio
    async def test_scan_miners_single_ip_not_found(self):
        """Test scanning single IP when miner is not found."""
        client = MockMinerClient()
        service = MinerService(client=client)

        result = await service.scan_miners(ip="192.168.1.100")

        assert len(result) == 0

    @pytest.mark.asyncio
    async def test_scan_miners_subnet(self):
        """Test scanning subnet."""
        client = MockMinerClient()

        data_dict1 = {
            "hashrate": {"rate": 1.0, "unit": {"value": 1000000000, "suffix": "GH/s"}},
            "mac": "00:11:22:33:44:55",
            "model": "TestMiner1",
            "hostname": "test-miner-1"
        }
        data_dict2 = {
            "hashrate": {"rate": 2.0, "unit": {"value": 1000000000, "suffix": "GH/s"}},
            "mac": "00:11:22:33:44:56",
            "model": "TestMiner2",
            "hostname": "test-miner-2"
        }

        miner1 = MockMiner("192.168.1.100", data_dict1)
        miner2 = MockMiner("192.168.1.101", data_dict2)
        client.scan_results = [miner1, miner2]

        service = MinerService(client=client)
        result = await service.scan_miners(subnet="192.168.1.0/24")

        assert len(result) == 2
        assert result[0].ip == "192.168.1.100"
        assert result[1].ip == "192.168.1.101"

    @pytest.mark.asyncio
    async def test_scan_miners_no_ip_or_subnet(self):
        """Test scanning without IP or subnet raises ValueError."""
        service = MinerService()

        with pytest.raises(ValueError, match="Either 'ip' or 'subnet' must be provided"):
            await service.scan_miners()

    @pytest.mark.asyncio
    async def test_get_miner_data_success(self):
        """Test getting miner data successfully."""
        client = MockMinerClient()

        data_dict = {
            "hashrate": {"rate": 1.0, "unit": {"value": 1000000000, "suffix": "GH/s"}},
            "wattage": 50.0,
            "efficiency": 20.0
        }
        miner = MockMiner("192.168.1.100", data_dict)
        client.miners["192.168.1.100"] = miner

        service = MinerService(client=client)
        result = await service.get_miner_data("192.168.1.100")

        assert "hashrate" in result
        assert isinstance(result["hashrate"], dict)

    @pytest.mark.asyncio
    async def test_get_miner_data_not_found(self):
        """Test getting miner data when miner not found."""
        client = MockMinerClient()
        service = MinerService(client=client)

        with pytest.raises(ValueError, match="Miner not found"):
            await service.get_miner_data("192.168.1.100")

    @pytest.mark.asyncio
    async def test_get_miner_config_success(self):
        """Test getting miner config successfully."""
        client = MockMinerClient()
        data_dict = {}
        miner = MockMiner("192.168.1.100", data_dict)
        client.miners["192.168.1.100"] = miner

        service = MinerService(client=client)
        result = await service.get_miner_config("192.168.1.100")

        assert "pool" in result

    @pytest.mark.asyncio
    async def test_get_miner_config_not_found(self):
        """Test getting miner config when miner not found."""
        client = MockMinerClient()
        service = MinerService(client=client)

        with pytest.raises(ValueError, match="Miner not found"):
            await service.get_miner_config("192.168.1.100")

    @pytest.mark.asyncio
    async def test_update_miner_config_success(self):
        """Test updating miner config successfully."""
        client = MockMinerClient()
        data_dict = {}
        miner = MockMiner("192.168.1.100", data_dict)
        client.miners["192.168.1.100"] = miner

        service = MinerService(client=client)
        result = await service.update_miner_config("192.168.1.100", {"pool": "stratum+tcp://pool.example.com:3333"})

        assert result["status"] == "success"

    @pytest.mark.asyncio
    async def test_update_miner_config_not_found(self):
        """Test updating miner config when miner not found."""
        client = MockMinerClient()
        service = MinerService(client=client)

        with pytest.raises(ValueError, match="Miner not found"):
            await service.update_miner_config("192.168.1.100", {})

    @pytest.mark.asyncio
    async def test_restart_miner_success(self):
        """Test restarting miner successfully."""
        client = MockMinerClient()
        data_dict = {}
        miner = MockMiner("192.168.1.100", data_dict)
        client.miners["192.168.1.100"] = miner

        service = MinerService(client=client)
        result = await service.restart_miner("192.168.1.100")

        assert result["status"] == "success"

    @pytest.mark.asyncio
    async def test_restart_miner_not_found(self):
        """Test restarting miner when not found."""
        client = MockMinerClient()
        service = MinerService(client=client)

        with pytest.raises(ValueError, match="Miner not found"):
            await service.restart_miner("192.168.1.100")

    @pytest.mark.asyncio
    async def test_fault_light_on_success(self):
        """Test turning fault light on successfully."""
        client = MockMinerClient()
        data_dict = {}
        miner = MockMiner("192.168.1.100", data_dict)
        client.miners["192.168.1.100"] = miner

        service = MinerService(client=client)
        result = await service.fault_light_on("192.168.1.100")

        assert result["status"] == "success"

    @pytest.mark.asyncio
    async def test_fault_light_on_not_found(self):
        """Test turning fault light on when miner not found."""
        client = MockMinerClient()
        service = MinerService(client=client)

        with pytest.raises(ValueError, match="Miner not found"):
            await service.fault_light_on("192.168.1.100")

    @pytest.mark.asyncio
    async def test_fault_light_off_success(self):
        """Test turning fault light off successfully."""
        client = MockMinerClient()
        data_dict = {}
        miner = MockMiner("192.168.1.100", data_dict)
        client.miners["192.168.1.100"] = miner

        service = MinerService(client=client)
        result = await service.fault_light_off("192.168.1.100")

        assert result["status"] == "success"

    @pytest.mark.asyncio
    async def test_fault_light_off_not_found(self):
        """Test turning fault light off when miner not found."""
        client = MockMinerClient()
        service = MinerService(client=client)

        with pytest.raises(ValueError, match="Miner not found"):
            await service.fault_light_off("192.168.1.100")

    @pytest.mark.asyncio
    async def test_get_miner_errors_success(self):
        """Test getting miner errors successfully."""
        client = MockMinerClient()
        data_dict = {}
        miner = MockMiner("192.168.1.100", data_dict)
        miner.get_errors = AsyncMock(return_value=["Error 1", "Error 2"])
        client.miners["192.168.1.100"] = miner

        service = MinerService(client=client)
        result = await service.get_miner_errors("192.168.1.100")

        assert isinstance(result, list)
        assert len(result) == 2

    @pytest.mark.asyncio
    async def test_get_miner_errors_empty(self):
        """Test getting miner errors when empty."""
        client = MockMinerClient()
        data_dict = {}
        miner = MockMiner("192.168.1.100", data_dict)
        miner.get_errors = AsyncMock(return_value=None)
        client.miners["192.168.1.100"] = miner

        service = MinerService(client=client)
        result = await service.get_miner_errors("192.168.1.100")

        assert result == []

    @pytest.mark.asyncio
    async def test_get_miner_errors_not_found(self):
        """Test getting miner errors when miner not found."""
        client = MockMinerClient()
        service = MinerService(client=client)

        with pytest.raises(ValueError, match="Miner not found"):
            await service.get_miner_errors("192.168.1.100")

    @pytest.mark.asyncio
    async def test_scan_miners_with_normalizer(self):
        """Test scanning with custom normalizer."""
        client = MockMinerClient()

        data_dict = {
            "hashrate": {"rate": 1.0, "unit": {"value": 1000000000, "suffix": "GH/s"}},
            "mac": "00:11:22:33:44:55",
            "model": "TestMiner",
            "hostname": "test-miner"
        }
        miner = MockMiner("192.168.1.100", data_dict)
        client.miners["192.168.1.100"] = miner

        service = MinerService(client=client)
        result = await service.scan_miners(ip="192.168.1.100")

        assert len(result) == 1
        # Normalizer is now selected automatically, so we just verify normalization occurred
        assert "hashrate" in result[0].data
        assert isinstance(result[0].data["hashrate"], dict)
