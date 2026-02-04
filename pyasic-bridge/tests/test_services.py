"""
Unit tests for services module.
"""

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models import MinerInfo
from app.services import MinerService
from app.validators import ConfigValidationError, ExtraConfigNotAvailableError


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

    async def get_miner_data_dict(self, ip: str):
        """Get mock miner data as dict."""
        miner = self.miners.get(ip)
        if not miner:
            raise ValueError(f"Miner not found at {ip}")
        try:
            data = await miner.get_data()
            if hasattr(data, "as_dict"):
                return data.as_dict()
            return {}
        except Exception as e:
            raise ValueError(f"Could not retrieve data from miner at {ip}: {str(e)}") from e

    def get_miner_ip(self, miner):
        """Get IP from miner object."""
        return miner.ip

    async def get_miner_config_dict(self, ip: str):
        """Get mock miner config."""
        miner = self.miners.get(ip)
        if not miner:
            raise ValueError(f"Miner not found at {ip}")
        return await miner.get_config()

    async def send_miner_config(self, ip: str, config):
        """Send config to miner."""
        miner = self.miners.get(ip)
        if not miner:
            raise ValueError(f"Miner not found at {ip}")
        await miner.send_config(config)

    async def restart_miner(self, ip: str):
        """Restart miner."""
        miner = self.miners.get(ip)
        if not miner:
            raise ValueError(f"Miner not found at {ip}")
        await miner.reboot()

    async def fault_light_on(self, ip: str):
        """Turn fault light on."""
        miner = self.miners.get(ip)
        if not miner:
            raise ValueError(f"Miner not found at {ip}")
        await miner.fault_light_on()

    async def fault_light_off(self, ip: str):
        """Turn fault light off."""
        miner = self.miners.get(ip)
        if not miner:
            raise ValueError(f"Miner not found at {ip}")
        await miner.fault_light_off()

    async def get_miner_errors(self, ip: str):
        """Get miner errors."""
        miner = self.miners.get(ip)
        if not miner:
            raise ValueError(f"Miner not found at {ip}")
        return await miner.get_errors()

    def get_miner_model(self, miner):
        """Get model from miner object."""
        return getattr(miner, "model", None)


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
        # Default: miner exposes an extra_config object so updates are allowed.
        class DefaultConfig:
            def __init__(self) -> None:
                self.pools = None
                self.fan_mode = None
                # Provide a simple mining_mode object with a valid string mode.
                self.mining_mode = type("MiningMode", (), {"mode": "normal"})()
                # Dummy extra_config object with the attributes our mappers
                # inspect (model_fields / __annotations__).
                class ExtraCfg:
                    model_fields: list[str] = []
                    __annotations__: dict[str, type] = {}

                    def __init__(self, **kwargs) -> None:
                        for k, v in kwargs.items():
                            setattr(self, k, v)

                self.extra_config = ExtraCfg()
                self.temperature = None

        return DefaultConfig()

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
        # Also store in miners dict so get_miner_data_dict can find them
        client.miners["192.168.1.100"] = miner1
        client.miners["192.168.1.101"] = miner2

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

        assert result.hashrate is not None
        assert hasattr(result.hashrate, "rate")

    @pytest.mark.asyncio
    async def test_get_miner_data_not_found(self):
        """Test getting miner data when miner not found."""
        client = MockMinerClient()
        service = MinerService(client=client)

        with pytest.raises(ValueError, match="Miner not found"):
            await service.get_miner_data("192.168.1.100")

    @pytest.mark.asyncio
    async def test_get_miner_data_get_data_raises_value_error(self):
        """Test get_miner_data when miner.get_data() raises -> ValueError with message."""
        client = MockMinerClient()
        miner = MagicMock()
        miner.get_data = AsyncMock(side_effect=RuntimeError("get_data failed"))
        client.miners["192.168.1.100"] = miner

        service = MinerService(client=client)
        with pytest.raises(ValueError, match="Could not retrieve data from miner"):
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

        # Object-based mapper returns a MinerConfigModel instance;
        # for the mock miner, this may be empty or contain default fields, but it
        # should be a MinerConfigModel.
        from app.models import MinerConfigModel
        assert isinstance(result, MinerConfigModel)

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
        # Patch mapper's MinerConfig class to a simple dummy that accepts
        # extra_config for this test only, to avoid coupling to pyasic internals.
        from app.mappers import miner_config_mapper as mcm

        orig_miner_config = mcm.PyasicMinerConfig

        class DummyMinerConfig:
            def __init__(self, pools=None, fan_mode=None, temperature=None, mining_mode=None, extra_config=None):
                self.pools = pools
                self.fan_mode = fan_mode
                self.temperature = temperature
                self.mining_mode = mining_mode
                self.extra_config = extra_config

        mcm.PyasicMinerConfig = DummyMinerConfig
        try:
            result = await service.update_miner_config(
                "192.168.1.100",
                {"pools": {"groups": []}},  # minimal valid shape for our mapper
            )
        finally:
            mcm.PyasicMinerConfig = orig_miner_config

        assert result.status == "success"

    @pytest.mark.asyncio
    async def test_update_miner_config_not_found(self):
        """Test updating miner config when miner not found."""
        client = MockMinerClient()
        service = MinerService(client=client)

        with pytest.raises(ValueError, match="Miner not found"):
            await service.update_miner_config("192.168.1.100", {})

    @pytest.mark.asyncio
    async def test_update_miner_config_no_extra_config_raises(self):
        """Test that PATCH config raises when existing_cfg has no extra_config."""
        client = MockMinerClient()
        miner = MockMiner("192.168.1.100", {})

        # Simulate a config object with no extra_config attribute/value.
        class NoExtraConfig:
            def __init__(self) -> None:
                self.pools = None
                self.fan_mode = None
                self.mining_mode = type("MiningMode", (), {"mode": "normal"})()
                self.temperature = None
                self.extra_config = None

        miner.get_config = AsyncMock(return_value=NoExtraConfig())
        client.miners["192.168.1.100"] = miner

        service = MinerService(client=client)
        with pytest.raises(ExtraConfigNotAvailableError, match="no extra_config"):
            await service.update_miner_config("192.168.1.100", {"extra_config": {"frequency": 490}})

    @pytest.mark.asyncio
    async def test_update_miner_config_send_error(self):
        """Test updating miner config when send_config raises an error."""
        client = MockMinerClient()
        data_dict = {}
        miner = MockMiner("192.168.1.100", data_dict)
        miner.send_config = AsyncMock(side_effect=Exception("Send config failed"))
        client.miners["192.168.1.100"] = miner

        service = MinerService(client=client)

        # Use the same DummyMinerConfig patching strategy as in the success test
        # so that miner_config_to_pyasic can construct a config without relying
        # on pyasic's MinerConfig internals.
        from app.mappers import miner_config_mapper as mcm

        orig_miner_config = mcm.PyasicMinerConfig

        class DummyMinerConfig:
            def __init__(self, pools=None, fan_mode=None, temperature=None, mining_mode=None, extra_config=None):
                self.pools = pools
                self.fan_mode = fan_mode
                self.temperature = temperature
                self.mining_mode = mining_mode
                self.extra_config = extra_config

        mcm.PyasicMinerConfig = DummyMinerConfig
        try:
            with pytest.raises(Exception, match="Send config failed"):
                await service.update_miner_config(
                    "192.168.1.100",
                    {"pools": {"groups": []}},
                )
        finally:
            mcm.PyasicMinerConfig = orig_miner_config

    @pytest.mark.asyncio
    async def test_update_miner_config_bitaxe_frequency_validation_invalid(self):
        """Test updating Bitaxe config with invalid frequency raises ValueError."""
        client = MockMinerClient()
        data_dict = {"model": "BitAxe Gamma"}
        miner = MockMiner("192.168.1.100", data_dict)
        # Create a mock class with "bitaxe" in the name for detection
        BitaxeMockMiner = type("BitaxeMockMiner", (MockMiner,), {})
        miner.__class__ = BitaxeMockMiner
        client.miners["192.168.1.100"] = miner

        service = MinerService(client=client)
        with pytest.raises(ConfigValidationError, match="Invalid frequency.*Accepted values are"):
            await service.update_miner_config(
                "192.168.1.100",
                {"extra_config": {"frequency": 500}},  # Invalid: not in {400, 490, 525, 550, 600, 625}
            )

    @pytest.mark.asyncio
    async def test_update_miner_config_bitaxe_frequency_validation_valid(self):
        """Test updating Bitaxe config with valid frequency succeeds."""
        client = MockMinerClient()
        data_dict = {"model": "BitAxe Gamma"}
        miner = MockMiner("192.168.1.100", data_dict)
        # Create a mock class with "bitaxe" in the name for detection
        BitaxeMockMiner = type("BitaxeMockMiner", (MockMiner,), {})
        miner.__class__ = BitaxeMockMiner
        client.miners["192.168.1.100"] = miner

        service = MinerService(client=client)

        # Use DummyMinerConfig to decouple from pyasic.MinerConfig extra_config
        # field support for this test.
        from app.mappers import miner_config_mapper as mcm

        orig_miner_config = mcm.PyasicMinerConfig

        class DummyMinerConfig:
            def __init__(self, pools=None, fan_mode=None, temperature=None, mining_mode=None, extra_config=None):
                self.pools = pools
                self.fan_mode = fan_mode
                self.temperature = temperature
                self.mining_mode = mining_mode
                self.extra_config = extra_config

        mcm.PyasicMinerConfig = DummyMinerConfig
        try:
            result = await service.update_miner_config(
                "192.168.1.100",
                {"extra_config": {"frequency": 490}},  # Valid frequency
            )
        finally:
            mcm.PyasicMinerConfig = orig_miner_config
        assert result.status == "success"

    @pytest.mark.asyncio
    async def test_update_miner_config_non_bitaxe_frequency_no_validation(self):
        """Test that frequency validation only applies to Bitaxe miners."""
        client = MockMinerClient()
        data_dict = {"model": "Antminer S19"}
        miner = MockMiner("192.168.1.100", data_dict)
        # Create a mock class without "bitaxe" in the name
        AntminerMockMiner = type("AntminerMockMiner", (MockMiner,), {})
        miner.__class__ = AntminerMockMiner
        client.miners["192.168.1.100"] = miner

        service = MinerService(client=client)

        from app.mappers import miner_config_mapper as mcm

        orig_miner_config = mcm.PyasicMinerConfig

        class DummyMinerConfig:
            def __init__(self, pools=None, fan_mode=None, temperature=None, mining_mode=None, extra_config=None):
                self.pools = pools
                self.fan_mode = fan_mode
                self.temperature = temperature
                self.mining_mode = mining_mode
                self.extra_config = extra_config

        mcm.PyasicMinerConfig = DummyMinerConfig
        try:
            # Non-Bitaxe miners should accept any frequency value
            result = await service.update_miner_config(
                "192.168.1.100",
                {"extra_config": {"frequency": 999}},  # Would be invalid for Bitaxe, but OK for others
            )
        finally:
            mcm.PyasicMinerConfig = orig_miner_config
        assert result.status == "success"

    @pytest.mark.asyncio
    async def test_update_miner_config_extra_config_deep_merge(self):
        """Test that extra_config is deep merged correctly and passed as typed instance."""
        client = MockMinerClient()
        data_dict = {"model": "BitAxe Gamma"}
        miner = MockMiner("192.168.1.100", data_dict)
        BitaxeMockMiner = type("BitaxeMockMiner", (MockMiner,), {})
        miner.__class__ = BitaxeMockMiner

        # Mock existing config with extra_config present.
        class ExistingConfig:
            def __init__(self) -> None:
                self.pools = None
                self.fan_mode = None
                self.mining_mode = type("MiningMode", (), {"mode": "normal"})()
                self.temperature = None
                class ExtraCfg:
                    model_fields = ["frequency", "coreVoltage", "display"]

                    def __init__(self, **kwargs) -> None:
                        for k, v in kwargs.items():
                            setattr(self, k, v)

                # Existing extra_config instance before merge
                self.extra_config = ExtraCfg(
                    frequency=490,
                    coreVoltage=1100,
                    display="SSD1306",
                )

        miner.get_config = AsyncMock(return_value=ExistingConfig())

        # Track what gets passed to send_config
        sent_configs = []
        async def capture_send_config(config):
            sent_configs.append(config)

        miner.send_config = AsyncMock(side_effect=capture_send_config)
        client.miners["192.168.1.100"] = miner

        service = MinerService(client=client)

        # PATCH with partial extra_config (should deep merge)
        from app.mappers import miner_config_mapper as mcm

        orig_miner_config = mcm.PyasicMinerConfig

        class DummyMinerConfig:
            def __init__(self, pools=None, fan_mode=None, temperature=None, mining_mode=None, extra_config=None):
                self.pools = pools
                self.fan_mode = fan_mode
                self.temperature = temperature
                self.mining_mode = mining_mode
                self.extra_config = extra_config

        mcm.PyasicMinerConfig = DummyMinerConfig
        try:
            result = await service.update_miner_config(
                "192.168.1.100",
                {
                    "extra_config": {
                        "frequency": 525,  # Update frequency, keep other fields
                    }
                },
            )
        finally:
            mcm.PyasicMinerConfig = orig_miner_config

        assert result.status == "success"
        assert miner.send_config.called
        sent_config = sent_configs[0]
        # We don't depend on the concrete pyasic MinerConfig type here, only
        # that a config object with an extra_config attribute was sent.
        assert hasattr(sent_config, "extra_config")
        assert miner.get_config.called

    @pytest.mark.asyncio
    async def test_update_miner_config_extra_config_new_field(self):
        """Test that new extra_config fields are added correctly."""
        client = MockMinerClient()
        data_dict = {"model": "Antminer S19"}
        miner = MockMiner("192.168.1.100", data_dict)
        AntminerMockMiner = type("AntminerMockMiner", (MockMiner,), {})
        miner.__class__ = AntminerMockMiner

        # Mock existing config where extra_config is already present, so new
        # fields can be merged onto it.
        class ExistingConfig:
            def __init__(self) -> None:
                self.pools = None
                self.fan_mode = None
                self.mining_mode = type("MiningMode", (), {"mode": "normal"})()
                self.temperature = None
                class ExtraCfg:
                    model_fields: list[str] = []
                    __annotations__: dict[str, type] = {}

                    def __init__(self, **kwargs) -> None:
                        for k, v in kwargs.items():
                            setattr(self, k, v)

                self.extra_config = ExtraCfg()

        miner.get_config = AsyncMock(return_value=ExistingConfig())

        sent_configs = []
        async def capture_send_config(config):
            sent_configs.append(config)

        miner.send_config = AsyncMock(side_effect=capture_send_config)
        client.miners["192.168.1.100"] = miner

        service = MinerService(client=client)

        # PATCH with new extra_config
        from app.mappers import miner_config_mapper as mcm

        orig_miner_config = mcm.PyasicMinerConfig

        class DummyMinerConfig:
            def __init__(self, pools=None, fan_mode=None, temperature=None, mining_mode=None, extra_config=None):
                self.pools = pools
                self.fan_mode = fan_mode
                self.temperature = temperature
                self.mining_mode = mining_mode
                self.extra_config = extra_config

        mcm.PyasicMinerConfig = DummyMinerConfig
        try:
            result = await service.update_miner_config(
                "192.168.1.100",
                {"extra_config": {"custom_field": "value"}},
            )
        finally:
            mcm.PyasicMinerConfig = orig_miner_config

        assert result.status == "success"
        assert len(sent_configs) == 1
        # Verify config was sent successfully and carries an extra_config attr
        assert hasattr(sent_configs[0], "extra_config")
        assert miner.send_config.called

    @pytest.mark.asyncio
    async def test_update_miner_config_extra_config_with_other_fields(self):
        """Test that extra_config works correctly when combined with other config fields."""
        client = MockMinerClient()
        data_dict = {"model": "BitAxe Gamma"}
        miner = MockMiner("192.168.1.100", data_dict)
        BitaxeMockMiner = type("BitaxeMockMiner", (MockMiner,), {})
        miner.__class__ = BitaxeMockMiner

        # Existing config exposes both fan_mode and extra_config attributes.
        class ExistingConfig:
            def __init__(self) -> None:
                self.pools = None
                self.fan_mode = type(
                    "FanMode",
                    (),
                    {"mode": "normal", "speed": 60, "minimum_fans": 1},
                )()
                self.mining_mode = type("MiningMode", (), {"mode": "normal"})()
                self.temperature = None
                class ExtraCfg:
                    model_fields = ["frequency"]
                    __annotations__ = {"frequency": int}

                    def __init__(self, **kwargs) -> None:
                        for k, v in kwargs.items():
                            setattr(self, k, v)

                self.extra_config = ExtraCfg(frequency=490)

        miner.get_config = AsyncMock(return_value=ExistingConfig())

        sent_configs = []
        async def capture_send_config(config):
            sent_configs.append(config)

        miner.send_config = AsyncMock(side_effect=capture_send_config)
        client.miners["192.168.1.100"] = miner

        service = MinerService(client=client)

        # PATCH with both fan_mode and extra_config
        from app.mappers import miner_config_mapper as mcm

        orig_miner_config = mcm.PyasicMinerConfig

        class DummyMinerConfig:
            def __init__(self, pools=None, fan_mode=None, temperature=None, mining_mode=None, extra_config=None):
                self.pools = pools
                self.fan_mode = fan_mode
                self.temperature = temperature
                self.mining_mode = mining_mode
                self.extra_config = extra_config

        mcm.PyasicMinerConfig = DummyMinerConfig
        try:
            result = await service.update_miner_config(
                "192.168.1.100",
                {
                    "fan_mode": {"speed": 80},  # Partial update
                    "extra_config": {"frequency": 525},  # Partial update
                },
            )
        finally:
            mcm.PyasicMinerConfig = orig_miner_config

        assert result.status == "success"
        assert len(sent_configs) == 1
        assert hasattr(sent_configs[0], "extra_config")
        assert miner.send_config.called

    @pytest.mark.asyncio
    async def test_restart_miner_reboot_error(self):
        """Test restarting miner when reboot raises an error."""
        client = MockMinerClient()
        data_dict = {}
        miner = MockMiner("192.168.1.100", data_dict)
        miner.reboot = AsyncMock(side_effect=Exception("Reboot failed"))
        client.miners["192.168.1.100"] = miner

        service = MinerService(client=client)
        with pytest.raises(Exception, match="Reboot failed"):
            await service.restart_miner("192.168.1.100")

    @pytest.mark.asyncio
    async def test_fault_light_on_error(self):
        """Test turning fault light on when operation raises an error."""
        client = MockMinerClient()
        data_dict = {}
        miner = MockMiner("192.168.1.100", data_dict)
        miner.fault_light_on = AsyncMock(side_effect=Exception("Fault light failed"))
        client.miners["192.168.1.100"] = miner

        service = MinerService(client=client)
        with pytest.raises(Exception, match="Fault light failed"):
            await service.fault_light_on("192.168.1.100")

    @pytest.mark.asyncio
    async def test_fault_light_off_error(self):
        """Test turning fault light off when operation raises an error."""
        client = MockMinerClient()
        data_dict = {}
        miner = MockMiner("192.168.1.100", data_dict)
        miner.fault_light_off = AsyncMock(side_effect=Exception("Fault light failed"))
        client.miners["192.168.1.100"] = miner

        service = MinerService(client=client)
        with pytest.raises(Exception, match="Fault light failed"):
            await service.fault_light_off("192.168.1.100")

    @pytest.mark.asyncio
    async def test_restart_miner_success(self):
        """Test restarting miner successfully."""
        client = MockMinerClient()
        data_dict = {}
        miner = MockMiner("192.168.1.100", data_dict)
        client.miners["192.168.1.100"] = miner

        service = MinerService(client=client)
        result = await service.restart_miner("192.168.1.100")

        assert result.status == "success"

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

        assert result.status == "success"

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

        assert result.status == "success"

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
        miner.get_errors = AsyncMock(
            return_value=[{"error_code": 1, "message": "Error 1"}, {"error_code": 2, "message": "Error 2"}]
        )
        client.miners["192.168.1.100"] = miner

        service = MinerService(client=client)
        result = await service.get_miner_errors("192.168.1.100")

        assert len(result) == 2
        assert result[0].error_code == 1 and result[0].message == "Error 1"
        assert result[1].error_code == 2 and result[1].message == "Error 2"

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
        # Normalizer is now selected automatically; result[0].data is MinerData
        assert result[0].data.hashrate is not None
        assert result[0].data.hashrate.rate is not None

    @pytest.mark.asyncio
    async def test_get_miner_data_raw_success(self):
        """Test getting raw miner data successfully."""
        client = MockMinerClient()

        data_dict = {
            "hashrate": 1.0,
            "wattage": 50.0,
            "raw_field": "raw_value"
        }
        miner = MockMiner("192.168.1.100", data_dict)
        client.miners["192.168.1.100"] = miner

        service = MinerService(client=client)
        result = await service.get_miner_data_raw("192.168.1.100")

        assert result.raw_field == "raw_value"
        assert result.hashrate == 1.0
        assert result.wattage == 50.0

    @pytest.mark.asyncio
    async def test_get_miner_data_raw_not_found(self):
        """Test getting raw miner data when miner not found."""
        client = MockMinerClient()
        service = MinerService(client=client)

        with pytest.raises(ValueError, match="Miner not found"):
            await service.get_miner_data_raw("192.168.1.100")

    @pytest.mark.asyncio
    async def test_get_miner_data_raw_no_as_dict(self):
        """Test getting raw miner data when data has no as_dict method."""
        client = MockMinerClient()
        miner = MagicMock()
        # Create a simple object without as_dict method
        class DataWithoutAsDict:
            pass
        mock_data = DataWithoutAsDict()
        miner.get_data = AsyncMock(return_value=mock_data)
        client.miners["192.168.1.100"] = miner

        service = MinerService(client=client)
        result = await service.get_miner_data_raw("192.168.1.100")

        from app.models import MinerDataRaw
        assert isinstance(result, MinerDataRaw)

    @pytest.mark.asyncio
    async def test_get_miner_data_no_as_dict(self):
        """Test getting miner data when data has no as_dict method."""
        client = MockMinerClient()
        miner = MagicMock()
        miner.get_data = AsyncMock(return_value=MagicMock())  # No as_dict method
        client.miners["192.168.1.100"] = miner

        service = MinerService(client=client)
        result = await service.get_miner_data("192.168.1.100")

        # Should still normalize even with empty dict
        from app.models import MinerData
        assert isinstance(result, MinerData)

    @pytest.mark.asyncio
    async def test_get_miner_config_no_as_dict(self):
        """Test getting miner config when config has no as_dict method."""
        client = MockMinerClient()
        miner = MagicMock()
        # Create a simple object without as_dict method
        class ConfigWithoutAsDict:
            pass
        mock_config = ConfigWithoutAsDict()
        miner.get_config = AsyncMock(return_value=mock_config)
        client.miners["192.168.1.100"] = miner

        service = MinerService(client=client)
        result = await service.get_miner_config("192.168.1.100")

        from app.models import MinerConfigModel
        assert isinstance(result, MinerConfigModel)

    @pytest.mark.asyncio
    async def test_scan_miners_hashrate_not_dict(self):
        """Test scanning when raw hashrate is not a dict (normalizer converts it)."""
        client = MockMinerClient()

        data_dict = {
            "hashrate": 1.0,  # Raw value is not a dict, but normalizer will convert it
            "mac": "00:11:22:33:44:55",
            "model": "TestMiner",
            "hostname": "test-miner"
        }
        miner = MockMiner("192.168.1.100", data_dict)
        client.miners["192.168.1.100"] = miner

        service = MinerService(client=client)
        result = await service.scan_miners(ip="192.168.1.100")

        assert len(result) == 1
        # Normalizer converts hashrate to HashrateStruct; result[0].data is MinerData
        assert result[0].data.hashrate is not None
        assert hasattr(result[0].data.hashrate, "rate") and result[0].data.hashrate.rate is not None
        assert result[0].hashrate >= 0.0  # Top-level hashrate from normalized rate

    @pytest.mark.asyncio
    async def test_scan_miners_no_hashrate(self):
        """Test scanning when normalized data has no hashrate."""
        client = MockMinerClient()

        data_dict = {
            "wattage": 50.0,
            "mac": "00:11:22:33:44:55",
            "model": "TestMiner",
            "hostname": "test-miner"
        }
        miner = MockMiner("192.168.1.100", data_dict)
        client.miners["192.168.1.100"] = miner

        service = MinerService(client=client)
        result = await service.scan_miners(ip="192.168.1.100")

        assert len(result) == 1
        # When no hashrate, should default to 0.0
        assert result[0].hashrate == 0.0

    @pytest.mark.asyncio
    async def test_validate_miners_success_with_model(self):
        """Test validate_miners when miner is found with model."""
        client = MockMinerClient()
        miner = MagicMock()
        miner.model = "BitAxe Gamma"
        client.get_miner = AsyncMock(return_value=miner)

        service = MinerService(client=client)
        result = await service.validate_miners(["192.168.1.100"])

        assert len(result) == 1
        assert result[0].ip == "192.168.1.100"
        assert result[0].is_miner is True
        assert result[0].model == "BitAxe Gamma"
        assert result[0].error is None

    @pytest.mark.asyncio
    async def test_validate_miners_miner_not_detected(self):
        """Test validate_miners when get_miner returns None."""
        client = MockMinerClient()
        client.get_miner = AsyncMock(return_value=None)

        service = MinerService(client=client)
        result = await service.validate_miners(["192.168.1.100"])

        assert len(result) == 1
        assert result[0].ip == "192.168.1.100"
        assert result[0].is_miner is False
        assert result[0].error == "Miner not detected"

    @pytest.mark.asyncio
    async def test_validate_miners_timeout(self):
        """Test validate_miners when get_miner times out."""
        client = MockMinerClient()
        client.get_miner = AsyncMock(side_effect=TimeoutError())

        service = MinerService(client=client)
        result = await service.validate_miners(["192.168.1.100"])

        assert len(result) == 1
        assert result[0].ip == "192.168.1.100"
        assert result[0].is_miner is False
        assert result[0].error == "Timeout"

    @pytest.mark.asyncio
    async def test_validate_miners_exception(self):
        """Test validate_miners when get_miner raises."""
        client = MockMinerClient()
        client.get_miner = AsyncMock(side_effect=ConnectionError("Connection refused"))

        service = MinerService(client=client)
        result = await service.validate_miners(["192.168.1.100"])

        assert len(result) == 1
        assert result[0].ip == "192.168.1.100"
        assert result[0].is_miner is False
        assert "Connection refused" in str(result[0].error)

    @pytest.mark.asyncio
    async def test_get_miner_errors_with_pydantic_model(self):
        """Test getting miner errors when errors are Pydantic models."""
        from app.models import MinerErrorEntry
        client = MockMinerClient()
        data_dict = {}
        miner = MockMiner("192.168.1.100", data_dict)
        # Create a Pydantic model error
        error_model = MinerErrorEntry(error_code=1, message="Test error")
        miner.get_errors = AsyncMock(return_value=[error_model])
        client.miners["192.168.1.100"] = miner

        service = MinerService(client=client)
        result = await service.get_miner_errors("192.168.1.100")

        assert len(result) == 1
        assert result[0].error_code == 1
        assert result[0].message == "Test error"

    @pytest.mark.asyncio
    async def test_get_miner_errors_with_non_dict_non_model(self):
        """Test getting miner errors when errors are neither dict nor Pydantic model."""
        client = MockMinerClient()
        data_dict = {}
        miner = MockMiner("192.168.1.100", data_dict)
        # Return a string error (fallback case)
        miner.get_errors = AsyncMock(return_value=["String error"])
        client.miners["192.168.1.100"] = miner

        service = MinerService(client=client)
        result = await service.get_miner_errors("192.168.1.100")

        assert len(result) == 1
        assert result[0].error_code == 0
        assert result[0].message == "String error"

    @pytest.mark.asyncio
    async def test_scan_miners_single_ip_data_retrieval_fails(self):
        """Test scanning single IP when data retrieval fails."""
        client = MockMinerClient()
        miner = MockMiner("192.168.1.100", {})
        client.miners["192.168.1.100"] = miner
        # Make get_miner_data_dict raise ValueError
        async def failing_get_data(ip):
            raise ValueError("Could not retrieve data")
        client.get_miner_data_dict = failing_get_data

        service = MinerService(client=client)
        result = await service.scan_miners(ip="192.168.1.100")

        # Should return empty list when data retrieval fails
        assert len(result) == 0

    @pytest.mark.asyncio
    async def test_scan_miners_subnet_data_retrieval_fails(self):
        """Test scanning subnet when data retrieval fails for some miners."""
        client = MockMinerClient()
        miner1 = MockMiner("192.168.1.100", {"hashrate": {"rate": 1.0}})
        miner2 = MockMiner("192.168.1.101", {"hashrate": {"rate": 2.0}})
        client.scan_results = [miner1, miner2]
        client.miners["192.168.1.100"] = miner1
        client.miners["192.168.1.101"] = miner2
        # Make get_miner_data_dict raise ValueError for second miner
        call_count = 0
        async def failing_get_data(ip):
            nonlocal call_count
            call_count += 1
            if call_count == 2:  # Fail on second call
                raise ValueError("Could not retrieve data")
            return {"hashrate": {"rate": 1.0}, "mac": "00:11:22:33:44:55"}
        client.get_miner_data_dict = failing_get_data

        service = MinerService(client=client)
        result = await service.scan_miners(subnet="192.168.1.0/24")

        # Should return only the first miner
        assert len(result) == 1
        assert result[0].ip == "192.168.1.100"

    @pytest.mark.asyncio
    async def test_get_miner_config_exception_handling(self):
        """Test get_miner_config when mapper raises exception."""
        client = MockMinerClient()
        miner = MockMiner("192.168.1.100", {})
        client.miners["192.168.1.100"] = miner
        
        # Mock get_miner_config_dict to return something that will cause mapper to fail
        async def get_config(ip):
            # Return an object that will cause miner_config_from_pyasic to raise
            class BadConfig:
                pass
            return BadConfig()
        client.get_miner_config_dict = get_config

        service = MinerService(client=client)
        result = await service.get_miner_config("192.168.1.100")

        # Should return empty MinerConfigModel on exception
        from app.models import MinerConfigModel
        assert isinstance(result, MinerConfigModel)
        assert result.pools is None

    @pytest.mark.asyncio
    async def test_update_miner_config_exception_handling(self):
        """Test update_miner_config when get_miner_config_dict raises."""
        client = MockMinerClient()
        async def failing_get_config(ip):
            raise ValueError("Miner not found")
        client.get_miner_config_dict = failing_get_config

        service = MinerService(client=client)
        with pytest.raises(ValueError, match="Miner not found"):
            await service.update_miner_config("192.168.1.100", {})
