"""
Unit tests for mining_mode_mapper (internal <-> pyasic MiningModeConfig).
"""

import pytest

from app.mappers import mining_mode_from_pyasic, mining_mode_to_pyasic
from app.models import MiningModeConfig


class TestMiningModeFromPyasic:
    """Tests for mining_mode_from_pyasic (pyasic -> internal object)."""

    def test_returns_none_for_none(self) -> None:
        assert mining_mode_from_pyasic(None) is None

    def test_returns_none_when_no_mode_attribute(self) -> None:
        class NoMode:
            pass

        assert mining_mode_from_pyasic(NoMode()) is None

    def test_maps_mode_string(self) -> None:
        class FakeMode:
            mode = "sleep"

        internal = mining_mode_from_pyasic(FakeMode())
        assert isinstance(internal, MiningModeConfig)
        assert internal.mode == "sleep"


class TestMiningModeToPyasic:
    """Tests for mining_mode_to_pyasic (internal object -> pyasic MiningModeConfig)."""

    def test_returns_default_when_internal_is_none(self) -> None:
        try:
            from pyasic.config.mining import MiningModeNormal
        except ImportError:
            pytest.skip("pyasic not installed")

        result = mining_mode_to_pyasic(None)
        # MiningModeConfig.default() returns a MiningModeNormal instance.
        assert isinstance(result, MiningModeNormal)
        assert result.mode == "normal"

    def test_builds_sleep_mode(self) -> None:
        try:
            from pyasic.config.mining import MiningModeSleep
        except ImportError:
            pytest.skip("pyasic not installed")

        internal = MiningModeConfig(mode="sleep")
        result = mining_mode_to_pyasic(internal)
        assert isinstance(result, MiningModeSleep)
        assert result.mode == "sleep"

    def test_builds_low_mode(self) -> None:
        try:
            from pyasic.config.mining import MiningModeLPM
        except ImportError:
            pytest.skip("pyasic not installed")

        internal = MiningModeConfig(mode="low")
        result = mining_mode_to_pyasic(internal)
        assert isinstance(result, MiningModeLPM)
        assert result.mode == "low"

    def test_builds_high_mode(self) -> None:
        try:
            from pyasic.config.mining import MiningModeHPM
        except ImportError:
            pytest.skip("pyasic not installed")

        internal = MiningModeConfig(mode="high")
        result = mining_mode_to_pyasic(internal)
        assert isinstance(result, MiningModeHPM)
        assert result.mode == "high"

    def test_builds_normal_mode_for_unknown(self) -> None:
        try:
            from pyasic.config.mining import MiningModeNormal
        except ImportError:
            pytest.skip("pyasic not installed")

        internal = MiningModeConfig(mode="normal")
        result = mining_mode_to_pyasic(internal)
        assert isinstance(result, MiningModeNormal)
        assert result.mode == "normal"

