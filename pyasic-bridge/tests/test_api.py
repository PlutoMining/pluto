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
from app.validators import ConfigValidationError


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
    async def test_root(self, client):
        """Test root endpoint returns service info."""
        response = await client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "Pyasic Bridge"
        assert data["version"] == "1.0.0"
        assert data["docs"] == "/docs"
        assert data["health"] == "/health"

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
            data={"ip": "192.168.1.100", "hashrate": {"rate": 1.0, "unit": {"value": 1000000000, "suffix": "Gh/s"}}},
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
            data={"ip": "192.168.1.100", "hashrate": {"rate": 1.0, "unit": {"value": 1000000000, "suffix": "Gh/s"}}},
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
            "ip": "192.168.1.100",
            "hashrate": {"rate": 1.0, "unit": {"value": 1000000000, "suffix": "Gh/s"}},
            "wattage": 50.0
        }
        mock_service.get_miner_data = AsyncMock(return_value=mock_data)

        response = await client.get("/miner/192.168.1.100/data")
        assert response.status_code == 200
        data = response.json()
        assert data["ip"] == "192.168.1.100"
        assert "hashrate" in data

    @pytest.mark.asyncio
    async def test_get_miner_data_not_found(self, client, mock_service):
        """Test getting miner data when not found."""
        mock_service.get_miner_data = AsyncMock(side_effect=ValueError("Miner not found at 192.168.1.100"))

        response = await client.get("/miner/192.168.1.100/data")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_miner_data_connection_error_returns_404(self, client, mock_service):
        """Test ConnectionError from get_miner_data returns 404."""
        mock_service.get_miner_data = AsyncMock(side_effect=ConnectionError("Connection refused"))
        response = await client.get("/miner/192.168.1.100/data")
        assert response.status_code == 404
        assert "Could not connect" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_get_miner_data_timeout_error_returns_404(self, client, mock_service):
        """Test TimeoutError from get_miner_data returns 404."""
        mock_service.get_miner_data = AsyncMock(side_effect=TimeoutError("Timed out"))
        response = await client.get("/miner/192.168.1.100/data")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_miner_data_os_error_returns_404(self, client, mock_service):
        """Test OSError from get_miner_data returns 404."""
        mock_service.get_miner_data = AsyncMock(side_effect=OSError(111, "Connection refused"))
        response = await client.get("/miner/192.168.1.100/data")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_miner_config_success(self, client, mock_service):
        """Test getting miner config successfully."""
        mock_config = {
            "pools": {
                "groups": [
                    {
                        "pools": [{"url": "stratum+tcp://pool.example.com:3333", "user": None, "password": None}],
                        "quota": 1,
                        "name": None,
                    }
                ]
            },
            "fan_mode": {"mode": "manual", "speed": 60, "minimum_fans": 1},
        }
        mock_service.get_miner_config = AsyncMock(return_value=mock_config)

        response = await client.get("/miner/192.168.1.100/config")
        assert response.status_code == 200
        data = response.json()
        assert "pools" in data
        assert data["pools"]["groups"][0]["pools"][0]["url"] == "stratum+tcp://pool.example.com:3333"
        assert data["fan_mode"]["mode"] == "manual"

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
            json={
                "pools": {
                    "groups": [
                        {
                            "pools": [{"url": "stratum+tcp://pool.example.com:3333", "user": None, "password": None}],
                            "quota": 1,
                            "name": None,
                        }
                    ]
                }
            },
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
    async def test_update_miner_config_validation_error_returns_400(self, client, mock_service):
        """Test that config validation errors return 400 Bad Request, not 404."""
        mock_service.update_miner_config = AsyncMock(
            side_effect=ConfigValidationError("Invalid frequency 500 for Bitaxe miner. Accepted values are: [400, 490, 525, 550, 600, 625]")
        )

        response = await client.patch(
            "/miner/192.168.1.100/config",
            json={"extra_config": {"frequency": 500}},
        )
        assert response.status_code == 400
        data = response.json()
        assert "Invalid frequency" in data["detail"]

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
        """Test getting miner errors successfully (pyasic BaseMinerError: error_code + optional fields)."""
        mock_service.get_miner_errors = AsyncMock(
            return_value=[{"error_code": 1, "message": "Error 1"}, {"error_code": 2, "message": "Error 2"}]
        )

        response = await client.get("/miner/192.168.1.100/errors")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["error_code"] == 1 and data[0]["message"] == "Error 1"
        assert data[1]["error_code"] == 2 and data[1]["message"] == "Error 2"

    @pytest.mark.asyncio
    async def test_get_miner_errors_not_found(self, client, mock_service):
        """Test getting miner errors when not found."""
        mock_service.get_miner_errors = AsyncMock(side_effect=ValueError("Miner not found at 192.168.1.100"))

        response = await client.get("/miner/192.168.1.100/errors")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_validate_miners_success(self, client, mock_service):
        """Test validating miners successfully."""
        mock_service.validate_miners = AsyncMock(return_value=[
            {"ip": "192.168.1.100", "is_miner": True, "model": "BitAxe", "error": None},
        ])
        response = await client.post("/miners/validate", json={"ips": ["192.168.1.100"]})
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["ip"] == "192.168.1.100"
        assert data[0]["is_miner"] is True

    @pytest.mark.asyncio
    async def test_validate_miners_empty_ips_validation_error(self, client, mock_service):
        """Test validating with empty ips returns 422 (Pydantic validation)."""
        response = await client.post("/miners/validate", json={"ips": []})
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_validate_miners_service_exception_returns_500(self, client, mock_service):
        """Test validate_miners service exception returns 500."""
        mock_service.validate_miners = AsyncMock(side_effect=Exception("Service error"))
        response = await client.post("/miners/validate", json={"ips": ["192.168.1.100"]})
        assert response.status_code == 500

    @pytest.mark.asyncio
    async def test_get_miner_data_raw_success(self, client, mock_service):
        """Test getting raw miner data successfully."""
        mock_data = {
            "hashrate": 1.0,
            "wattage": 50.0,
            "raw_field": "raw_value"
        }
        mock_service.get_miner_data_raw = AsyncMock(return_value=mock_data)

        response = await client.get("/miner/192.168.1.100/data/raw")
        assert response.status_code == 200
        data = response.json()
        assert "hashrate" in data
        assert "raw_field" in data

    @pytest.mark.asyncio
    async def test_get_miner_data_raw_not_found(self, client, mock_service):
        """Test getting raw miner data when not found."""
        mock_service.get_miner_data_raw = AsyncMock(side_effect=ValueError("Miner not found at 192.168.1.100"))

        response = await client.get("/miner/192.168.1.100/data/raw")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_miner_data_raw_error(self, client, mock_service):
        """Test getting raw miner data with service error."""
        mock_service.get_miner_data_raw = AsyncMock(side_effect=Exception("Service error"))

        response = await client.get("/miner/192.168.1.100/data/raw")
        assert response.status_code == 500

    @pytest.mark.asyncio
    async def test_get_miner_data_error(self, client, mock_service):
        """Test getting miner data with service error."""
        mock_service.get_miner_data = AsyncMock(side_effect=Exception("Service error"))

        response = await client.get("/miner/192.168.1.100/data")
        assert response.status_code == 500

    @pytest.mark.asyncio
    async def test_get_miner_config_error(self, client, mock_service):
        """Test getting miner config with service error."""
        mock_service.get_miner_config = AsyncMock(side_effect=Exception("Service error"))

        response = await client.get("/miner/192.168.1.100/config")
        assert response.status_code == 500

    @pytest.mark.asyncio
    async def test_update_miner_config_error(self, client, mock_service):
        """Test updating miner config with service error."""
        mock_service.update_miner_config = AsyncMock(side_effect=Exception("Service error"))

        response = await client.patch("/miner/192.168.1.100/config", json={})
        assert response.status_code == 500

    @pytest.mark.asyncio
    async def test_restart_miner_error(self, client, mock_service):
        """Test restarting miner with service error."""
        mock_service.restart_miner = AsyncMock(side_effect=Exception("Service error"))

        response = await client.post("/miner/192.168.1.100/restart")
        assert response.status_code == 500

    @pytest.mark.asyncio
    async def test_fault_light_on_error(self, client, mock_service):
        """Test turning fault light on with service error."""
        mock_service.fault_light_on = AsyncMock(side_effect=Exception("Service error"))

        response = await client.post("/miner/192.168.1.100/fault-light/on")
        assert response.status_code == 500

    @pytest.mark.asyncio
    async def test_fault_light_off_error(self, client, mock_service):
        """Test turning fault light off with service error."""
        mock_service.fault_light_off = AsyncMock(side_effect=Exception("Service error"))

        response = await client.post("/miner/192.168.1.100/fault-light/off")
        assert response.status_code == 500

    @pytest.mark.asyncio
    async def test_get_miner_errors_error(self, client, mock_service):
        """Test getting miner errors with service error."""
        mock_service.get_miner_errors = AsyncMock(side_effect=Exception("Service error"))

        response = await client.get("/miner/192.168.1.100/errors")
        assert response.status_code == 500

    def test_get_miner_service_not_configured(self):
        """Test get_miner_service raises RuntimeError when not configured."""
        with pytest.raises(RuntimeError, match="MinerService not configured"):
            get_miner_service()

    @pytest.mark.asyncio
    async def test_miner_logs_websocket_accepts_and_streams(self, app, mock_service):
        """Test WebSocket miner logs endpoint accepts connection and streams (mocked)."""
        import asyncio
        from unittest.mock import AsyncMock, MagicMock, patch

        mock_service.get_miner_data = AsyncMock(return_value={"model": "BitAxe", "device_info": {"model": "Gamma"}})
        mock_ws_client = MagicMock()
        mock_ws_client.connect_and_stream = AsyncMock(return_value=None)

        # Drive ASGI app with a fake WebSocket scope (avoids Starlette TestClient/httpx app= incompatibility)
        scope = {
            "type": "websocket",
            "path": "/ws/miner/192.168.1.100",
            "raw_path": b"/ws/miner/192.168.1.100",
            "root_path": "",
            "scheme": "ws",
            "query_string": b"",
            "headers": [(b"host", b"testserver")],
            "client": ("testclient", 50000),
            "server": ("testserver", 80),
            "subprotocols": [],
            "state": {},
            "extensions": {"websocket.http.response": {}},
        }
        received_messages = []

        async def receive():
            if not received_messages:
                return {"type": "websocket.connect"}
            await asyncio.sleep(0.01)
            return {"type": "websocket.disconnect", "code": 1000}

        async def send(message):
            received_messages.append(message)
            if message.get("type") == "websocket.accept":
                # After accept, route will call connect_and_stream; wake receive to eventually disconnect
                pass

        with patch("app.api.get_miner_ws_client", return_value=mock_ws_client):
            await app(scope, receive, send)

        assert any(m.get("type") == "websocket.accept" for m in received_messages)
        mock_ws_client.connect_and_stream.assert_called_once()
        assert mock_ws_client.connect_and_stream.call_args[0][0] == "192.168.1.100"
