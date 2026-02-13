"""
API contract definitions for pyasic-bridge.

This file defines all HTTP and WebSocket endpoints exposed by the bridge
in a type-safe way. Single source of truth for paths, methods, and
request/response (or message) models.
"""

from typing import Literal

from pydantic import BaseModel

from app.models import (
    HealthResponse,
    MinerActionResponse,
    MinerConfigPatch,
    MinerConfigResponse,
    MinerData,
    MinerDataRaw,
    MinerErrorsResponse,
    RootResponse,
    ScanRequest,
    ScanResponse,
    ValidateRequest,
    ValidateResponse,
)

# =============================================================================
# HTTP endpoint definition
# =============================================================================


class EndpointDefinition(BaseModel):
    """Definition of a single HTTP API endpoint."""

    method: Literal["GET", "POST", "PUT", "PATCH", "DELETE"]
    path: str
    description: str
    request_body: type[BaseModel] | None = None
    response_body: type[BaseModel]
    path_params: dict[str, type] = {}
    query_params: dict[str, type] = {}


# =============================================================================
# WebSocket endpoint definition
# =============================================================================


class WebSocketEndpointDefinition(BaseModel):
    """
    Definition of a WebSocket endpoint.

    WebSockets are separate from HTTP contracts because they have no
    single request/response body; they are bidirectional streams.
    This definition documents path, path params, and the message semantics
    so the endpoint can be controlled (documented, verified, client-generated).
    """

    path: str
    description: str
    path_params: dict[str, type] = {}
    # Server -> client: e.g. "text" for log lines streamed as text frames
    server_message_kind: Literal["text", "binary", "json"] = "text"
    # Client -> server: e.g. "none" for receive-only, "text" for optional pings
    client_message_kind: Literal["none", "text", "binary", "json"] = "none"


# =============================================================================
# API contracts – single source of truth
# =============================================================================

API_CONTRACTS: dict[str, EndpointDefinition] = {
    # Root & health
    "root": EndpointDefinition(
        method="GET",
        path="/",
        description="Service info and links",
        response_body=RootResponse,
    ),
    "health": EndpointDefinition(
        method="GET",
        path="/health",
        description="Health check",
        response_body=HealthResponse,
    ),
    # Scan
    "scan": EndpointDefinition(
        method="POST",
        path="/scan",
        description="Scan for miners by IP or subnet",
        request_body=ScanRequest,
        response_body=ScanResponse,
    ),
    # Miner data
    "get_miner_data": EndpointDefinition(
        method="GET",
        path="/miner/{ip}/data",
        description="Get normalized data from a miner",
        path_params={"ip": str},
        response_body=MinerData,
    ),
    "get_miner_data_raw": EndpointDefinition(
        method="GET",
        path="/miner/{ip}/data/raw",
        description="Get raw miner data without normalization",
        path_params={"ip": str},
        response_body=MinerDataRaw,
    ),
    # Miner config
    "get_miner_config": EndpointDefinition(
        method="GET",
        path="/miner/{ip}/config",
        description="Get miner configuration",
        path_params={"ip": str},
        response_body=MinerConfigResponse,
    ),
    "update_miner_config": EndpointDefinition(
        method="PATCH",
        path="/miner/{ip}/config",
        description="Update miner configuration",
        path_params={"ip": str},
        request_body=MinerConfigPatch,
        response_body=MinerActionResponse,
    ),
    # Miner actions
    "restart_miner": EndpointDefinition(
        method="POST",
        path="/miner/{ip}/restart",
        description="Restart miner",
        path_params={"ip": str},
        response_body=MinerActionResponse,
    ),
    "fault_light_on": EndpointDefinition(
        method="POST",
        path="/miner/{ip}/fault-light/on",
        description="Turn on fault light",
        path_params={"ip": str},
        response_body=MinerActionResponse,
    ),
    "fault_light_off": EndpointDefinition(
        method="POST",
        path="/miner/{ip}/fault-light/off",
        description="Turn off fault light",
        path_params={"ip": str},
        response_body=MinerActionResponse,
    ),
    # Miner errors
    "get_miner_errors": EndpointDefinition(
        method="GET",
        path="/miner/{ip}/errors",
        description="Get miner errors if available",
        path_params={"ip": str},
        response_body=MinerErrorsResponse,
    ),
    # Validation
    "validate_miners": EndpointDefinition(
        method="POST",
        path="/miners/validate",
        description="Validate multiple IPs as miners",
        request_body=ValidateRequest,
        response_body=ValidateResponse,
    ),
}


def get_contract(name: str) -> EndpointDefinition:
    """Return the HTTP contract for a named endpoint."""
    if name not in API_CONTRACTS:
        raise KeyError(f"Unknown contract: {name}. Known: {list(API_CONTRACTS.keys())}")
    return API_CONTRACTS[name]
