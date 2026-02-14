"""
Unit tests for miner_detection (Bitaxe/espminer detection).
"""


from app.miner_detection import (
    ESPMINER_EXTRA_CONFIG_KEYS,
    is_bitaxe_from_data,
    is_bitaxe_model,
    is_espminer,
)


class TestIsBitaxeModel:
    """Test is_bitaxe_model."""

    def test_bitaxe_in_model(self):
        assert is_bitaxe_model("BitAxe Gamma") is True
        assert is_bitaxe_model("bitaxe-mini") is True

    def test_non_bitaxe_model(self):
        assert is_bitaxe_model("Antminer S19") is False
        assert is_bitaxe_model(None) is False


class TestIsBitaxeFromData:
    """Test is_bitaxe_from_data."""

    def test_bitaxe_in_device_info_make(self):
        assert is_bitaxe_from_data({"device_info": {"make": "Bitaxe", "model": "Gamma"}}) is True

    def test_bitaxe_in_device_info_model(self):
        assert is_bitaxe_from_data({"device_info": {"make": "Other", "model": "BitAxe Mini"}}) is True

    def test_bitaxe_in_top_level(self):
        assert is_bitaxe_from_data({"make": "Bitaxe", "model": "Gamma"}) is True
        assert is_bitaxe_from_data({"make": "Other", "model": "BitAxe"}) is True

    def test_non_bitaxe_data(self):
        assert is_bitaxe_from_data({"device_info": {"make": "Antminer", "model": "S19"}}) is False


class TestIsEspminer:
    """Test is_espminer (covers module path and existing_extra_config fallback)."""

    def test_detected_by_model(self):
        class Miner:
            model = "BitAxe Gamma"

        assert is_espminer(Miner()) is True

    def test_detected_by_class_name_bitaxe(self):
        class BitaxeMiner:
            model = None

        assert is_espminer(BitaxeMiner()) is True

    def test_detected_by_class_name_espminer(self):
        class EspMiner:
            model = None

        assert is_espminer(EspMiner()) is True

    def test_detected_by_module_espminer(self):
        """Cover is_espminer when __module__ contains 'espminer'."""
        class Miner:
            model = None

        Miner.__module__ = "pyasic.miners.espminer.bitaxe_gamma"
        assert is_espminer(Miner()) is True

    def test_detected_by_module_bitaxe(self):
        """Cover is_espminer when __module__ contains 'bitaxe'."""
        class Miner:
            model = None

        Miner.__module__ = "some.package.bitaxe.driver"
        assert is_espminer(Miner()) is True

    def test_detected_by_existing_extra_config_keys(self):
        """Cover is_espminer fallback via existing_extra_config with Bitaxe-shaped keys."""
        class GenericMiner:
            model = None

        GenericMiner.__name__ = "Miner"
        GenericMiner.__module__ = "pyasic.miners.unknown"
        miner = GenericMiner()
        # No model/class/module match; existing_extra_config has Bitaxe keys
        existing = {"frequency": 490, "core_voltage": 1100}
        assert is_espminer(miner, existing_extra_config=existing) is True

    def test_not_detected_without_existing_extra_config(self):
        """Generic miner with no model/class/module and no existing_extra_config."""
        class GenericMiner:
            model = None

        GenericMiner.__name__ = "Miner"
        GenericMiner.__module__ = "pyasic.miners.antminer"
        assert is_espminer(GenericMiner()) is False

    def test_existing_extra_config_non_dict_ignored(self):
        """existing_extra_config that is not a dict is ignored."""
        class GenericMiner:
            model = None

        GenericMiner.__name__ = "Miner"
        GenericMiner.__module__ = "other"
        assert is_espminer(GenericMiner(), existing_extra_config="not a dict") is False

    def test_espmimer_extra_config_keys_constant(self):
        """ESPMINER_EXTRA_CONFIG_KEYS contains expected Bitaxe keys."""
        assert "frequency" in ESPMINER_EXTRA_CONFIG_KEYS
        assert "core_voltage" in ESPMINER_EXTRA_CONFIG_KEYS
