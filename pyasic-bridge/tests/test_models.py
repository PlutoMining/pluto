"""
Unit tests for models module.
"""

import pytest
from pydantic import ValidationError

from app.models import MinerInfo, ScanRequest


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
        """Test MinerInfo with minimal required fields."""
        miner_info = MinerInfo(
            ip="192.168.1.100",
            data={"hashrate": {"rate": 1.0, "unit": {"value": 1000000000, "suffix": "Gh/s"}}}
        )
        assert miner_info.ip == "192.168.1.100"
        assert miner_info.mac is None
        assert miner_info.model is None
        assert miner_info.hostname is None
        assert miner_info.hashrate is None
        assert "hashrate" in miner_info.data

    def test_miner_info_complete(self):
        """Test MinerInfo with all fields."""
        miner_info = MinerInfo(
            ip="192.168.1.100",
            mac="00:11:22:33:44:55",
            model="TestMiner",
            hostname="test-miner",
            hashrate=1.0,
            data={
                "hashrate": {"rate": 1.0, "unit": {"value": 1000000000, "suffix": "Gh/s"}},
                "wattage": 50.0
            }
        )
        assert miner_info.ip == "192.168.1.100"
        assert miner_info.mac == "00:11:22:33:44:55"
        assert miner_info.model == "TestMiner"
        assert miner_info.hostname == "test-miner"
        assert miner_info.hashrate == 1.0
        assert miner_info.data["wattage"] == 50.0

    def test_miner_info_missing_ip(self):
        """Test MinerInfo without required ip field."""
        with pytest.raises(ValidationError):
            MinerInfo(data={})

    def test_miner_info_missing_data(self):
        """Test MinerInfo without required data field."""
        with pytest.raises(ValidationError):
            MinerInfo(ip="192.168.1.100")

    def test_miner_info_with_extra_fields_in_data(self):
        """Test MinerInfo with extra_fields in data."""
        miner_info = MinerInfo(
            ip="192.168.1.100",
            data={
                "hashrate": {"rate": 1.0, "unit": {"value": 1000000000, "suffix": "Gh/s"}},
                "extra_fields": {
                    "custom": "value",
                    "count": 42
                }
            }
        )
        assert "extra_fields" in miner_info.data
        assert miner_info.data["extra_fields"]["custom"] == "value"
