"""
Tests for helper functions in services/helpers.py.
"""

import pytest

from app.services.helpers import extract_hashrate_rate, extract_miner_attributes, process_miner_data


class TestExtractHashrateRate:
    """Test extract_hashrate_rate function."""

    def test_extract_hashrate_rate_with_dict(self):
        """Test extracting hashrate rate from dict with rate."""
        normalized_data = {"hashrate": {"rate": 1.5}}
        result = extract_hashrate_rate(normalized_data)
        assert result == 1.5

    def test_extract_hashrate_rate_without_rate(self):
        """Test extracting hashrate rate when rate is missing."""
        normalized_data = {"hashrate": {"unit": "GH/s"}}
        result = extract_hashrate_rate(normalized_data)
        assert result == 0.0

    def test_extract_hashrate_rate_without_hashrate(self):
        """Test extracting hashrate rate when hashrate is missing."""
        normalized_data = {"wattage": 50.0}
        result = extract_hashrate_rate(normalized_data)
        assert result == 0.0

    def test_extract_hashrate_rate_with_non_dict_hashrate(self):
        """Test extracting hashrate rate when hashrate is not a dict."""
        normalized_data = {"hashrate": 1.5}
        result = extract_hashrate_rate(normalized_data)
        assert result == 0.0


class TestExtractMinerAttributes:
    """Test extract_miner_attributes function."""

    def test_extract_miner_attributes_with_all_attrs(self):
        """Test extracting attributes when all are present."""
        class MockData:
            mac = "00:11:22:33:44:55"
            model = "TestMiner"
            hostname = "test-miner"

        result = extract_miner_attributes(MockData())
        assert result == {
            "mac": "00:11:22:33:44:55",
            "model": "TestMiner",
            "hostname": "test-miner",
        }

    def test_extract_miner_attributes_with_missing_attrs(self):
        """Test extracting attributes when some are missing."""
        class MockData:
            mac = "00:11:22:33:44:55"
            # model and hostname missing

        result = extract_miner_attributes(MockData())
        assert result == {
            "mac": "00:11:22:33:44:55",
            "model": None,
            "hostname": None,
        }

    def test_extract_miner_attributes_with_no_attrs(self):
        """Test extracting attributes when none are present."""
        class MockData:
            pass

        result = extract_miner_attributes(MockData())
        assert result == {
            "mac": None,
            "model": None,
            "hostname": None,
        }


class TestProcessMinerData:
    """Test process_miner_data function."""

    @pytest.mark.asyncio
    async def test_process_miner_data_basic(self):
        """Test processing miner data with basic fields."""
        data_dict = {
            "hashrate": {"rate": 1.0, "unit": {"value": 1000000000, "suffix": "GH/s"}},
            "mac": "00:11:22:33:44:55",
            "model": "TestMiner",
            "hostname": "test-miner",
        }
        result = await process_miner_data("192.168.1.100", data_dict)

        assert result.ip == "192.168.1.100"
        assert result.mac == "00:11:22:33:44:55"
        assert result.model == "TestMiner"
        assert result.hostname == "test-miner"
        assert result.hashrate == 1.0

    @pytest.mark.asyncio
    async def test_process_miner_data_with_macaddr(self):
        """Test processing miner data with macAddr instead of mac."""
        data_dict = {
            "hashrate": {"rate": 1.0},
            "macAddr": "00:11:22:33:44:55",
            "model": "TestMiner",
        }
        result = await process_miner_data("192.168.1.100", data_dict)

        assert result.mac == "00:11:22:33:44:55"

    @pytest.mark.asyncio
    async def test_process_miner_data_without_hashrate(self):
        """Test processing miner data without hashrate."""
        data_dict = {
            "mac": "00:11:22:33:44:55",
            "model": "TestMiner",
        }
        result = await process_miner_data("192.168.1.100", data_dict)

        assert result.hashrate == 0.0
