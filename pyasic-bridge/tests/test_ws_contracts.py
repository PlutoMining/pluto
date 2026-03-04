"""
Unit tests for WebSocket contracts.

Verifies that WS contracts match registered WebSocket routes and
that get_ws_contract works correctly.
"""

import pytest
from starlette.routing import WebSocketRoute

from app.app import create_app
from app.ws_contracts import WS_CONTRACTS, get_ws_contract


def _get_ws_routes(app):
    """Yield path for each WebSocket route."""
    for route in app.routes:
        if isinstance(route, WebSocketRoute):
            yield route.path


class TestWebSocketContracts:
    """Test WebSocket contract definitions."""

    def test_ws_contracts_defined(self):
        """Expected WebSocket contracts exist."""
        assert "miner_logs" in WS_CONTRACTS

    def test_get_ws_contract(self):
        """get_ws_contract returns definition for known endpoint."""
        c = get_ws_contract("miner_logs")
        assert c.path == "/ws/miner/{ip}"
        assert "miner" in c.path
        assert c.server_message_kind == "text"

    def test_get_ws_contract_unknown_raises(self):
        """get_ws_contract raises for unknown endpoint."""
        with pytest.raises(KeyError, match="Unknown WS contract"):
            get_ws_contract("nonexistent")

    def test_ws_contract_matches_registered_route(self):
        """WebSocket contract path matches the registered WebSocket route."""
        app = create_app()
        ws_paths = set(_get_ws_routes(app))
        for _name, contract in WS_CONTRACTS.items():
            assert contract.path in ws_paths, (
                f"WS contract '{contract.path}' has no matching route. Registered: {ws_paths}"
            )
