"""
Unit tests for fan_mode_mapper (internal <-> pyasic FanModeConfig).
"""

import pytest

from app.mappers import fan_mode_from_pyasic, fan_mode_to_pyasic
from app.models import FanModeConfig


class TestFanModeFromPyasic:
    """Tests for fan_mode_from_pyasic (pyasic -> internal object)."""

    def test_returns_none_for_none(self) -> None:
        assert fan_mode_from_pyasic(None) is None

    def test_returns_none_when_no_mode_attribute(self) -> None:
        class NoMode:
            speed = 50
            minimum_fans = 2

        assert fan_mode_from_pyasic(NoMode()) is None

    def test_maps_manual_mode_to_internal(self) -> None:
        class FakeManual:
            mode = "manual"
            speed = 60
            minimum_fans = 1

        internal = fan_mode_from_pyasic(FakeManual())
        assert isinstance(internal, FanModeConfig)
        assert internal.mode == "manual"
        assert internal.speed == 60
        assert internal.minimum_fans == 1


class TestFanModeToPyasic:
    """Tests for fan_mode_to_pyasic (internal object -> pyasic FanMode*)."""

    def test_returns_default_when_internal_is_none(self) -> None:
        try:
            from pyasic.config.fans import FanModeNormal
        except ImportError:
            pytest.skip("pyasic not installed")

        result = fan_mode_to_pyasic(None)
        # FanModeConfig.default() returns a FanModeNormal instance.
        assert isinstance(result, FanModeNormal)
        assert result.mode == "normal"

    def test_builds_manual_mode_instance(self) -> None:
        try:
            from pyasic.config.fans import FanModeManual
        except ImportError:
            pytest.skip("pyasic not installed")

        internal = FanModeConfig(mode="manual", speed=55, minimum_fans=2)
        result = fan_mode_to_pyasic(internal)
        assert isinstance(result, FanModeManual)
        assert result.mode == "manual"
        assert result.speed == 55
        assert result.minimum_fans == 2

    def test_builds_immersion_mode_instance(self) -> None:
        try:
            from pyasic.config.fans import FanModeImmersion
        except ImportError:
            pytest.skip("pyasic not installed")

        internal = FanModeConfig(mode="immersion")
        result = fan_mode_to_pyasic(internal)
        assert isinstance(result, FanModeImmersion)
        assert result.mode == "immersion"

    def test_builds_normal_mode_instance_for_unknown_or_normal(self) -> None:
        try:
            from pyasic.config.fans import FanModeNormal
        except ImportError:
            pytest.skip("pyasic not installed")

        internal = FanModeConfig(mode="normal", minimum_fans=3)
        result = fan_mode_to_pyasic(internal)
        assert isinstance(result, FanModeNormal)
        assert result.mode == "normal"
        assert result.minimum_fans == 3

