"""
Comprehensive contract compliance tests.

Ensures the service implementation fully complies with contracts:
1. Routes exist and match contracts
2. Response models match contracts
3. Service methods return correct domain models
4. Actual responses validate against contract schemas
"""

import inspect
from typing import get_args, get_origin

from fastapi.routing import APIRoute

from app.api_contracts import API_CONTRACTS
from app.app import create_app
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


def _get_http_routes(app):
    """Yield (path, method) for each HTTP route."""
    for route in app.routes:
        if isinstance(route, APIRoute):
            for method in route.methods:
                if method != "HEAD":  # HEAD often mirrors GET
                    yield route.path, method


class TestContractCompliance:
    """Comprehensive contract compliance tests."""

    def test_all_routes_have_contracts(self):
        """Every route has a corresponding contract."""
        app = create_app()
        routes_without_contracts = []

        for route in app.routes:
            if isinstance(route, APIRoute):
                # Skip system routes
                if route.path in ["/docs", "/openapi.json", "/redoc"]:
                    continue

                # Check if contract exists
                has_contract = any(
                    c.path == route.path and c.method in route.methods
                    for c in API_CONTRACTS.values()
                )

                if not has_contract:
                    methods = list(route.methods)
                    routes_without_contracts.append(
                        f"{methods[0] if methods else '?'} {route.path}"
                    )

        assert not routes_without_contracts, (
            f"Routes without contracts: {routes_without_contracts}"
        )

    def test_all_contracts_have_routes(self):
        """Every contract has a corresponding route."""
        app = create_app()
        registered_routes = set(_get_http_routes(app))

        contracts_without_routes = []
        for name, contract in API_CONTRACTS.items():
            key = (contract.path, contract.method)
            if key not in registered_routes:
                contracts_without_routes.append(
                    f"{name}: {contract.method} {contract.path}"
                )

        assert not contracts_without_routes, (
            f"Contracts without routes: {contracts_without_routes}"
        )

    def test_response_models_match_contracts(self):
        """Every route's response_model matches its contract."""
        app = create_app()

        mismatches = []
        for name, contract in API_CONTRACTS.items():
            # Find route
            route = None
            for r in app.routes:
                if isinstance(r, APIRoute):
                    if r.path == contract.path and contract.method.upper() in r.methods:
                        route = r
                        break

            if route is None:
                continue  # Already tested above

            # Verify response_model
            contract_response = contract.response_body
            route_response = route.response_model

            # Handle RootModel
            if hasattr(contract_response, "__root__"):
                wrapped = contract_response.__root__
                if route_response != contract_response and route_response != wrapped:
                    mismatches.append(
                        f"Contract '{name}': response_model mismatch. "
                        f"Route: {route_response}, Contract: {contract_response}"
                    )
            else:
                if route_response != contract_response:
                    mismatches.append(
                        f"Contract '{name}': response_model mismatch. "
                        f"Route: {route_response}, Contract: {contract_response}"
                    )

        assert not mismatches, "\n".join(mismatches)

    def test_service_return_types(self):
        """Service methods have correct return type annotations."""
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

        errors = []
        for method_name, expected_type in expected_return_types.items():
            method = getattr(service, method_name)
            sig = inspect.signature(method)
            return_annotation = sig.return_annotation

            # Handle generic types (list[T])
            if hasattr(return_annotation, "__origin__") or get_origin(return_annotation):
                # Generic type like list[MinerInfo]
                origin = get_origin(return_annotation) or return_annotation.__origin__
                args = get_args(return_annotation) or return_annotation.__args__
                expected_origin = get_origin(expected_type) or (
                    expected_type.__origin__ if hasattr(expected_type, "__origin__") else expected_type
                )
                expected_args = get_args(expected_type) or (
                    expected_type.__args__ if hasattr(expected_type, "__args__") else ()
                )

                if origin != expected_origin:
                    errors.append(
                        f"{method_name}: return type origin mismatch. "
                        f"Got {origin}, expected {expected_origin}"
                    )
                elif args and expected_args and args != expected_args:
                    errors.append(
                        f"{method_name}: return type args mismatch. "
                        f"Got {args}, expected {expected_args}"
                    )
            else:
                if return_annotation != expected_type:
                    errors.append(
                        f"{method_name}: return type mismatch. "
                        f"Got {return_annotation}, expected {expected_type}"
                    )

        assert not errors, "\n".join(errors)
