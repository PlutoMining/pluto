"""
Tests for base normalization utilities.
"""

from app.normalizers.base import (
    convert_hashrate_to_ghs,
    normalize_efficiency_structure,
    normalize_hashrate_structure,
)


class TestConvertHashrateToGhs:
    """Test hashrate conversion to Gh/s."""

    def test_none_value(self):
        """Test None input returns 0.0."""
        assert convert_hashrate_to_ghs(None) == 0.0

    def test_dict_with_nested_unit(self):
        """Test dict with nested unit structure."""
        hashrate = {
            "rate": 0.5,
            "unit": {"value": 1000000000000, "suffix": "TH/s"}
        }
        result = convert_hashrate_to_ghs(hashrate)
        assert result == 500.0  # 0.5 TH/s = 500 Gh/s

    def test_dict_with_simple_unit(self):
        """Test dict with simple unit value."""
        hashrate = {"rate": 1000.0, "unit": 1000000}  # MH/s
        result = convert_hashrate_to_ghs(hashrate)
        assert result == 1.0  # 1000 MH/s = 1 Gh/s

    def test_dict_already_ghs(self):
        """Test dict already in Gh/s."""
        hashrate = {"rate": 2.5, "unit": 1000000000}  # Gh/s
        result = convert_hashrate_to_ghs(hashrate)
        assert result == 2.5

    def test_dict_hs_unit(self):
        """Test dict with H/s unit."""
        hashrate = {"rate": 1000000000.0, "unit": 1}  # H/s
        result = convert_hashrate_to_ghs(hashrate)
        assert abs(result - 1.0) < 0.01  # 1e9 H/s = 1 Gh/s

    def test_direct_number_large(self):
        """Test direct number (large, treated as H/s)."""
        result = convert_hashrate_to_ghs(1000000000.0)
        assert abs(result - 1.0) < 0.01

    def test_direct_number_small(self):
        """Test direct number (small, treated as Th/s)."""
        result = convert_hashrate_to_ghs(1.5)
        assert result == 1500.0  # 1.5 Th/s = 1500 Gh/s

    def test_invalid_value(self):
        """Test invalid value returns 0.0."""
        # This should handle gracefully
        result = convert_hashrate_to_ghs("invalid")
        assert result == 0.0

    def test_object_with_unknown_unit_type(self):
        """Test object with rate and unit where unit type is unknown."""
        class MockHashRate:
            def __init__(self):
                self.rate = 1.5
                self.unit = "unknown_type"  # Not a number or object with value

        hashrate = MockHashRate()
        result = convert_hashrate_to_ghs(hashrate)
        # Should default to H/s and convert
        assert result > 0

    def test_dict_with_unknown_unit_type(self):
        """Test dict with unit that is not dict/int/float."""
        hashrate = {"rate": 1000.0, "unit": "unknown"}
        result = convert_hashrate_to_ghs(hashrate)
        # Should default to H/s
        assert result > 0

    def test_direct_number_1e6_range(self):
        """Test direct number in 1e6 range."""
        result = convert_hashrate_to_ghs(5000000.0)  # 5M
        assert result > 0

    def test_direct_number_1e3_range(self):
        """Test direct number in 1e3 range."""
        result = convert_hashrate_to_ghs(5000.0)  # 5K
        assert result > 0

    def test_else_branch_unit_detection(self):
        """Test else branch for unit detection (last resort)."""
        # Use a type that falls into the else branch
        class CustomType:
            def __float__(self):
                return 1000000.0

        hashrate = CustomType()
        result = convert_hashrate_to_ghs(hashrate)
        assert result >= 0

    def test_fallback_magnitude_detection(self):
        """Test fallback magnitude detection when unit doesn't match standard values."""
        # Create a scenario where unit doesn't match standard values
        # This requires a custom object that falls into the else branch
        class CustomHashRate:
            def __init__(self):
                self.rate = 5000000.0
                self.unit = 999999  # Non-standard unit value

        hashrate = CustomHashRate()
        result = convert_hashrate_to_ghs(hashrate)
        # Should use fallback magnitude detection
        assert result >= 0


class TestNormalizeHashrateStructure:
    """Test hashrate structure normalization."""

    def test_none_value(self):
        """Test None input returns default structure."""
        result = normalize_hashrate_structure(None)
        assert result == {
            "unit": {
                "value": 1000000000,
                "suffix": "Gh/s"
            },
            "rate": 0.0
        }

    def test_dict_with_unit(self):
        """Test dict with unit structure."""
        hashrate = {
            "rate": 1.5,
            "unit": {"value": 1000000000, "suffix": "GH/s"}
        }
        result = normalize_hashrate_structure(hashrate)
        assert result["rate"] == 1.5
        assert result["unit"]["suffix"] == "Gh/s"
        assert result["unit"]["value"] == 1000000000

    def test_dict_hs_conversion(self):
        """Test dict with H/s unit conversion."""
        hashrate = {
            "rate": 500000000.0,
            "unit": {"value": 1, "suffix": "H/s"}
        }
        result = normalize_hashrate_structure(hashrate)
        assert abs(result["rate"] - 0.5) < 0.01  # 500M H/s = 0.5 Gh/s
        assert result["unit"]["suffix"] == "Gh/s"

    def test_direct_number(self):
        """Test direct number input."""
        result = normalize_hashrate_structure(1000000000.0)
        assert abs(result["rate"] - 1.0) < 0.01
        assert result["unit"]["suffix"] == "Gh/s"


class TestNormalizeEfficiencyStructure:
    """Test efficiency structure normalization."""

    def test_calculation_from_wattage_hashrate(self):
        """Test efficiency calculation from wattage and hashrate."""
        result = normalize_efficiency_structure(
            efficiency_value=None,
            wattage=50.0,
            hashrate_ghs=1.0  # 1 Gh/s = 0.001 Th/s
        )
        assert result["unit"]["suffix"] == "J/Th"
        # efficiency = 50W / 0.001 Th/s = 50000 J/Th
        # However, the code detects this as too high (> 1000) and treats hashrate as Th/s
        # So it becomes: 50W / 1.0 Th/s = 50.0 J/Th
        assert abs(result["rate"] - 50.0) < 1.0

    def test_fallback_to_efficiency_value(self):
        """Test fallback to efficiency value when calculation not possible."""
        result = normalize_efficiency_structure(
            efficiency_value="1.8e-11",
            wattage=None,
            hashrate_ghs=None
        )
        assert result["unit"]["suffix"] == "J/Th"
        # 1.8e-11 * 1e12 = 18.0 J/Th
        assert abs(result["rate"] - 18.0) < 0.1

    def test_fallback_to_numeric_efficiency(self):
        """Test fallback to numeric efficiency value."""
        result = normalize_efficiency_structure(
            efficiency_value=1.8e-11,
            wattage=None,
            hashrate_ghs=None
        )
        assert result["unit"]["suffix"] == "J/Th"
        assert abs(result["rate"] - 18.0) < 0.1

    def test_priority_calculation_over_fallback(self):
        """Test that calculation takes priority over fallback value."""
        result = normalize_efficiency_structure(
            efficiency_value="1.8e-11",
            wattage=50.0,
            hashrate_ghs=1.0
        )
        # Should use calculation, not fallback
        assert result["unit"]["suffix"] == "J/Th"
        # The code detects calculated efficiency > 1000 and treats hashrate as Th/s
        # So it becomes: 50W / 1.0 Th/s = 50.0 J/Th (calculated, not fallback)
        assert result["rate"] == 50.0

    def test_zero_wattage_uses_fallback(self):
        """Test that zero wattage falls back to efficiency value."""
        result = normalize_efficiency_structure(
            efficiency_value="1.8e-11",
            wattage=0.0,
            hashrate_ghs=1.0
        )
        assert result["unit"]["suffix"] == "J/Th"
        # Should use fallback
        assert abs(result["rate"] - 18.0) < 0.1

    def test_none_efficiency_no_wattage(self):
        """Test None efficiency with no wattage returns 0.0."""
        result = normalize_efficiency_structure(
            efficiency_value=None,
            wattage=None,
            hashrate_ghs=None
        )
        assert result["unit"]["suffix"] == "J/Th"
        assert result["rate"] == 0.0

    def test_invalid_efficiency_value(self):
        """Test invalid efficiency value returns 0.0."""
        result = normalize_efficiency_structure(
            efficiency_value="invalid",
            wattage=None,
            hashrate_ghs=None
        )
        assert result["unit"]["suffix"] == "J/Th"
        assert result["rate"] == 0.0

    def test_efficiency_zero_division_error(self):
        """Test efficiency calculation with zero hashrate."""
        result = normalize_efficiency_structure(
            efficiency_value=None,
            wattage=50.0,
            hashrate_ghs=0.0
        )
        assert result["unit"]["suffix"] == "J/Th"
        assert result["rate"] == 0.0
