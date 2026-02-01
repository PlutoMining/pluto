"""
Unit tests for HTTP API contracts.

Verifies that API contracts match registered HTTP routes and that
request/response models are correctly wired.
"""

import pytest
from fastapi.routing import APIRoute

from app.api_contracts import API_CONTRACTS, get_contract
from app.app import create_app


def _get_http_routes(app):
    """Yield (path, method) for each HTTP route."""
    for route in app.routes:
        if isinstance(route, APIRoute):
            for method in route.methods:
                if method != "HEAD":  # HEAD often mirrors GET
                    yield route.path, method


class TestAPIContracts:
    """Test API contract definitions."""

    EXPECTED_CONTRACTS = [
        "root",
        "health",
        "scan",
        "get_miner_data",
        "get_miner_data_raw",
        "get_miner_config",
        "update_miner_config",
        "restart_miner",
        "fault_light_on",
        "fault_light_off",
        "get_miner_errors",
        "validate_miners",
    ]

    def test_contracts_defined(self):
        """All expected contracts are defined."""
        for name in self.EXPECTED_CONTRACTS:
            assert name in API_CONTRACTS, f"Missing contract: {name}"

    def test_get_contract(self):
        """get_contract returns definition for known endpoint."""
        c = get_contract("health")
        assert c.method == "GET"
        assert c.path == "/health"
        assert c.response_body is not None

    def test_get_contract_unknown_raises(self):
        """get_contract raises for unknown endpoint."""
        with pytest.raises(KeyError, match="Unknown contract"):
            get_contract("nonexistent")

    def test_contract_methods_and_paths(self):
        """Contracts have valid method and path."""
        for _name, contract in API_CONTRACTS.items():
            assert contract.method in ("GET", "POST", "PUT", "PATCH", "DELETE")
            assert contract.path.startswith("/")
            assert contract.description

    def test_contracts_match_registered_routes(self):
        """Every API contract has a matching registered HTTP route (path + method)."""
        app = create_app()
        registered = set(_get_http_routes(app))
        for name, contract in API_CONTRACTS.items():
            key = (contract.path, contract.method)
            assert key in registered, (
                f"Contract '{name}' ({contract.method} {contract.path}) has no matching route. "
                f"Registered: {sorted(registered)}"
            )

    def test_contracts_have_response_body(self):
        """Every contract has a non-None response_body type."""
        for name, contract in API_CONTRACTS.items():
            assert contract.response_body is not None, f"Contract '{name}' missing response_body"
