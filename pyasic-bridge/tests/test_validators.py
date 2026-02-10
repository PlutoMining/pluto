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

    def test_bitaxe_validator_valid_rotation(self):
        """Test Bitaxe validator accepts valid rotation values."""
        validator = BitaxeConfigValidator()
        mock_miner = None

        # All valid rotations should pass
        for rotation in [0, 90, 180, 270]:
            validator.validate({"extra_config": {"rotation": rotation}}, mock_miner)

    def test_bitaxe_validator_invalid_rotation(self):
        """Test Bitaxe validator rejects invalid rotation values."""
        validator = BitaxeConfigValidator()
        mock_miner = None

        # Invalid rotations should raise ConfigValidationError
        with pytest.raises(ConfigValidationError, match="Invalid rotation.*Accepted values are"):
            validator.validate({"extra_config": {"rotation": 45}}, mock_miner)

        with pytest.raises(ConfigValidationError, match="Invalid rotation.*Accepted values are"):
            validator.validate({"extra_config": {"rotation": 360}}, mock_miner)

    def test_bitaxe_validator_none_rotation(self):
        """Test Bitaxe validator handles None rotation."""
        validator = BitaxeConfigValidator()
        mock_miner = None

        # Should not raise if rotation is None
        validator.validate({"extra_config": {"rotation": None}}, mock_miner)

    def test_bitaxe_validator_valid_invertscreen(self):
        """Test Bitaxe validator accepts valid invertscreen values."""
        validator = BitaxeConfigValidator()
        mock_miner = None

        # All valid invertscreen values should pass
        for invertscreen in [0, 1]:
            validator.validate({"extra_config": {"invertscreen": invertscreen}}, mock_miner)

    def test_bitaxe_validator_invalid_invertscreen(self):
        """Test Bitaxe validator rejects invalid invertscreen values."""
        validator = BitaxeConfigValidator()
        mock_miner = None

        # Invalid invertscreen values should raise ConfigValidationError
        with pytest.raises(ConfigValidationError, match="Invalid invertscreen.*Accepted values are"):
            validator.validate({"extra_config": {"invertscreen": 2}}, mock_miner)

        with pytest.raises(ConfigValidationError, match="Invalid invertscreen.*Accepted values are"):
            validator.validate({"extra_config": {"invertscreen": -1}}, mock_miner)

    def test_bitaxe_validator_none_invertscreen(self):
        """Test Bitaxe validator handles None invertscreen."""
        validator = BitaxeConfigValidator()
        mock_miner = None

        # Should not raise if invertscreen is None
        validator.validate({"extra_config": {"invertscreen": None}}, mock_miner)

    def test_bitaxe_validator_valid_display_timeout(self):
        """Test Bitaxe validator accepts valid display_timeout values."""
        validator = BitaxeConfigValidator()
        mock_miner = None

        # All valid display_timeout values should pass
        for timeout in [-1, 1, 2, 5, 15, 30, 60, 120, 240, 480]:
            validator.validate({"extra_config": {"display_timeout": timeout}}, mock_miner)

    def test_bitaxe_validator_invalid_display_timeout(self):
        """Test Bitaxe validator rejects invalid display_timeout values."""
        validator = BitaxeConfigValidator()
        mock_miner = None

        # Invalid display_timeout values should raise ConfigValidationError
        with pytest.raises(ConfigValidationError, match="Invalid display_timeout.*Accepted values are"):
            validator.validate({"extra_config": {"display_timeout": 0}}, mock_miner)

        with pytest.raises(ConfigValidationError, match="Invalid display_timeout.*Accepted values are"):
            validator.validate({"extra_config": {"display_timeout": 3}}, mock_miner)

        with pytest.raises(ConfigValidationError, match="Invalid display_timeout.*Accepted values are"):
            validator.validate({"extra_config": {"display_timeout": 500}}, mock_miner)

    def test_bitaxe_validator_none_display_timeout(self):
        """Test Bitaxe validator handles None display_timeout."""
        validator = BitaxeConfigValidator()
        mock_miner = None

        # Should not raise if display_timeout is None
        validator.validate({"extra_config": {"display_timeout": None}}, mock_miner)

    def test_bitaxe_field_names_fallback(self):
        """Test _bitaxe_extra_config_field_names fallback when ESPMinerExtraConfig not available."""
        from app.validators.bitaxe import _bitaxe_extra_config_field_names

        # This tests the fallback path when ESPMinerExtraConfig is None or doesn't have model_fields/__annotations__
        # The function should fall back to BitaxeExtraConfig.model_fields
        field_names = _bitaxe_extra_config_field_names()
        assert isinstance(field_names, frozenset)
        # Should include fields from BitaxeExtraConfig
        assert len(field_names) > 0


class TestBitaxeExtraConfigModel:
    """Direct tests for BitaxeExtraConfig model and helper."""

    def test_non_int_values_trigger_before_validator_but_fail_type(self):
        """Passing non-int values should go through 'not isinstance(int)' branch before type error."""
        from pydantic import ValidationError

        from app.validators.bitaxe import BitaxeExtraConfig

        # Each of these should raise ValidationError due to type mismatch,
        # but will exercise the validators' non-int branches first.
        with pytest.raises(ValidationError):
            BitaxeExtraConfig(rotation="90")  # type: ignore[arg-type]
        with pytest.raises(ValidationError):
            BitaxeExtraConfig(invertscreen="1")  # type: ignore[arg-type]
        with pytest.raises(ValidationError):
            BitaxeExtraConfig(display_timeout="30")  # type: ignore[arg-type]
        with pytest.raises(ValidationError):
            BitaxeExtraConfig(overheat_mode="1")  # type: ignore[arg-type]
        with pytest.raises(ValidationError):
            BitaxeExtraConfig(overclock_enabled="1")  # type: ignore[arg-type]
        with pytest.raises(ValidationError):
            BitaxeExtraConfig(frequency="490")  # type: ignore[arg-type]
        with pytest.raises(ValidationError):
            BitaxeExtraConfig(core_voltage="1100")  # type: ignore[arg-type]

    def test_bitaxe_extra_config_field_names_from_espm_config_model_fields(self, monkeypatch):
        """_bitaxe_extra_config_field_names should use ESPMinerExtraConfig.model_fields when available."""
        import app.validators.bitaxe as bitaxe_mod

        class DummyESPM:
            model_fields = {"rotation": int, "frequency": int}

        monkeypatch.setattr(bitaxe_mod, "ESPMinerExtraConfig", DummyESPM)

        field_names = bitaxe_mod._bitaxe_extra_config_field_names()
        assert field_names == frozenset(DummyESPM.model_fields)

    def test_bitaxe_extra_config_field_names_from_espm_config_annotations(self, monkeypatch):
        """_bitaxe_extra_config_field_names should use ESPMinerExtraConfig.__annotations__ when model_fields absent."""
        import app.validators.bitaxe as bitaxe_mod

        class DummyESPM2:
            __annotations__ = {"core_voltage": int, "min_fan_speed": int}

        monkeypatch.setattr(bitaxe_mod, "ESPMinerExtraConfig", DummyESPM2)

        field_names = bitaxe_mod._bitaxe_extra_config_field_names()
        assert field_names == frozenset(DummyESPM2.__annotations__)

