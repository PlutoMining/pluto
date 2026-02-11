"""
Unit tests for app.models.extra_config.
"""

from app.models.extra_config import (
    BitaxeExtraConfig,
    get_extra_config_model_for_miner_type,
)


class TestGetExtraConfigModelForMinerType:
    """Tests for get_extra_config_model_for_miner_type helper."""

    def test_returns_none_for_empty_or_none(self) -> None:
        assert get_extra_config_model_for_miner_type(None) is None
        assert get_extra_config_model_for_miner_type("") is None

    def test_returns_none_for_unknown_miner_type(self) -> None:
        assert get_extra_config_model_for_miner_type("Antminer S19") is None
        assert get_extra_config_model_for_miner_type("Random Miner") is None

    def test_matches_bitaxe_case_insensitive_and_substring(self) -> None:
        # Case-insensitive match with extra words
        model_cls = get_extra_config_model_for_miner_type("BitAxe Gamma")
        assert model_cls is BitaxeExtraConfig

        model_cls = get_extra_config_model_for_miner_type("my-bitaxe-miner")
        assert model_cls is BitaxeExtraConfig

        model_cls = get_extra_config_model_for_miner_type("BITAXE ULTRA")
        assert model_cls is BitaxeExtraConfig

    def test_matches_espminer_pattern(self) -> None:
        model_cls = get_extra_config_model_for_miner_type("espminer")
        assert model_cls is BitaxeExtraConfig

        model_cls = get_extra_config_model_for_miner_type("ESPminer v2.0")
        assert model_cls is BitaxeExtraConfig

