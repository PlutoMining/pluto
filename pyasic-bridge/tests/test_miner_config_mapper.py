"""
Unit tests for miner_config_mapper (internal <-> pyasic MinerConfig).
"""

import pytest

from app.mappers.miner_config_mapper import (
    _extra_config_from_pyasic,
    miner_config_from_pyasic,
    miner_config_to_pyasic,
)
from app.models import (
    FanModeConfig,
    MinerConfigModel,
    MiningModeConfig,
    PoolsConfig,
    TemperatureConfig,
)


class TestMinerConfigFromPyasic:
    """Tests for miner_config_from_pyasic (pyasic -> internal MinerConfigModel)."""

    def test_returns_empty_model_for_none(self) -> None:
        result = miner_config_from_pyasic(None)
        assert isinstance(result, MinerConfigModel)
        assert result.pools is None
        assert result.fan_mode is None
        assert result.temperature is None
        assert result.mining_mode is None

    def test_maps_nested_components(self) -> None:
        try:
            from pyasic.config import MinerConfig as PyasicMinerConfig
            from pyasic.config.fans import FanModeManual
            from pyasic.config.mining import MiningModeConfig as PyasicMiningModeConfig
            from pyasic.config.pools import Pool, PoolConfig, PoolGroup
            from pyasic.config.temperature import TemperatureConfig as PyasicTemperatureConfig
        except ImportError:
            pytest.skip("pyasic not installed")

        pools = PoolConfig(
            groups=[
                PoolGroup(
                    pools=[Pool(url="stratum+tcp://example:3333", user="u", password="p")],
                    quota=1,
                    name="g1",
                )
            ]
        )
        fan_mode = FanModeManual(speed=60, minimum_fans=1)
        temperature = PyasicTemperatureConfig(target=70, hot=80, danger=90)
        mining_mode = PyasicMiningModeConfig.low()

        cfg = PyasicMinerConfig(
            pools=pools,
            fan_mode=fan_mode,
            temperature=temperature,
            mining_mode=mining_mode,
            extra_config=None,
        )

        result = miner_config_from_pyasic(cfg)
        assert isinstance(result, MinerConfigModel)
        assert isinstance(result.pools, PoolsConfig)
        assert isinstance(result.fan_mode, FanModeConfig)
        assert isinstance(result.temperature, TemperatureConfig)
        assert isinstance(result.mining_mode, MiningModeConfig)
        assert result.pools.groups[0].pools[0].url == "stratum+tcp://example:3333"
        assert result.fan_mode.mode == "manual"
        assert result.temperature.target == 70
        assert result.mining_mode.mode == "low"


class TestMinerConfigToPyasic:
    """Tests for miner_config_to_pyasic (internal MinerConfigModel -> pyasic MinerConfig)."""

    def test_builds_miner_config_with_nested_components(self) -> None:
        try:
            from pyasic.config import MinerConfig as PyasicMinerConfig
            from pyasic.config.fans import FanModeConfig as PyasicFanModeConfig
            from pyasic.config.mining import MiningModeConfig as PyasicMiningModeConfig
            from pyasic.config.pools import PoolConfig as PyasicPoolConfig
            from pyasic.config.temperature import TemperatureConfig as PyasicTemperatureConfig
        except ImportError:
            pytest.skip("pyasic not installed")

        internal = MinerConfigModel(
            pools=PoolsConfig(groups=[]),
            fan_mode=FanModeConfig(mode="manual", speed=60, minimum_fans=1),
            temperature=TemperatureConfig(target=70, hot=80, danger=90),
            mining_mode=MiningModeConfig(mode="high"),
            extra_config=None,
        )

        existing = PyasicMinerConfig(
            pools=PyasicPoolConfig.default(),
            fan_mode=PyasicFanModeConfig.default(),
            temperature=PyasicTemperatureConfig.default(),
            mining_mode=PyasicMiningModeConfig.default(),
            extra_config=None,
        )

        result = miner_config_to_pyasic(internal, existing)
        assert isinstance(result, PyasicMinerConfig)
        assert result.fan_mode.mode == "manual"
        assert result.fan_mode.speed == 60
        assert result.temperature.target == 70
        assert result.mining_mode.mode == "high"

    def test_preserves_and_merges_extra_config(self) -> None:
        """Test that extra_config merge keeps the concrete MinerExtraConfig type.

        pyasic's MinerExtraConfig (and miner-specific subclasses) have a fixed schema
        and methods like ``as_espminer()``. When we build a new MinerConfig for
        send_config, we want to:

        - keep the existing ``extra_config`` object type intact; and
        - apply updates only for fields that are actually part of that model.

        Unknown keys in the internal ``extra_config`` dict (like ``field_b`` in this
        test) should be ignored rather than forcing ``extra_config`` to a plain dict.
        """
        try:
            from pyasic.config import MinerConfig as PyasicMinerConfig
            from pyasic.config.fans import FanModeConfig as PyasicFanModeConfig
            from pyasic.config.mining import MiningModeConfig as PyasicMiningModeConfig
            from pyasic.config.pools import PoolConfig as PyasicPoolConfig
            from pyasic.config.temperature import TemperatureConfig as PyasicTemperatureConfig
        except ImportError:
            pytest.skip("pyasic not installed")

        dummy = PyasicMinerConfig()
        if not hasattr(dummy, "extra_config"):
            pytest.skip("pyasic MinerConfig has no extra_config attribute in this version")

        # Create existing config with extra_config dict. pyasic will convert this to
        # MinerExtraConfig, which doesn't preserve arbitrary fields (no model_fields,
        # no extra="allow"). So field_a and field_b will be lost.
        existing = PyasicMinerConfig(
            pools=PyasicPoolConfig.default(),
            fan_mode=PyasicFanModeConfig.default(),
            temperature=PyasicTemperatureConfig.default(),
            mining_mode=PyasicMiningModeConfig.default(),
            extra_config={"field_a": 1, "field_b": 2},
        )

        # Internal config wants to merge in field_b=42
        internal = MinerConfigModel(
            pools=None,
            fan_mode=None,
            temperature=None,
            mining_mode=None,
            extra_config={"field_b": 42},
        )

        result = miner_config_to_pyasic(internal, existing)
        assert result.extra_config is not None
        extra = result.extra_config

        # We should keep the existing concrete MinerExtraConfig type, not coerce to dict.
        assert isinstance(
            extra, type(existing.extra_config)
        ), "extra_config should preserve the MinerExtraConfig type"

        # Internal.extra_config only contains an unknown key ('field_b'); it should not
        # suddenly appear as a real field on the model.
        if hasattr(extra, "model_fields"):
            assert "field_b" not in extra.model_fields
        if hasattr(extra, "__annotations__"):
            assert "field_b" not in extra.__annotations__

    def test_preserves_and_merges_extra_config_dict(self) -> None:
        """
        Test that extra_config merge works when existing.extra_config is a dict.

        When extra_config is already a dict (not converted to MinerExtraConfig),
        all fields are preserved and merged correctly.
        """
        try:
            from pyasic.config import MinerConfig as PyasicMinerConfig
            from pyasic.config.fans import FanModeConfig as PyasicFanModeConfig
            from pyasic.config.mining import MiningModeConfig as PyasicMiningModeConfig
            from pyasic.config.pools import PoolConfig as PyasicPoolConfig
            from pyasic.config.temperature import TemperatureConfig as PyasicTemperatureConfig
        except ImportError:
            pytest.skip("pyasic not installed")

        dummy = PyasicMinerConfig()
        if not hasattr(dummy, "extra_config"):
            pytest.skip("pyasic MinerConfig has no extra_config attribute in this version")

        # Create existing config and manually set extra_config as a dict
        # (simulating a case where it wasn't converted to MinerExtraConfig)
        existing = PyasicMinerConfig(
            pools=PyasicPoolConfig.default(),
            fan_mode=PyasicFanModeConfig.default(),
            temperature=PyasicTemperatureConfig.default(),
            mining_mode=PyasicMiningModeConfig.default(),
            extra_config=None,
        )
        # Manually set as dict to test dict merge path
        existing.extra_config = {"field_a": 1, "field_b": 2}

        internal = MinerConfigModel(
            pools=None,
            fan_mode=None,
            temperature=None,
            mining_mode=None,
            extra_config={"field_b": 42, "field_c": 3},
        )

        result = miner_config_to_pyasic(internal, existing)
        assert result.extra_config is not None
        extra = result.extra_config
        assert isinstance(extra, dict), "extra_config should be a dict after merge"

        # All fields from existing should be preserved
        assert extra.get("field_a") == 1
        # field_b from internal should override existing
        assert extra.get("field_b") == 42
        # field_c from internal should be added
        assert extra.get("field_c") == 3

    def test_extra_config_with_annotations_only(self) -> None:
        """_extra_config_from_pyasic uses __annotations__ when model_fields is not present (e.g. Pydantic v1 style)."""
        class ExtraCfgV1:
            __annotations__ = {"field_a": int, "field_b": str}

            def __init__(self, field_a: int = 1, field_b: str = "test") -> None:
                self.field_a = field_a
                self.field_b = field_b

        result = _extra_config_from_pyasic(ExtraCfgV1(field_a=10, field_b="hello"))
        assert result is not None
        assert result.get("field_a") == 10
        assert result.get("field_b") == "hello"

    def test_extra_config_without_fields_or_annotations(self) -> None:
        """_extra_config_from_pyasic returns None when object has no model_fields nor __annotations__."""
        class ExtraCfgNoFields:
            """Plain object: no model_fields, no __annotations__."""

            def __init__(self, field_a: int = 1) -> None:
                self.field_a = field_a

        result = _extra_config_from_pyasic(ExtraCfgNoFields(field_a=5))
        assert result is None

    def test_miner_config_to_pyasic_raises_when_pyasic_not_installed(self) -> None:
        """Test miner_config_to_pyasic raises RuntimeError when pyasic not installed."""
        # Temporarily mock PyasicMinerConfig to None
        import app.mappers.miner_config_mapper as mcm
        original = mcm.PyasicMinerConfig
        try:
            mcm.PyasicMinerConfig = None
            with pytest.raises(RuntimeError, match="pyasic is not installed"):
                miner_config_to_pyasic(MinerConfigModel(), None)
        finally:
            mcm.PyasicMinerConfig = original

