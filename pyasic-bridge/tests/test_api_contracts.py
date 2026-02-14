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

    def test_routes_use_contract_response_models(self):
        """Every route's response_model matches its contract's response_body."""
        app = create_app()

        for name, contract in API_CONTRACTS.items():
            # Find matching route
            route = None
            for r in app.routes:
                if isinstance(r, APIRoute):
                    route_path = r.path.rstrip("/")
                    contract_path = contract.path.rstrip("/")
                    if route_path == contract_path and contract.method.upper() in r.methods:
                        route = r
                        break

            if route is None:
                # Skip if route not found (already tested in test_contracts_match_registered_routes)
                continue

            # Verify response_model matches contract
            contract_response = contract.response_body
            route_response = route.response_model

            # Handle RootModel wrapping (FastAPI accepts both RootModel[list[T]] and list[T])
            if hasattr(contract_response, "__root__"):
                # RootModel - route can return list directly or wrapped
                wrapped_type = contract_response.__root__
                assert route_response == contract_response or route_response == wrapped_type, (
                    f"Contract '{name}': Route response_model {route_response} "
                    f"does not match contract {contract_response}. "
                    f"Expected {contract_response} or {wrapped_type}"
                )
            else:
                assert route_response == contract_response, (
                    f"Contract '{name}': Route response_model {route_response} "
                    f"does not match contract {contract_response}"
                )

    def test_service_methods_return_domain_models(self):
        """Service methods have correct return type annotations for domain models."""
        import inspect

        from app.models import (
            MinerConfigModel,
            MinerData,
            MinerDataRaw,
            MinerErrorEntry,
            MinerInfo,
            MinerValidationResult,
            StatusResponse,
        )
        from app.services import MinerService

        service = MinerService()
        expected_return_types = {
            "scan_miners": list[MinerInfo],
            "get_miner_data": MinerData,
            "get_miner_data_raw": MinerDataRaw,
            "get_miner_config": MinerConfigModel,
            "update_miner_config": StatusResponse,
            "restart_miner": StatusResponse,
            "fault_light_on": StatusResponse,
            "fault_light_off": StatusResponse,
            "get_miner_errors": list[MinerErrorEntry],
            "validate_miners": list[MinerValidationResult],
        }

        for method_name, expected_type in expected_return_types.items():
            method = getattr(service, method_name)
            sig = inspect.signature(method)
            return_annotation = sig.return_annotation

            # Verify return type annotation matches expected
            # Handle generic types (list[T])
            if hasattr(return_annotation, "__origin__"):
                # Generic type like list[MinerInfo]
                origin = return_annotation.__origin__
                args = return_annotation.__args__
                expected_origin = expected_type.__origin__ if hasattr(expected_type, "__origin__") else expected_type
                expected_args = expected_type.__args__ if hasattr(expected_type, "__args__") else ()

                assert origin == expected_origin, (
                    f"{method_name}: return type origin mismatch. "
                    f"Got {origin}, expected {expected_origin}"
                )
                if args and expected_args:
                    assert args == expected_args, (
                        f"{method_name}: return type args mismatch. "
                        f"Got {args}, expected {expected_args}"
                    )
            else:
                    assert return_annotation == expected_type, (
                        f"{method_name}: return type mismatch. "
                        f"Got {return_annotation}, expected {expected_type}"
                    )

    @pytest.mark.asyncio
    async def test_responses_validate_against_contracts(self):
        """Integration test: actual responses validate against contract schemas."""
        from unittest.mock import AsyncMock, MagicMock

        import httpx

        from app.api import get_miner_service
        from app.app import create_app
        from app.models import MinerData, StatusResponse
        from app.services import MinerService

        # Create app with mocked service
        mock_service = MagicMock(spec=MinerService)
        app = create_app()
        app.dependency_overrides[get_miner_service] = lambda: mock_service

        # Test each contract with mock data
        test_cases = [
            ("get_miner_data", "/miner/192.168.1.100/data", "GET", MinerData(ip="192.168.1.100")),
            ("restart_miner", "/miner/192.168.1.100/restart", "POST", StatusResponse(status="success")),
        ]

        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://test"
        ) as client:
            for contract_name, path, method, mock_response in test_cases:
                if contract_name not in API_CONTRACTS:
                    continue

                contract = API_CONTRACTS[contract_name]

                # Setup mock
                if contract_name == "get_miner_data":
                    mock_service.get_miner_data = AsyncMock(return_value=mock_response)
                elif contract_name == "restart_miner":
                    mock_service.restart_miner = AsyncMock(return_value=mock_response)

                # Make request
                try:
                    if method == "GET":
                        response = await client.get(path)
                    elif method == "POST":
                        response = await client.post(path)

                    # Validate response can be parsed as contract response_body
                    if response.status_code == 200:
                        response_data = response.json()
                        # Validate against contract schema
                        contract_response_model = contract.response_body
                        # Handle RootModel wrapping
                        if hasattr(contract_response_model, "__root__"):
                            # RootModel - validate the wrapped type
                            wrapped_type = contract_response_model.__root__
                            if isinstance(response_data, list):
                                # Validate each item in the list
                                for item in response_data:
                                    wrapped_type.model_validate(item)
                            else:
                                wrapped_type.model_validate(response_data)
                        else:
                            # Pydantic will raise ValidationError if invalid
                            validated = contract_response_model.model_validate(response_data)
                            assert validated is not None
                except Exception as e:
                    pytest.fail(
                        f"Contract '{contract_name}': Response does not match schema. "
                        f"Error: {e}"
                    )
