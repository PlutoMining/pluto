"""
Tests for normalizer factory.
"""

from app.normalizers import (
    BitaxeMinerDataNormalizer,
    DefaultMinerDataNormalizer,
    NormalizerFactory,
    get_normalizer_for_miner,
)


class TestNormalizerFactory:
    """Test NormalizerFactory class."""

    def test_get_normalizer_for_bitaxe_by_make(self):
        """Test factory returns Bitaxe normalizer for Bitaxe miner (by make)."""
        factory = NormalizerFactory()
        data = {"make": "BitAxe", "model": "Gamma"}
        normalizer = factory.get_normalizer(data)
        assert isinstance(normalizer, BitaxeMinerDataNormalizer)

    def test_get_normalizer_for_bitaxe_by_model(self):
        """Test factory returns Bitaxe normalizer for Bitaxe miner (by model)."""
        factory = NormalizerFactory()
        data = {"make": "Other", "model": "BitAxe Gamma"}
        normalizer = factory.get_normalizer(data)
        assert isinstance(normalizer, BitaxeMinerDataNormalizer)

    def test_get_normalizer_for_bitaxe_by_hostname(self):
        """Test factory returns Bitaxe normalizer for Bitaxe miner (by hostname)."""
        factory = NormalizerFactory()
        data = {"make": "Other", "model": "Other", "hostname": "bitaxe-001"}
        normalizer = factory.get_normalizer(data)
        assert isinstance(normalizer, BitaxeMinerDataNormalizer)

    def test_get_normalizer_for_default_miner(self):
        """Test factory returns default normalizer for non-Bitaxe miner."""
        factory = NormalizerFactory()
        data = {"make": "Antminer", "model": "S19"}
        normalizer = factory.get_normalizer(data)
        assert isinstance(normalizer, DefaultMinerDataNormalizer)

    def test_get_normalizer_case_insensitive(self):
        """Test factory is case insensitive for miner detection."""
        factory = NormalizerFactory()

        # Test uppercase
        data = {"make": "BITAXE"}
        normalizer = factory.get_normalizer(data)
        assert isinstance(normalizer, BitaxeMinerDataNormalizer)

        # Test lowercase
        data = {"make": "bitaxe"}
        normalizer = factory.get_normalizer(data)
        assert isinstance(normalizer, BitaxeMinerDataNormalizer)

        # Test mixed case
        data = {"make": "BiTaXe"}
        normalizer = factory.get_normalizer(data)
        assert isinstance(normalizer, BitaxeMinerDataNormalizer)

    def test_get_normalizer_empty_data(self):
        """Test factory returns default normalizer for empty data."""
        factory = NormalizerFactory()
        data = {}
        normalizer = factory.get_normalizer(data)
        assert isinstance(normalizer, DefaultMinerDataNormalizer)

    def test_get_normalizer_none_values(self):
        """Test factory handles None values gracefully."""
        factory = NormalizerFactory()
        data = {"make": None, "model": None, "hostname": None}
        normalizer = factory.get_normalizer(data)
        assert isinstance(normalizer, DefaultMinerDataNormalizer)

    def test_get_normalizer_non_string_types(self):
        """Test factory handles non-string types gracefully."""
        factory = NormalizerFactory()

        # Test with numeric values (should not match)
        data = {"make": 123, "model": 456}
        normalizer = factory.get_normalizer(data)
        assert isinstance(normalizer, DefaultMinerDataNormalizer)

        # Test with mixed types including valid string
        data = {"make": "BITAXE", "model": 123}
        normalizer = factory.get_normalizer(data)
        assert isinstance(normalizer, BitaxeMinerDataNormalizer)

    def test_get_normalizer_case_insensitive_variations(self):
        """Test various case-insensitive variations of Bitaxe."""
        factory = NormalizerFactory()

        test_cases = [
            "BITAXE",
            "bitaxe",
            "BitAxe",
            "BiTaXe",
            "BITaxe",
            "bitAXE",
        ]

        for make_value in test_cases:
            data = {"make": make_value}
            normalizer = factory.get_normalizer(data)
            assert isinstance(normalizer, BitaxeMinerDataNormalizer), \
                f"Failed for make='{make_value}'"

    def test_factory_reuses_instances(self):
        """Test factory reuses normalizer instances."""
        factory = NormalizerFactory()
        data1 = {"make": "BitAxe"}
        data2 = {"make": "BitAxe"}

        normalizer1 = factory.get_normalizer(data1)
        normalizer2 = factory.get_normalizer(data2)

        # Should be the same instance (reused)
        assert normalizer1 is normalizer2


class TestGetNormalizerForMiner:
    """Test get_normalizer_for_miner convenience function."""

    def test_get_normalizer_for_bitaxe(self):
        """Test convenience function returns Bitaxe normalizer."""
        data = {"make": "BitAxe"}
        normalizer = get_normalizer_for_miner(data)
        assert isinstance(normalizer, BitaxeMinerDataNormalizer)

    def test_get_normalizer_for_default(self):
        """Test convenience function returns default normalizer."""
        data = {"make": "Antminer"}
        normalizer = get_normalizer_for_miner(data)
        assert isinstance(normalizer, DefaultMinerDataNormalizer)
