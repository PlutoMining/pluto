"""
Unit tests for config validators.
"""

import pytest

from app.validators import (
    BitaxeConfigValidator,
    ConfigValidationError,
    ConfigValidator,
    get_config_validator,
)


class TestConfigValidator:
    """Test base ConfigValidator."""

    def test_base_validator_no_validation(self):
        """Test that base validator does nothing (no-op)."""
        validator = ConfigValidator()
        # Should not raise
        validator.validate({}, None)
        validator.validate({"extra_config": {"frequency": 999}}, None)


class TestBitaxeConfigValidator:
    """Test BitaxeConfigValidator."""

    def test_bitaxe_validator_valid_frequency(self):
        """Test Bitaxe validator accepts valid frequencies."""
        validator = BitaxeConfigValidator()
        mock_miner = None  # Not used in validator

        # All valid frequencies should pass
        for freq in [400, 490, 525, 550, 600, 625]:
            validator.validate({"extra_config": {"frequency": freq}}, mock_miner)

    def test_bitaxe_validator_invalid_frequency(self):
        """Test Bitaxe validator rejects invalid frequencies."""
        validator = BitaxeConfigValidator()
        mock_miner = None

        # Invalid frequencies should raise ConfigValidationError
        with pytest.raises(ConfigValidationError, match="Invalid frequency.*Accepted values are"):
            validator.validate({"extra_config": {"frequency": 500}}, mock_miner)

        with pytest.raises(ConfigValidationError, match="Invalid frequency.*Accepted values are"):
            validator.validate({"extra_config": {"frequency": 999}}, mock_miner)

    def test_bitaxe_validator_no_extra_config(self):
        """Test Bitaxe validator ignores configs without extra_config."""
        validator = BitaxeConfigValidator()
        mock_miner = None

        # Should not raise if extra_config is missing
        validator.validate({}, mock_miner)
        validator.validate({"pools": {}}, mock_miner)

    def test_bitaxe_validator_no_frequency(self):
        """Test Bitaxe validator ignores extra_config without frequency."""
        validator = BitaxeConfigValidator()
        mock_miner = None

        # Should not raise if frequency is missing from extra_config
        validator.validate({"extra_config": {}}, mock_miner)
        validator.validate({"extra_config": {"other_field": 123}}, mock_miner)


class TestConfigValidatorFactory:
    """Test config validator factory."""

    def test_get_validator_bitaxe_by_model(self):
        """Test factory returns Bitaxe validator for Bitaxe miner (by model)."""
        class MockBitaxeMiner:
            model = "BitAxe Gamma"

        miner = MockBitaxeMiner()
        validator = get_config_validator(miner)
        assert isinstance(validator, BitaxeConfigValidator)

    def test_get_validator_bitaxe_by_class_name(self):
        """Test factory returns Bitaxe validator for Bitaxe miner (by class name)."""
        class BitaxeMiner:
            model = None

        miner = BitaxeMiner()
        validator = get_config_validator(miner)
        assert isinstance(validator, BitaxeConfigValidator)

    def test_get_validator_espminer_by_class_name(self):
        """Test factory returns Bitaxe validator for espminer (by class name)."""
        class EspMiner:
            model = None

        miner = EspMiner()
        validator = get_config_validator(miner)
        assert isinstance(validator, BitaxeConfigValidator)

    def test_get_validator_non_bitaxe(self):
        """Test factory returns default validator for non-Bitaxe miners."""
        class AntminerMiner:
            model = "Antminer S19"

        miner = AntminerMiner()
        validator = get_config_validator(miner)
        assert isinstance(validator, ConfigValidator)
        assert not isinstance(validator, BitaxeConfigValidator)

    def test_bitaxe_validator_valid_core_voltage(self):
        """Test Bitaxe validator accepts valid core voltages."""
        validator = BitaxeConfigValidator()
        mock_miner = None

        # All valid core voltages should pass
        for voltage in [1000, 1060, 1100, 1150, 1200, 1250]:
            validator.validate({"extra_config": {"core_voltage": voltage}}, mock_miner)

    def test_bitaxe_validator_invalid_core_voltage(self):
        """Test Bitaxe validator rejects invalid core voltages."""
        validator = BitaxeConfigValidator()
        mock_miner = None

        # Invalid core voltages should raise ConfigValidationError
        with pytest.raises(ConfigValidationError, match="Invalid core_voltage.*Accepted values are"):
            validator.validate({"extra_config": {"core_voltage": 1050}}, mock_miner)

        with pytest.raises(ConfigValidationError, match="Invalid core_voltage.*Accepted values are"):
            validator.validate({"extra_config": {"core_voltage": 1300}}, mock_miner)

    def test_bitaxe_validator_none_frequency(self):
        """Test Bitaxe validator handles None frequency."""
        validator = BitaxeConfigValidator()
        mock_miner = None

        # Should not raise if frequency is None
        validator.validate({"extra_config": {"frequency": None}}, mock_miner)

    def test_bitaxe_validator_none_core_voltage(self):
        """Test Bitaxe validator handles None core_voltage."""
        validator = BitaxeConfigValidator()
        mock_miner = None

        # Should not raise if core_voltage is None
        validator.validate({"extra_config": {"core_voltage": None}}, mock_miner)

    def test_bitaxe_field_names_fallback(self):
        """Test _bitaxe_extra_config_field_names fallback when ESPMinerExtraConfig not available."""
        from app.validators.bitaxe import _bitaxe_extra_config_field_names, BitaxeExtraConfig
        
        # This tests the fallback path when ESPMinerExtraConfig is None or doesn't have model_fields/__annotations__
        # The function should fall back to BitaxeExtraConfig.model_fields
        field_names = _bitaxe_extra_config_field_names()
        assert isinstance(field_names, frozenset)
        # Should include fields from BitaxeExtraConfig
        assert len(field_names) > 0
