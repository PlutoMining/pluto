"""
Unit tests for temperature_mapper (internal <-> pyasic TemperatureConfig).
"""

import pytest

from app.mappers import temperature_from_pyasic, temperature_to_pyasic
from app.models import TemperatureConfig


class TestTemperatureFromPyasic:
    """Tests for temperature_from_pyasic (pyasic -> internal object)."""

    def test_returns_none_for_none(self) -> None:
        assert temperature_from_pyasic(None) is None

    def test_maps_basic_fields(self) -> None:
        class FakeTemp:
            target = 80
            hot = 90
            danger = 100

        internal = temperature_from_pyasic(FakeTemp())
        assert isinstance(internal, TemperatureConfig)
        assert internal.target == 80
        assert internal.hot == 90
        assert internal.danger == 100


class TestTemperatureToPyasic:
    """Tests for temperature_to_pyasic (internal object -> pyasic TemperatureConfig)."""

    def test_returns_default_when_internal_is_none(self) -> None:
        try:
            from pyasic.config.temperature import TemperatureConfig as PyasicTemperatureConfig
        except ImportError:
            pytest.skip("pyasic not installed")

        result = temperature_to_pyasic(None)
        assert isinstance(result, PyasicTemperatureConfig)

    def test_builds_temperature_config_with_values(self) -> None:
        try:
            from pyasic.config.temperature import TemperatureConfig as PyasicTemperatureConfig
        except ImportError:
            pytest.skip("pyasic not installed")

        internal = TemperatureConfig(target=70, hot=80, danger=90)
        result = temperature_to_pyasic(internal)
        assert isinstance(result, PyasicTemperatureConfig)
        assert result.target == 70
        assert result.hot == 80
        assert result.danger == 90

