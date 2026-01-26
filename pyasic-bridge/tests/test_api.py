"""
Unit tests for API routes.
"""

from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from app.api import get_miner_service
from app.app import create_app
from app.models import MinerInfo
from app.services import MinerService


class TestAPIRoutes:
    """Test API routes."""

    @pytest.fixture
    def mock_service(self):
        """Create mock miner service."""
        service = MagicMock(spec=MinerService)
        return service

    @pytest.fixture
    def app(self, mock_service):
        """Create app with mocked service."""
        app = create_app()
        app.dependency_overrides[get_miner_service] = lambda: mock_service
        return app

    @pytest.fixture
    async def client(self, app):
        """Create async test client with mocked service."""
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac

    @pytest.mark.asyncio
    async def test_health_check(self, client):
        """Test health check endpoint."""
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "healthy"}

    @pytest.mark.asyncio
    async def test_scan_miners_single_ip(self, client, mock_service):
        """Test scanning single IP."""

        mock_miner_info = MinerInfo(
            ip="192.168.1.100",
            mac="00:11:22:33:44:55",
            model="TestMiner",
            hostname="test-miner",
            hashrate=1.0,
            data={"hashrate": {"rate": 1.0, "unit": {"value": 1000000000, "suffix": "Gh/s"}}}
        )
        mock_service.scan_miners = AsyncMock(return_value=[mock_miner_info])

        response = await client.post("/scan", json={"ip": "192.168.1.100"})
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["ip"] == "192.168.1.100"

    @pytest.mark.asyncio
    async def test_scan_miners_subnet(self, client, mock_service):
        """Test scanning subnet."""

        mock_miner_info = MinerInfo(
            ip="192.168.1.100",
            mac="00:11:22:33:44:55",
            model="TestMiner",
            hostname="test-miner",
            hashrate=1.0,
            data={"hashrate": {"rate": 1.0, "unit": {"value": 1000000000, "suffix": "Gh/s"}}}
        )
        mock_service.scan_miners = AsyncMock(return_value=[mock_miner_info])

        response = await client.post("/scan", json={"subnet": "192.168.1.0/24"})
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1

    @pytest.mark.asyncio
    async def test_scan_miners_no_ip_or_subnet(self, client, mock_service):
        """Test scanning without IP or subnet."""
        mock_service.scan_miners = AsyncMock(side_effect=ValueError("Either 'ip' or 'subnet' must be provided"))

        response = await client.post("/scan", json={})
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_scan_miners_error(self, client, mock_service):
        """Test scanning with service error."""
        mock_service.scan_miners = AsyncMock(side_effect=Exception("Service error"))

        response = await client.post("/scan", json={"ip": "192.168.1.100"})
        assert response.status_code == 500

    @pytest.mark.asyncio
    async def test_get_miner_data_success(self, client, mock_service):
        """Test getting miner data successfully."""
        mock_data = {
            "hashrate": {"rate": 1.0, "unit": {"value": 1000000000, "suffix": "Gh/s"}},
            "wattage": 50.0
        }
        mock_service.get_miner_data = AsyncMock(return_value=mock_data)

        response = await client.get("/miner/192.168.1.100/data")
        assert response.status_code == 200
        data = response.json()
        assert "hashrate" in data

    @pytest.mark.asyncio
    async def test_get_miner_data_not_found(self, client, mock_service):
        """Test getting miner data when not found."""
        mock_service.get_miner_data = AsyncMock(side_effect=ValueError("Miner not found at 192.168.1.100"))

        response = await client.get("/miner/192.168.1.100/data")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_miner_config_success(self, client, mock_service):
        """Test getting miner config successfully."""
        mock_config = {"pool": "stratum+tcp://pool.example.com:3333"}
        mock_service.get_miner_config = AsyncMock(return_value=mock_config)

        response = await client.get("/miner/192.168.1.100/config")
        assert response.status_code == 200
        data = response.json()
        assert "pool" in data

    @pytest.mark.asyncio
    async def test_get_miner_config_not_found(self, client, mock_service):
        """Test getting miner config when not found."""
        mock_service.get_miner_config = AsyncMock(side_effect=ValueError("Miner not found at 192.168.1.100"))

        response = await client.get("/miner/192.168.1.100/config")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_miner_config_success(self, client, mock_service):
        """Test updating miner config successfully."""
        mock_service.update_miner_config = AsyncMock(return_value={"status": "success"})

        response = await client.patch(
            "/miner/192.168.1.100/config",
            json={"pool": "stratum+tcp://pool.example.com:3333"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"

    @pytest.mark.asyncio
    async def test_update_miner_config_not_found(self, client, mock_service):
        """Test updating miner config when not found."""
        mock_service.update_miner_config = AsyncMock(side_effect=ValueError("Miner not found at 192.168.1.100"))

        response = await client.patch("/miner/192.168.1.100/config", json={})
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_restart_miner_success(self, client, mock_service):
        """Test restarting miner successfully."""
        mock_service.restart_miner = AsyncMock(return_value={"status": "success"})

        response = await client.post("/miner/192.168.1.100/restart")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"

    @pytest.mark.asyncio
    async def test_restart_miner_not_found(self, client, mock_service):
        """Test restarting miner when not found."""
        mock_service.restart_miner = AsyncMock(side_effect=ValueError("Miner not found at 192.168.1.100"))

        response = await client.post("/miner/192.168.1.100/restart")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_fault_light_on_success(self, client, mock_service):
        """Test turning fault light on successfully."""
        mock_service.fault_light_on = AsyncMock(return_value={"status": "success"})

        response = await client.post("/miner/192.168.1.100/fault-light/on")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"

    @pytest.mark.asyncio
    async def test_fault_light_on_not_found(self, client, mock_service):
        """Test turning fault light on when not found."""
        mock_service.fault_light_on = AsyncMock(side_effect=ValueError("Miner not found at 192.168.1.100"))

        response = await client.post("/miner/192.168.1.100/fault-light/on")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_fault_light_off_success(self, client, mock_service):
        """Test turning fault light off successfully."""
        mock_service.fault_light_off = AsyncMock(return_value={"status": "success"})

        response = await client.post("/miner/192.168.1.100/fault-light/off")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"

    @pytest.mark.asyncio
    async def test_fault_light_off_not_found(self, client, mock_service):
        """Test turning fault light off when not found."""
        mock_service.fault_light_off = AsyncMock(side_effect=ValueError("Miner not found at 192.168.1.100"))

        response = await client.post("/miner/192.168.1.100/fault-light/off")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_miner_errors_success(self, client, mock_service):
        """Test getting miner errors successfully."""
        mock_service.get_miner_errors = AsyncMock(return_value=["Error 1", "Error 2"])

        response = await client.get("/miner/192.168.1.100/errors")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2

    @pytest.mark.asyncio
    async def test_get_miner_errors_not_found(self, client, mock_service):
        """Test getting miner errors when not found."""
        mock_service.get_miner_errors = AsyncMock(side_effect=ValueError("Miner not found at 192.168.1.100"))

        response = await client.get("/miner/192.168.1.100/errors")
        assert response.status_code == 404
