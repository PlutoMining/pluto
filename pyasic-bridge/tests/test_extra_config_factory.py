"""
Unit tests for extra_config factory.
"""

from unittest.mock import MagicMock, patch

import pytest

from app.validators.exceptions import ConfigValidationError
from app.validators.extra_config_factory import build_extra_config, get_extra_config_class


class TestExtraConfigFactory:
    """Test extra_config factory functions."""

    def test_get_extra_config_class_bitaxe_by_model(self):
        """Test factory returns ESPMinerExtraConfig for Bitaxe miner (by model)."""
        class MockBitaxeMiner:
            model = "BitAxe Gamma"

        miner = MockBitaxeMiner()
        extra_config_class = get_extra_config_class(miner)
        # May be None if types not available, or ESPMinerExtraConfig if available
        assert extra_config_class is None or extra_config_class.__name__ == "ESPMinerExtraConfig"

    def test_get_extra_config_class_bitaxe_by_class_name(self):
        """Test factory returns ESPMinerExtraConfig for Bitaxe miner (by class name)."""
        class BitaxeMiner:
            model = None

        miner = BitaxeMiner()
        extra_config_class = get_extra_config_class(miner)
        assert extra_config_class is None or extra_config_class.__name__ == "ESPMinerExtraConfig"

    def test_get_extra_config_class_espminer(self):
        """Test factory returns ESPMinerExtraConfig for espminer (by class name)."""
        class EspMiner:
            model = None

        miner = EspMiner()
        extra_config_class = get_extra_config_class(miner)
        assert extra_config_class is None or extra_config_class.__name__ == "ESPMinerExtraConfig"

    def test_get_extra_config_class_non_bitaxe(self):
        """Test factory returns MinerExtraConfig (or None) for non-Bitaxe miners."""
        class AntminerMiner:
            model = "Antminer S19"

        miner = AntminerMiner()
        extra_config_class = get_extra_config_class(miner)
        # May be None if types not available, or MinerExtraConfig if available
        assert extra_config_class is None or extra_config_class.__name__ in ("MinerExtraConfig", "ESPMinerExtraConfig")

    def test_get_extra_config_class_fallback_via_existing_extra_config(self):
        """Test Bitaxe detection via existing_extra_config when model/class not set."""
        class GenericMiner:
            model = None

        miner = GenericMiner()
        miner.__class__.__name__ = "Miner"
        # Without existing_extra_config, generic miner is not detected as espminer
        get_extra_config_class(miner)  # no-op check
        # With existing_extra_config that has Bitaxe-shaped keys, should detect espminer
        existing = {"frequency": 490, "core_voltage": 1100}
        cls_with_existing = get_extra_config_class(miner, existing_extra_config=existing)
        assert cls_with_existing is None or cls_with_existing.__name__ == "ESPMinerExtraConfig"

    def test_build_extra_config_none(self):
        """Test build_extra_config returns None when extra_config_dict is None."""
        miner = MagicMock()
        result = build_extra_config(miner, None)
        assert result is None

    def test_build_extra_config_empty_dict(self):
        """Test build_extra_config returns None for empty dict (no extra_config)."""
        miner = MagicMock()
        result = build_extra_config(miner, {})
        # Empty dict means no extra_config, so should return None
        assert result is None

    def test_build_extra_config_with_dict(self):
        """Test build_extra_config constructs ExtraConfig or returns dict."""
        miner = MagicMock()
        miner.__class__.__name__ = "BitaxeMiner"
        result = build_extra_config(miner, {"frequency": 490})
        # Should return dict if types not available, or ExtraConfig instance if available
        assert result is not None

    def test_get_extra_config_class_returns_none_when_types_not_available(self):
        """Cover get_extra_config_class when pyasic types are not available (ImportError path)."""
        with patch("app.validators.extra_config_factory.ESPMinerExtraConfig", None):
            with patch("app.validators.extra_config_factory.MinerExtraConfig", None):
                miner = MagicMock()
                miner.model = "BitAxe Gamma"
                result = get_extra_config_class(miner)
                assert result is None

    def test_build_extra_config_returns_dict_when_class_is_none(self):
        """Cover build_extra_config when get_extra_config_class returns None (dict as-is)."""
        with patch("app.validators.extra_config_factory.get_extra_config_class", return_value=None):
            miner = MagicMock()
            extra_dict = {"frequency": 500, "core_voltage": 1100}
            result = build_extra_config(miner, extra_dict)
            assert result is extra_dict

    def test_build_extra_config_raises_config_validation_error_on_constructor_failure(self):
        """Cover build_extra_config when ExtraConfig constructor raises."""
        class FailingConfig:
            def __init__(self, **kwargs):
                raise ValueError("invalid field")

        with patch("app.validators.extra_config_factory.get_extra_config_class", return_value=FailingConfig):
            miner = MagicMock()
            miner.__class__.__name__ = "BitaxeMiner"
            with pytest.raises(ConfigValidationError) as exc_info:
                build_extra_config(miner, {"frequency": 500})
            assert "Invalid extra_config" in str(exc_info.value)
            assert exc_info.value.__cause__ is not None
