"""
Unit tests for models module.
"""

import pytest
from pydantic import ValidationError

from app.models import MinerData, MinerDataRaw, MinerInfo, ScanRequest


class TestScanRequest:
    """Test ScanRequest model."""

    def test_scan_request_with_ip(self):
        """Test ScanRequest with IP."""
        request = ScanRequest(ip="192.168.1.100")
        assert request.ip == "192.168.1.100"
        assert request.subnet is None

    def test_scan_request_with_subnet(self):
        """Test ScanRequest with subnet."""
        request = ScanRequest(subnet="192.168.1.0/24")
        assert request.subnet == "192.168.1.0/24"
        assert request.ip is None

    def test_scan_request_with_both(self):
        """Test ScanRequest with both IP and subnet."""
        request = ScanRequest(ip="192.168.1.100", subnet="192.168.1.0/24")
        assert request.ip == "192.168.1.100"
        assert request.subnet == "192.168.1.0/24"

    def test_scan_request_empty(self):
        """Test ScanRequest with no fields."""
        request = ScanRequest()
        assert request.ip is None
        assert request.subnet is None


class TestMinerInfo:
    """Test MinerInfo model."""

    def test_miner_info_minimal(self):
        """Test MinerInfo with minimal required fields (data must validate as MinerData, so ip required)."""
        miner_info = MinerInfo(
            ip="192.168.1.100",
            data={"ip": "192.168.1.100", "hashrate": {"rate": 1.0, "unit": {"value": 1000000000, "suffix": "Gh/s"}}},
        )
        assert miner_info.ip == "192.168.1.100"
        assert miner_info.mac is None
        assert miner_info.model is None
        assert miner_info.hostname is None
        assert miner_info.hashrate is None
        assert miner_info.data.ip == "192.168.1.100"
        assert miner_info.data.hashrate is not None and miner_info.data.hashrate.rate == 1.0

    def test_miner_info_complete(self):
        """Test MinerInfo with all fields (data must validate as MinerData)."""
        miner_info = MinerInfo(
            ip="192.168.1.100",
            mac="00:11:22:33:44:55",
            model="TestMiner",
            hostname="test-miner",
            hashrate=1.0,
            data={
                "ip": "192.168.1.100",
                "hashrate": {"rate": 1.0, "unit": {"value": 1000000000, "suffix": "Gh/s"}},
                "wattage": 50,
            },
        )
        assert miner_info.ip == "192.168.1.100"
        assert miner_info.mac == "00:11:22:33:44:55"
        assert miner_info.model == "TestMiner"
        assert miner_info.hostname == "test-miner"
        assert miner_info.hashrate == 1.0
        assert miner_info.data.wattage == 50

    def test_miner_info_missing_ip(self):
        """Test MinerInfo without required ip field."""
        with pytest.raises(ValidationError):
            MinerInfo(data={})

    def test_miner_info_missing_data(self):
        """Test MinerInfo without required data field."""
        with pytest.raises(ValidationError):
            MinerInfo(ip="192.168.1.100")

    def test_miner_info_with_extra_fields_in_data(self):
        """Test MinerInfo with data validating as MinerData (ip + hashrate)."""
        miner_info = MinerInfo(
            ip="192.168.1.100",
            data={
                "ip": "192.168.1.100",
                "hashrate": {"rate": 1.0, "unit": {"value": 1000000000, "suffix": "Gh/s"}},
            },
        )
        assert miner_info.data.ip == "192.168.1.100"
        assert miner_info.data.hashrate is not None


class TestMinerData:
    """Test MinerData model (GET /miner/{ip}/data response)."""

    def test_miner_data_minimal(self):
        """MinerData validates minimal dict (ip + hashrate)."""
        data = {
            "ip": "192.168.1.100",
            "hashrate": {"rate": 1.0, "unit": {"value": 1000000000, "suffix": "Gh/s"}},
            "wattage": 50,
        }
        miner_data = MinerData.model_validate(data)
        assert miner_data.ip == "192.168.1.100"
        assert miner_data.hashrate is not None
        assert miner_data.hashrate.rate == 1.0
        assert miner_data.wattage == 50

    def test_miner_data_with_hashboards_alias(self):
        """MinerData accepts 'hashboards' key (alias for hashrates)."""
        data = {
            "ip": "192.168.1.200",
            "hashboards": [
                {
                    "slot": 0,
                    "hashrate": {"rate": 0.98, "unit": {"value": 1000000000000, "suffix": "TH/s"}},
                    "temp": 65.0,
                    "chip_temp": 59.25,
                }
            ],
        }
        miner_data = MinerData.model_validate(data)
        assert miner_data.ip == "192.168.1.200"
        assert len(miner_data.hashboards) == 1
        assert miner_data.hashboards[0].slot == 0
        assert miner_data.hashboards[0].temp == 65.0

    def test_miner_data_missing_ip_fails(self):
        """MinerData requires ip."""
        with pytest.raises(ValidationError):
            MinerData.model_validate({"hashrate": {"rate": 1.0, "unit": {}}})


class TestMinerDataRaw:
    """Test MinerDataRaw model (GET /miner/{ip}/data/raw response – input to normalizer)."""

    def test_miner_data_raw_empty(self):
        """MinerDataRaw accepts empty dict (all fields optional, extra allowed)."""
        raw = MinerDataRaw.model_validate({})
        assert raw.device_info is None
        assert raw.hashrate is None

    def test_miner_data_raw_normalizer_keys(self):
        """MinerDataRaw accepts keys consumed by normalizer."""
        data = {
            "device_info": {"make": "BitAxe", "model": "Gamma"},
            "hashrate": {"rate": 0.98, "unit": {"value": 1e12, "suffix": "TH/s"}},
            "best_difficulty": 1722152579,
            "wattage": 18,
            "efficiency_fract": 18.33,
            "extra_fields": {"frequency": 490},
        }
        raw = MinerDataRaw.model_validate(data)
        assert raw.device_info is not None
        assert raw.device_info["make"] == "BitAxe"
        assert raw.hashrate["rate"] == 0.98
        assert raw.wattage == 18
        assert raw.extra_fields["frequency"] == 490

    def test_miner_data_raw_extra_keys_preserved(self):
        """MinerDataRaw preserves extra keys (extra='allow')."""
        data = {"unknown_key": "value", "another": 42}
        raw = MinerDataRaw.model_validate(data)
        assert raw.model_extra is not None
        assert raw.model_extra.get("unknown_key") == "value"
        assert raw.model_extra.get("another") == 42
