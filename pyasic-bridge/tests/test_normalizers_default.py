"""
Comprehensive tests for DefaultMinerDataNormalizer.
"""

from app.normalizers import DefaultMinerDataNormalizer


class TestDefaultMinerDataNormalizer:
    """Test DefaultMinerDataNormalizer class."""

    def test_normalize_complete_data(self):
        """Test normalizing complete miner data."""
        normalizer = DefaultMinerDataNormalizer()
        data = {
            "hashrate": {"rate": 1.0, "unit": {"value": 1000000000, "suffix": "GH/s"}},
            "best_difficulty": 123456789,
            "best_session_difficulty": 987654321,
            "efficiency": "1.8e-11",
            "wattage": 50.0,
            "model": "TestMiner",
            "hostname": "test-miner"
        }
        result = normalizer.normalize(data)

        assert "hashrate" in result
        assert isinstance(result["hashrate"], dict)
        assert result["hashrate"]["unit"]["suffix"] == "Gh/s"
        assert result["best_difficulty"] == "123456789"
        assert result["best_session_difficulty"] == "987654321"
        assert "efficiency" in result
        assert isinstance(result["efficiency"], dict)

    def test_normalize_missing_hashrate(self):
        """Test normalizing data with missing hashrate."""
        normalizer = DefaultMinerDataNormalizer()
        data = {"wattage": 50.0}
        result = normalizer.normalize(data)

        assert "hashrate" in result
        assert result["hashrate"]["rate"] == 0.0
        assert result["hashrate"]["unit"]["suffix"] == "Gh/s"

    def test_normalize_none_hashrate(self):
        """Test normalizing data with None hashrate."""
        normalizer = DefaultMinerDataNormalizer()
        data = {"hashrate": None, "wattage": 50.0}
        result = normalizer.normalize(data)

        assert result["hashrate"]["rate"] == 0.0

    def test_normalize_missing_difficulty(self):
        """Test normalizing data with missing difficulty fields."""
        normalizer = DefaultMinerDataNormalizer()
        data = {"hashrate": {"rate": 1.0, "unit": 1000000000}}
        result = normalizer.normalize(data)

        assert result["best_difficulty"] == "0"
        assert result["best_session_difficulty"] == "0"

    def test_normalize_none_difficulty(self):
        """Test normalizing data with None difficulty."""
        normalizer = DefaultMinerDataNormalizer()
        data = {
            "hashrate": {"rate": 1.0, "unit": 1000000000},
            "best_difficulty": None,
            "best_session_difficulty": None
        }
        result = normalizer.normalize(data)

        assert result["best_difficulty"] == "0"
        assert result["best_session_difficulty"] == "0"

    def test_normalize_large_difficulty(self):
        """Test normalizing large difficulty values."""
        normalizer = DefaultMinerDataNormalizer()
        data = {
            "hashrate": {"rate": 1.0, "unit": 1000000000},
            "best_difficulty": 12345678901234567890
        }
        result = normalizer.normalize(data)

        assert result["best_difficulty"] == "12345678901234567890"

    def test_normalize_invalid_difficulty(self):
        """Test normalizing invalid difficulty values."""
        normalizer = DefaultMinerDataNormalizer()
        data = {
            "hashrate": {"rate": 1.0, "unit": 1000000000},
            "best_difficulty": "invalid"
        }
        result = normalizer.normalize(data)

        assert result["best_difficulty"] == "0"

    def test_normalize_efficiency_fract_fallback(self):
        """Test efficiency_fract fallback."""
        normalizer = DefaultMinerDataNormalizer()
        data = {
            "hashrate": {"rate": 1.0, "unit": 1000000000},
            "efficiency": None,
            "efficiency_fract": 18.69,
            "wattage": 50.0
        }
        result = normalizer.normalize(data)

        assert "efficiency" in result
        assert isinstance(result["efficiency"], dict)
        assert result["efficiency"]["unit"]["suffix"] == "J/Th"

    def test_normalize_efficiency_calculation(self):
        """Test efficiency calculation from wattage and hashrate."""
        normalizer = DefaultMinerDataNormalizer()
        data = {
            "hashrate": {"rate": 1.0, "unit": 1000000000},  # 1 Gh/s
            "wattage": 50.0,
            "efficiency": None
        }
        result = normalizer.normalize(data)

        assert "efficiency" in result
        assert isinstance(result["efficiency"], dict)
        assert result["efficiency"]["rate"] > 0

    def test_normalize_extra_fields_present(self):
        """Test normalizing data with extra_fields."""
        normalizer = DefaultMinerDataNormalizer()
        data = {
            "hashrate": {"rate": 1.0, "unit": 1000000000},
            "extra_fields": {
                "custom_field": "value",
                "hashrate_like": {
                    "rate": 500000000.0,
                    "unit": {"value": 1, "suffix": "H/s"}
                }
            }
        }
        result = normalizer.normalize(data)

        assert "extra_fields" in result
        assert result["extra_fields"]["custom_field"] == "value"
        # Hashrate-like structure should be normalized
        if "hashrate_like" in result["extra_fields"]:
            hr_like = result["extra_fields"]["hashrate_like"]
            if isinstance(hr_like, dict) and "rate" in hr_like:
                assert hr_like["rate"] > 0
                assert hr_like["unit"]["suffix"] == "Gh/s"

    def test_normalize_extra_fields_none(self):
        """Test normalizing data with None extra_fields."""
        normalizer = DefaultMinerDataNormalizer()
        data = {
            "hashrate": {"rate": 1.0, "unit": 1000000000},
            "extra_fields": None
        }
        result = normalizer.normalize(data)

        assert result["extra_fields"] is None

    def test_normalize_extra_fields_list(self):
        """Test normalizing data with list in extra_fields."""
        normalizer = DefaultMinerDataNormalizer()
        data = {
            "hashrate": {"rate": 1.0, "unit": 1000000000},
            "extra_fields": {
                "tags": ["mining", "asic"]
            }
        }
        result = normalizer.normalize(data)

        assert "extra_fields" in result
        assert result["extra_fields"]["tags"] == ["mining", "asic"]

    def test_normalize_extra_fields_primitive(self):
        """Test normalizing data with primitive in extra_fields."""
        normalizer = DefaultMinerDataNormalizer()
        data = {
            "hashrate": {"rate": 1.0, "unit": 1000000000},
            "extra_fields": {
                "count": 42,
                "active": True
            }
        }
        result = normalizer.normalize(data)

        assert result["extra_fields"]["count"] == 42
        assert result["extra_fields"]["active"] is True

    def test_normalize_hashrate_conversion(self):
        """Test hashrate conversion from different units."""
        normalizer = DefaultMinerDataNormalizer()

        # Test H/s conversion
        data_hs = {
            "hashrate": {
                "rate": 1000000000.0,
                "unit": {"value": 1, "suffix": "H/s"}
            }
        }
        result = normalizer.normalize(data_hs)
        assert abs(result["hashrate"]["rate"] - 1.0) < 0.01

        # Test TH/s conversion
        data_ths = {
            "hashrate": {
                "rate": 0.5,
                "unit": {"value": 1000000000000, "suffix": "TH/s"}
            }
        }
        result = normalizer.normalize(data_ths)
        assert abs(result["hashrate"]["rate"] - 500.0) < 1.0

    def test_normalize_empty_data(self):
        """Test normalizing empty data."""
        normalizer = DefaultMinerDataNormalizer()
        data = {}
        result = normalizer.normalize(data)

        assert "hashrate" in result
        assert result["hashrate"]["rate"] == 0.0
        assert result["best_difficulty"] == "0"
        assert result["best_session_difficulty"] == "0"
        assert "efficiency" in result
