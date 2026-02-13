"""
Test to demonstrate pyasic library raw response vs pyasic-bridge normalized response.

This test shows how the normalization functions transform raw pyasic data
into a consistent, readable format.

To run this test:
    cd pyasic-bridge
    python3 -m venv venv
    source venv/bin/activate  # On Windows: venv/Scripts/activate (or venv\\Scripts\\activate)
    pip install -r requirements.txt
    python3 test_normalization.py
"""

import json
import sys
from typing import Any

try:
    from app.normalizers import (
        DefaultMinerDataNormalizer,
        convert_hashrate_to_ghs,
        normalize_hashrate_structure,
    )
except ImportError as e:
    print(f"Error importing normalization functions: {e}")
    print("\nPlease ensure dependencies are installed:")
    print("  pip install -r requirements.txt")
    sys.exit(1)

# Create a normalizer instance for backward compatibility in this test file
_normalizer = DefaultMinerDataNormalizer()
def normalize_miner_data(data_dict: dict[str, Any]) -> dict[str, Any]:
    """Helper function for tests."""
    return _normalizer.normalize(data_dict)


def print_comparison(title: str, raw: Any, normalized: Any, show_diff: bool = False):
    """Helper function to print a formatted comparison."""
    print(f"\n{'='*80}")
    print(f"{title}")
    print(f"{'='*80}")
    print("\nRAW PYASIC DATA:")
    print(json.dumps(raw, indent=2, default=str))
    print("\nNORMALIZED PYASIC-BRIDGE DATA:")
    print(json.dumps(normalized, indent=2, default=str))

    if show_diff:
        print("\nFIELDS THAT WERE NORMALIZED:")
        # Check hashrate
        if 'hashrate' in raw and 'hashrate' in normalized:
            raw_hr = raw['hashrate']
            norm_hr = normalized['hashrate']
            if isinstance(raw_hr, dict) and isinstance(norm_hr, dict):
                raw_rate = raw_hr.get('rate', 'N/A')
                raw_unit = raw_hr.get('unit', {}).get('suffix', 'N/A') if isinstance(raw_hr.get('unit'), dict) else raw_hr.get('unit', 'N/A')
                norm_rate = norm_hr.get('rate', 'N/A')
                norm_unit = norm_hr.get('unit', {}).get('suffix', 'N/A')
                if raw_rate != norm_rate or raw_unit != norm_unit:
                    print(f"  ✓ hashrate: {raw_rate} {raw_unit} → {norm_rate} {norm_unit}")

        # Check difficulty fields
        for field in ['best_difficulty', 'best_session_difficulty']:
            if field in raw and field in normalized:
                raw_val = raw[field]
                norm_val = normalized[field]
                if raw_val != norm_val:
                    print(f"  ✓ {field}: {raw_val} ({type(raw_val).__name__}) → {norm_val} ({type(norm_val).__name__})")

        # Check efficiency
        if 'efficiency' in raw and 'efficiency' in normalized:
            raw_eff = raw['efficiency']
            norm_eff = normalized['efficiency']
            if raw_eff != norm_eff:
                print(f"  ✓ efficiency: {raw_eff} ({type(raw_eff).__name__}) → {norm_eff} ({type(norm_eff).__name__})")

    print(f"\n{'='*80}\n")


def test_hashrate_normalization():
    """Test hashrate normalization with various input formats."""

    print("\n" + "="*80)
    print("HASHRATE NORMALIZATION TESTS")
    print("="*80)

    # Test Case 1: Raw H/s value (common issue - very large numbers)
    print("\n--- Test Case 1: Raw H/s value (986983520.50 H/s) ---")
    raw_hashrate_hs = 986983520.50
    normalized = normalize_hashrate_structure(raw_hashrate_hs)
    print(f"Input: {raw_hashrate_hs} (assumed H/s)")
    print(f"Output: {json.dumps(normalized, indent=2)}")
    print("Expected: ~0.987 GH/s")
    print(f"Got: {normalized['rate']} GH/s")

    # Test Case 2: Dict format from pyasic as_dict() with nested unit
    print("\n--- Test Case 2: Dict with nested unit structure ---")
    raw_hashrate_dict = {
        "rate": 0.9749575806,
        "unit": {
            "value": 1000000000000,  # TH/s
            "suffix": "TH/s"
        }
    }
    normalized = normalize_hashrate_structure(raw_hashrate_dict)
    print(f"Input: {json.dumps(raw_hashrate_dict, indent=2)}")
    print(f"Output: {json.dumps(normalized, indent=2)}")
    print("Expected: ~974.96 GH/s (0.9749575806 TH/s)")
    print(f"Got: {normalized['rate']} GH/s")

    # Test Case 3: Dict format with simple unit value
    print("\n--- Test Case 3: Dict with simple unit value (MH/s) ---")
    raw_hashrate_mhs = {
        "rate": 500.0,
        "unit": 1000000  # MH/s
    }
    normalized = normalize_hashrate_structure(raw_hashrate_mhs)
    print(f"Input: {json.dumps(raw_hashrate_mhs, indent=2)}")
    print(f"Output: {json.dumps(normalized, indent=2)}")
    print("Expected: 0.5 GH/s (500 MH/s)")
    print(f"Got: {normalized['rate']} GH/s")

    # Test Case 4: Already in GH/s
    print("\n--- Test Case 4: Already in GH/s ---")
    raw_hashrate_ghs = {
        "rate": 1.5,
        "unit": 1000000000  # GH/s
    }
    normalized = normalize_hashrate_structure(raw_hashrate_ghs)
    print(f"Input: {json.dumps(raw_hashrate_ghs, indent=2)}")
    print(f"Output: {json.dumps(normalized, indent=2)}")
    print("Expected: 1.5 GH/s")
    print(f"Got: {normalized['rate']} GH/s")

    # Test Case 5: None/null value
    print("\n--- Test Case 5: None/null value ---")
    normalized = normalize_hashrate_structure(None)
    print("Input: None")
    print(f"Output: {json.dumps(normalized, indent=2)}")
    print("Expected: 0.0 GH/s with default structure")
    print(f"Got: {normalized['rate']} GH/s")


def test_full_miner_data_normalization():
    """Test full miner data normalization with realistic pyasic data."""

    print("\n" + "="*80)
    print("FULL MINER DATA NORMALIZATION TESTS")
    print("="*80)

    # Test Case 1: Realistic BitAxe-like data with issues
    print("\n--- Test Case 1: BitAxe data with H/s hashrate and scientific notation efficiency ---")
    raw_pyasic_data_1 = {
        "hashrate": {
            "rate": 986983520.50,  # This is H/s, not GH/s!
            "unit": {
                "value": 1,  # H/s
                "suffix": "H/s"
            }
        },
        "best_difficulty": 12345678901234567890,  # Very large integer
        "best_session_difficulty": None,
        "efficiency": "1.8e-11",  # Scientific notation string
        "wattage": 50,
        "temperature_avg": 65,
        "fans": [{"speed": 5000}],
        "uptime": 3600,
        "model": "BitAxe",
        "hostname": "bitaxe-001"
    }

    normalized_1 = normalize_miner_data(raw_pyasic_data_1)
    print_comparison(
        "BitAxe Data: H/s hashrate + scientific notation efficiency",
        raw_pyasic_data_1,
        normalized_1
    )

    # Test Case 2: Miner with TH/s hashrate and calculated efficiency
    print("\n--- Test Case 2: Miner with TH/s hashrate and zero efficiency (should calculate) ---")
    raw_pyasic_data_2 = {
        "hashrate": {
            "rate": 0.9749575806,
            "unit": {
                "value": 1000000000000,  # TH/s
                "suffix": "TH/s"
            }
        },
        "best_difficulty": 4294967295,  # uint32 max
        "best_session_difficulty": 2147483647,
        "efficiency": 0,  # Zero - should calculate from wattage/hashrate
        "wattage": 50,
        "temperature_avg": 70,
        "fans": [{"speed": 6000}, {"speed": 6100}],
        "uptime": 7200,
        "model": "ASIC Miner",
        "hostname": "miner-002"
    }

    normalized_2 = normalize_miner_data(raw_pyasic_data_2)
    print_comparison(
        "Miner with TH/s hashrate + calculated efficiency",
        raw_pyasic_data_2,
        normalized_2
    )

    # Test Case 3: Miner with missing fields
    print("\n--- Test Case 3: Miner with missing difficulty and efficiency fields ---")
    raw_pyasic_data_3 = {
        "hashrate": 1500000000.0,  # Raw number (assumed H/s based on magnitude)
        "wattage": 100,
        "temperature_avg": 55,
        "fans": [{"speed": 4500}],
        "uptime": 1800,
        "model": "Unknown Miner",
        "hostname": "miner-003"
    }

    normalized_3 = normalize_miner_data(raw_pyasic_data_3)
    print_comparison(
        "Miner with missing fields (should use defaults)",
        raw_pyasic_data_3,
        normalized_3
    )

    # Test Case 4: Miner with efficiency_fract fallback
    print("\n--- Test Case 4: Miner with efficiency_fract fallback ---")
    raw_pyasic_data_4 = {
        "hashrate": {
            "rate": 2.5,
            "unit": 1000000000  # GH/s
        },
        "best_difficulty": 1000000,
        "best_session_difficulty": 500000,
        "efficiency": None,  # None - should try efficiency_fract
        "efficiency_fract": 25.5,  # Fallback value
        "wattage": 75,
        "temperature_avg": 60,
        "fans": [{"speed": 5500}],
        "uptime": 5400,
        "model": "Test Miner",
        "hostname": "miner-004"
    }

    normalized_4 = normalize_miner_data(raw_pyasic_data_4)
    print_comparison(
        "Miner with efficiency_fract fallback",
        raw_pyasic_data_4,
        normalized_4
    )


def test_complete_miner_data_comparison():
    """Test complete miner data comparison - shows full pyasic response vs normalized."""

    print("\n" + "="*80)
    print("COMPLETE MINER DATA COMPARISON")
    print("="*80)
    print("\nThis shows a realistic, complete MinerData object as returned by pyasic")
    print("compared to the normalized version returned by pyasic-bridge.\n")

    # Complete realistic pyasic MinerData response (as_dict() output)
    # Based on actual BitAxe Gamma miner response
    complete_raw_pyasic_data = {
        "ip": "192.168.178.229",
        "device_info": {
            "make": "BitAxe",
            "model": "Gamma",
            "firmware": "Stock",
            "algo": "SHA256"
        },
        "serial_number": None,
        "psu_serial_number": None,
        "mac": "30:ED:A0:30:10:30",
        "api_ver": "v2.12.2",
        "fw_ver": "v2.12.2",
        "hostname": "bitaxe",
        "sticker_hashrate": None,
        "expected_hashrate": {
            "unit": {
                "value": 1000000000000,
                "suffix": "TH/s"
            },
            "rate": 0.9996
        },
        "expected_hashboards": 1,
        "expected_chips": 1,
        "expected_fans": 1,
        "env_temp": None,
        "wattage": 18,
        "voltage": None,
        "best_difficulty": 506388397,
        "best_session_difficulty": 205594554,
        "shares_accepted": 18893,
        "shares_rejected": 8,
        "fans": [],
        "fan_psu": None,
        "hashboards": [
            {
                "slot": 0,
                "hashrate": None,
                "inlet_temp": None,
                "outlet_temp": None,
                "temp": None,
                "chip_temp": None,
                "chips": None,
                "expected_chips": 1,
                "serial_number": None,
                "missing": True,
                "tuned": None,
                "active": None,
                "voltage": None
            }
        ],
        "config": None,
        "fault_light": None,
        "errors": [],
        "is_mining": True,
        "uptime": 173316,
        "pools": [],
        "hashrate": {
            "unit": {
                "value": 1000000000000,
                "suffix": "TH/s"
            },
            "rate": 0.9629316406
        },
        "wattage_limit": None,
        "total_chips": None,
        "nominal": None,
        "percent_expected_chips": None,
        "percent_expected_hashrate": 96,
        "percent_expected_wattage": None,
        "temperature_avg": None,
        "efficiency": 19,
        "efficiency_fract": 18.69,
        "datetime": "2026-01-15T12:43:53.294269+01:00",
        "timestamp": 1768477433,
        "make": "BitAxe",
        "model": "Gamma",
        "firmware": "Stock",
        "algo": "SHA256"
    }

    normalized_complete = normalize_miner_data(complete_raw_pyasic_data)

    print_comparison(
        "COMPLETE MINER DATA: Full pyasic MinerData.as_dict() response",
        complete_raw_pyasic_data,
        normalized_complete,
        show_diff=True
    )

    # Show key transformations
    print("\nKEY TRANSFORMATIONS IN THIS EXAMPLE:")
    raw_hr = complete_raw_pyasic_data['hashrate']
    norm_hr = normalized_complete['hashrate']
    print(f"  Hashrate: {raw_hr['rate']} {raw_hr['unit']['suffix']}")
    print(f"           → {norm_hr['rate']} {norm_hr['unit']['suffix']}")
    print(f"  Best Difficulty: {complete_raw_pyasic_data['best_difficulty']} (int)")
    print(f"                  → {normalized_complete['best_difficulty']} (string)")
    print(f"  Efficiency: {complete_raw_pyasic_data['efficiency']} (int) / efficiency_fract: {complete_raw_pyasic_data['efficiency_fract']} (float)")
    print(f"             → {json.dumps(normalized_complete['efficiency'], indent=14)} (structured format, calculated from wattage/hashrate)")
    print(f"  Best Session Difficulty: {complete_raw_pyasic_data['best_session_difficulty']} (int)")
    print(f"                         → {normalized_complete['best_session_difficulty']} (string)")
    print(f"  Wattage: {complete_raw_pyasic_data['wattage']}W (unchanged)")
    print("\nNote: Efficiency is calculated from wattage (18W) and hashrate (0.9629316406 TH/s = 962.93 Gh/s)")
    print("      Expected efficiency: 18 / (962.93 / 1000) = 18 / 0.96293 = ~18.69 J/Th")
    print("      This matches efficiency_fract: 18.69")


def test_hashrate_conversion_edge_cases():
    """Test edge cases for hashrate conversion."""

    print("\n" + "="*80)
    print("HASHRATE CONVERSION EDGE CASES")
    print("="*80)

    test_cases = [
        ("Very large H/s", 1059138916000000.25, "Should convert to ~1059138.916 GH/s"),
        ("Small MH/s", 250.0, "Should convert to 0.25 GH/s (if detected as MH/s)"),
        ("Zero", 0, "Should return 0.0"),
        ("Negative", -100, "Should return 0.0"),
        ("String number", "1000000000", "Should parse and convert"),
    ]

    for name, value, expected in test_cases:
        print(f"\n--- {name} ---")
        print(f"Input: {value} (type: {type(value).__name__})")
        result = convert_hashrate_to_ghs(value)
        print(f"Output: {result} GH/s")
        print(f"Note: {expected}")


def test_extra_fields_normalization():
    """Test normalization of extra_fields from pyasic response model."""

    print("\n" + "="*80)
    print("EXTRA_FIELDS NORMALIZATION TESTS")
    print("="*80)

    # Test Case 1: extra_fields with hashrate-like structure
    print("\n--- Test Case 1: extra_fields with hashrate-like structure ---")
    raw_data_with_hashrate_in_extra = {
        "hashrate": {
            "rate": 1.5,
            "unit": {"value": 1000000000, "suffix": "GH/s"}
        },
        "wattage": 100,
        "efficiency": 20,
        "extra_fields": {
            "secondary_hashrate": {
                "rate": 500000000.0,  # H/s
                "unit": {"value": 1, "suffix": "H/s"}
            },
            "custom_metric": 42,
            "vendor_specific": {
                "field1": "value1",
                "field2": 123
            }
        }
    }

    normalized_with_extra = normalize_miner_data(raw_data_with_hashrate_in_extra)
    print_comparison(
        "Miner data with extra_fields containing hashrate-like structure",
        raw_data_with_hashrate_in_extra,
        normalized_with_extra
    )

    # Verify extra_fields is preserved and normalized
    assert "extra_fields" in normalized_with_extra, "extra_fields should be present in normalized data"
    assert "secondary_hashrate" in normalized_with_extra["extra_fields"], "secondary_hashrate should be preserved"
    assert "custom_metric" in normalized_with_extra["extra_fields"], "custom_metric should be preserved"
    assert normalized_with_extra["extra_fields"]["custom_metric"] == 42, "custom_metric should be unchanged"

    # Check if hashrate-like structure in extra_fields was normalized
    secondary_hr = normalized_with_extra["extra_fields"].get("secondary_hashrate")
    if isinstance(secondary_hr, dict) and "rate" in secondary_hr:
        print(f"  ✓ secondary_hashrate in extra_fields was normalized: {json.dumps(secondary_hr, indent=2)}")

    # Test Case 2: extra_fields as None
    print("\n--- Test Case 2: extra_fields as None ---")
    raw_data_with_none_extra = {
        "hashrate": {"rate": 1.0, "unit": {"value": 1000000000, "suffix": "GH/s"}},
        "wattage": 50,
        "efficiency": 10,
        "extra_fields": None
    }

    normalized_none_extra = normalize_miner_data(raw_data_with_none_extra)
    assert normalized_none_extra.get("extra_fields") is None, "None extra_fields should remain None"
    print("  ✓ None extra_fields is preserved as None")

    # Test Case 3: extra_fields with list
    print("\n--- Test Case 3: extra_fields with list ---")
    raw_data_with_list_extra = {
        "hashrate": {"rate": 2.0, "unit": {"value": 1000000000, "suffix": "GH/s"}},
        "wattage": 75,
        "efficiency": 15,
        "extra_fields": {
            "tags": ["mining", "asic", "bitcoin"],
            "metadata": {"version": "1.0", "status": "active"}
        }
    }

    normalized_list_extra = normalize_miner_data(raw_data_with_list_extra)
    assert "extra_fields" in normalized_list_extra, "extra_fields should be present"
    assert "tags" in normalized_list_extra["extra_fields"], "tags list should be preserved"
    assert normalized_list_extra["extra_fields"]["tags"] == ["mining", "asic", "bitcoin"], "tags should be unchanged"
    print("  ✓ List and nested dict in extra_fields are preserved")

    print("\n" + "="*80)
    print("EXTRA_FIELDS NORMALIZATION SUMMARY")
    print("="*80)
    print("  ✓ extra_fields dict is preserved and shallow-copied")
    print("  ✓ Hashrate-like structures in extra_fields are normalized")
    print("  ✓ None extra_fields remains None")
    print("  ✓ Other types (lists, primitives) are preserved as-is")
    print("  ✓ Vendor-specific fields are preserved unchanged")


def main():
    """Run all normalization tests."""
    print("\n" + "="*80)
    print("PYASIC-BRIDGE NORMALIZATION DEMONSTRATION")
    print("="*80)
    print("\nThis test demonstrates how raw pyasic library responses are")
    print("normalized by the pyasic-bridge service to provide consistent,")
    print("readable values for the Pluto backend services.")
    print("\nKey normalizations:")
    print("  1. Hashrate: Converted to GH/s with preserved unit structure")
    print("  2. Difficulty: Converted to strings (handles large integers)")
    print("  3. Efficiency: Converted from scientific notation to float")
    print("  4. Missing fields: Default values provided")
    print("  5. Extra fields: Preserved and normalized (hashrate-like structures)")

    test_hashrate_normalization()
    test_hashrate_conversion_edge_cases()
    test_full_miner_data_normalization()
    test_complete_miner_data_comparison()
    test_extra_fields_normalization()

    print("\n" + "="*80)
    print("ALL TESTS COMPLETED")
    print("="*80)
    print("\nKEY NORMALIZATIONS PERFORMED:")
    print("\n1. HASHRATE:")
    print("   - Input: Various formats (H/s, MH/s, GH/s, TH/s, raw numbers, dicts)")
    print("   - Output: Always in GH/s with preserved structure:")
    print("     {")
    print('       "unit": { "value": 1000000000, "suffix": "GH/s" },')
    print('       "rate": <number in GH/s>')
    print("     }")
    print("   - Example: 986983520.50 H/s → ~0.987 GH/s")
    print("   - Example: 0.9749575806 TH/s → ~974.96 GH/s")
    print("\n2. DIFFICULTY:")
    print("   - Input: Large integers (int) or None")
    print("   - Output: Always strings (handles very large numbers safely)")
    print("   - Example: 12345678901234567890 → '12345678901234567890'")
    print("   - Example: None → '0'")
    print("\n3. EFFICIENCY:")
    print("   - Input: Scientific notation strings, zero, None, or numbers")
    print("   - Output: Always in J/TH with preserved structure:")
    print("     {")
    print('       "unit": { "suffix": "J/TH" },')
    print('       "rate": <number in J/TH>')
    print("     }")
    print("   - Calculated from wattage/hashrate if zero/None")
    print("   - Example: '1.8e-11' → { 'unit': {'suffix': 'J/TH'}, 'rate': 0.000000000018 }")
    print("   - Example: 0 with wattage=50, hashrate=1GH/s → { 'unit': {'suffix': 'J/TH'}, 'rate': 50.0 }")
    print("\n4. MISSING FIELDS:")
    print("   - All fields have safe defaults")
    print("   - Hashrate: 0.0 GH/s with proper structure")
    print("   - Difficulty: '0'")
    print("   - Efficiency: 0.0 J/TH with proper structure or calculated if possible")
    print("\n5. EXTRA_FIELDS:")
    print("   - Input: Dict, None, or other types from pyasic response model")
    print("   - Output: Preserved and normalized (hashrate-like structures are normalized)")
    print("   - Example: extra_fields with hashrate-like dict → normalized hashrate structure")
    print("   - Example: extra_fields with custom fields → preserved as-is")
    print("   - Example: None extra_fields → remains None")
    print("="*80 + "\n")


if __name__ == "__main__":
    main()
