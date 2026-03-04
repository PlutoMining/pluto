"""
Comprehensive tests for BitaxeMinerDataNormalizer.
"""

from app.normalizers import BitaxeMinerDataNormalizer


class TestBitaxeMinerDataNormalizer:
    """Test BitaxeMinerDataNormalizer class."""

    def test_normalize_bitaxe_miner_with_extra_fields(self):
        """Test normalizing Bitaxe miner data with extra_fields."""
        normalizer = BitaxeMinerDataNormalizer()
        data = {
            "hashrate": {"rate": 1.0, "unit": 1000000000},
            "device_info": {
                "make": "BitAxe",
                "model": "Gamma"
            },
            "wattage": 50.0,
            "extra_fields": {
                "custom_efficiency": "1.8e-11",
                "custom_difficulty": 123456789,
                "temperature_custom": "65.5",
                "power_custom": "50"
            }
        }
        result = normalizer.normalize(data)

        assert "extra_fields" in result
        extra = result["extra_fields"]
        # Efficiency-like field should be normalized to structure
        assert "custom_efficiency" in extra
        assert isinstance(extra["custom_efficiency"], dict)
        assert extra["custom_efficiency"]["unit"]["suffix"] == "J/Th"
        # Difficulty-like field should be converted to string
        assert extra["custom_difficulty"] == "123456789"
        # Temperature-like field should be converted to float
        assert extra["temperature_custom"] == 65.5
        # Power-like field should be converted to float
        assert extra["power_custom"] == 50.0

    def test_normalize_non_bitaxe_miner(self):
        """Test that non-Bitaxe miners get default normalization."""
        normalizer = BitaxeMinerDataNormalizer()
        data = {
            "hashrate": {"rate": 1.0, "unit": 1000000000},
            "make": "Antminer",
            "model": "S19",
            "extra_fields": {
                "custom_efficiency": "1.8e-11",
                "custom_difficulty": 123456789
            }
        }
        result = normalizer.normalize(data)

        # Should still normalize hashrate-like structures (from parent)
        assert "extra_fields" in result
        # But Bitaxe-specific normalization should not apply
        extra = result["extra_fields"]
        # Efficiency-like fields are only normalized for Bitaxe miners
        assert "custom_efficiency" in extra
        # Difficulty-like fields are only normalized for Bitaxe miners
        assert "custom_difficulty" in extra
        # For non-Bitaxe, these should remain as-is (not normalized)
        assert extra["custom_efficiency"] == "1.8e-11"
        assert extra["custom_difficulty"] == 123456789

    def test_is_bitaxe_miner_detection(self):
        """Test Bitaxe miner detection logic."""
        normalizer = BitaxeMinerDataNormalizer()

        # Test with device_info.make
        assert normalizer._is_bitaxe_miner({"device_info": {"make": "BitAxe"}})
        assert normalizer._is_bitaxe_miner({"device_info": {"make": "bitaxe"}})
        assert normalizer._is_bitaxe_miner({"device_info": {"make": "BITAXE"}})
        assert not normalizer._is_bitaxe_miner({"device_info": {"make": "Antminer"}})
        assert not normalizer._is_bitaxe_miner({"device_info": {"make": None}})
        assert not normalizer._is_bitaxe_miner({"device_info": {}})

        # Test with device_info.model
        assert normalizer._is_bitaxe_miner({"device_info": {"model": "BitAxe Gamma"}})
        assert normalizer._is_bitaxe_miner({"device_info": {"model": "bitaxe-supra"}})
        assert normalizer._is_bitaxe_miner({"device_info": {"model": "BitAxe"}})
        assert not normalizer._is_bitaxe_miner({"device_info": {"model": "S19"}})
        assert not normalizer._is_bitaxe_miner({"device_info": {"model": None}})

        # Test case insensitive
        assert normalizer._is_bitaxe_miner({"device_info": {"make": "BITAXE"}})
        assert normalizer._is_bitaxe_miner({"device_info": {"model": "BitAxe"}})

        # Test with multiple indicators
        assert normalizer._is_bitaxe_miner({
            "device_info": {
                "make": "Other",
                "model": "BitAxe Gamma"
            }
        })

        # Test with missing device_info
        assert not normalizer._is_bitaxe_miner({})
        assert not normalizer._is_bitaxe_miner({"device_info": None})

    def test_normalize_bitaxe_extra_fields_with_hashrate_like(self):
        """Test that hashrate-like structures in extra_fields are normalized."""
        normalizer = BitaxeMinerDataNormalizer()
        data = {
            "hashrate": {"rate": 1.0, "unit": 1000000000},
            "device_info": {"make": "BitAxe"},
            "extra_fields": {
                "secondary_hashrate": {
                    "rate": 500000000.0,
                    "unit": {"value": 1, "suffix": "H/s"}
                }
            }
        }
        result = normalizer.normalize(data)

        assert "extra_fields" in result
        extra = result["extra_fields"]
        assert "secondary_hashrate" in extra
        # Should be normalized by parent class (hashrate-like structure)
        assert isinstance(extra["secondary_hashrate"], dict)
        assert "rate" in extra["secondary_hashrate"]
        assert extra["secondary_hashrate"]["unit"]["suffix"] == "Gh/s"

    def test_normalize_bitaxe_extra_fields_none(self):
        """Test normalizing Bitaxe miner with None extra_fields."""
        normalizer = BitaxeMinerDataNormalizer()
        data = {
            "hashrate": {"rate": 1.0, "unit": 1000000000},
            "device_info": {"make": "BitAxe"},
            "extra_fields": None
        }
        result = normalizer.normalize(data)

        assert result["extra_fields"] is None

    def test_normalize_bitaxe_extra_fields_invalid_difficulty(self):
        """Test handling of invalid difficulty values in extra_fields."""
        normalizer = BitaxeMinerDataNormalizer()
        data = {
            "hashrate": {"rate": 1.0, "unit": 1000000000},
            "device_info": {"make": "BitAxe"},
            "extra_fields": {
                "invalid_difficulty": "not_a_number"
            }
        }
        result = normalizer.normalize(data)

        assert "extra_fields" in result
        extra = result["extra_fields"]
        # Should default to "0" for invalid difficulty
        assert extra["invalid_difficulty"] == "0"

    def test_normalize_bitaxe_efficiency_fields(self):
        """Test normalization of efficiency-like fields in extra_fields."""
        normalizer = BitaxeMinerDataNormalizer()
        data = {
            "hashrate": {"rate": 1.0, "unit": 1000000000},
            "device_info": {"make": "BitAxe"},
            "wattage": 50.0,
            "extra_fields": {
                "efficiency_custom": "1.8e-11",
                "efficiency_alt": 1.8e-11,
                "not_efficiency": "some_value"
            }
        }
        result = normalizer.normalize(data)

        extra = result["extra_fields"]
        # Efficiency-like fields should be normalized
        assert isinstance(extra["efficiency_custom"], dict)
        assert extra["efficiency_custom"]["unit"]["suffix"] == "J/Th"
        assert isinstance(extra["efficiency_alt"], dict)
        # Non-efficiency fields should remain unchanged
        assert extra["not_efficiency"] == "some_value"

    def test_normalize_bitaxe_temperature_fields(self):
        """Test normalization of temperature-like fields in extra_fields."""
        normalizer = BitaxeMinerDataNormalizer()
        data = {
            "hashrate": {"rate": 1.0, "unit": 1000000000},
            "device_info": {"make": "BitAxe"},
            "extra_fields": {
                "temp_cpu": "65.5",
                "temp_board": 70,
                "temperature_avg": "75.2",
                "not_temp": "some_value"
            }
        }
        result = normalizer.normalize(data)

        extra = result["extra_fields"]
        # Temperature-like fields should be converted to float
        assert extra["temp_cpu"] == 65.5
        assert extra["temp_board"] == 70.0
        assert extra["temperature_avg"] == 75.2
        # Non-temperature fields should remain unchanged
        assert extra["not_temp"] == "some_value"

    def test_normalize_bitaxe_power_fields(self):
        """Test normalization of power-like fields in extra_fields."""
        normalizer = BitaxeMinerDataNormalizer()
        data = {
            "hashrate": {"rate": 1.0, "unit": 1000000000},
            "device_info": {"make": "BitAxe"},
            "extra_fields": {
                "wattage_custom": "50",
                "power_consumption": 45.5,
                "watt": "60",
                "not_power": "some_value"
            }
        }
        result = normalizer.normalize(data)

        extra = result["extra_fields"]
        # Power-like fields should be converted to float
        assert extra["wattage_custom"] == 50.0
        assert extra["power_consumption"] == 45.5
        assert extra["watt"] == 60.0
        # Non-power fields should remain unchanged
        assert extra["not_power"] == "some_value"

    def test_normalize_bitaxe_all_field_types(self):
        """Test normalization of all Bitaxe-specific field types together."""
        normalizer = BitaxeMinerDataNormalizer()
        data = {
            "hashrate": {"rate": 1.0, "unit": 1000000000},
            "device_info": {"make": "BitAxe"},
            "wattage": 50.0,
            "extra_fields": {
                "efficiency_custom": "1.8e-11",
                "difficulty_custom": 123456789,
                "temp_custom": "65.5",
                "power_custom": "50",
                "regular_field": "unchanged"
            }
        }
        result = normalizer.normalize(data)

        extra = result["extra_fields"]
        assert isinstance(extra["efficiency_custom"], dict)
        assert extra["difficulty_custom"] == "123456789"
        assert extra["temp_custom"] == 65.5
        assert extra["power_custom"] == 50.0
        assert extra["regular_field"] == "unchanged"

    def test_normalize_bitaxe_inherits_default_behavior(self):
        """Test that Bitaxe normalizer inherits all default normalization."""
        normalizer = BitaxeMinerDataNormalizer()
        data = {
            "hashrate": {"rate": 1.0, "unit": 1000000000},
            "device_info": {"make": "BitAxe"},
            "best_difficulty": 123456789,
            "efficiency": "1.8e-11",
            "wattage": 50.0
        }
        result = normalizer.normalize(data)

        # Should have all default normalizations
        assert result["hashrate"]["unit"]["suffix"] == "Gh/s"
        assert result["best_difficulty"] == "123456789"
        assert isinstance(result["efficiency"], dict)
        assert result["efficiency"]["unit"]["suffix"] == "J/Th"

    def test_normalize_bitaxe_extra_fields_non_dict(self):
        """Test normalizing Bitaxe miner with non-dict extra_fields."""
        normalizer = BitaxeMinerDataNormalizer()
        data = {
            "hashrate": {"rate": 1.0, "unit": 1000000000},
            "device_info": {"make": "BitAxe"},
            "extra_fields": ["list", "value"]
        }
        result = normalizer.normalize(data)

        # Should return the list as-is (already normalized by parent)
        assert result["extra_fields"] == ["list", "value"]

    def test_normalize_bitaxe_efficiency_field_exception(self):
        """Test handling of exception when normalizing efficiency field."""
        normalizer = BitaxeMinerDataNormalizer()
        # Create a scenario that might cause an exception
        # Use a value that can't be normalized but matches efficiency pattern
        data = {
            "hashrate": {"rate": 1.0, "unit": 1000000000},
            "device_info": {"make": "BitAxe"},
            "wattage": 50.0,
            "extra_fields": {
                "efficiency_custom": object()  # Object that can't be converted
            }
        }
        result = normalizer.normalize(data)

        # Should keep original value if normalization fails
        extra = result["extra_fields"]
        # The value should remain as object (or be handled gracefully)
        assert "efficiency_custom" in extra

    def test_normalize_bitaxe_difficulty_none_value(self):
        """Test handling of None value in difficulty field."""
        normalizer = BitaxeMinerDataNormalizer()
        data = {
            "hashrate": {"rate": 1.0, "unit": 1000000000},
            "device_info": {"make": "BitAxe"},
            "extra_fields": {
                "difficulty_custom": None
            }
        }
        result = normalizer.normalize(data)

        extra = result["extra_fields"]
        assert extra["difficulty_custom"] == "0"
