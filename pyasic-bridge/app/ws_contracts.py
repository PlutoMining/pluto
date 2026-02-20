"""
WebSocket contract definitions for pyasic-bridge.

Defines WebSocket endpoints separately from HTTP API contracts:
WebSockets have no single request/response body; they are streams.
This module is the single source of truth for WS paths and message semantics.
"""

from typing import Literal

from pydantic import BaseModel


class WebSocketEndpointDefinition(BaseModel):
    """
    Definition of a WebSocket endpoint.

    Documents path, path params, and message semantics so the endpoint
    can be controlled (documented, verified, client-generated).
    """

    path: str
    description: str
    path_params: dict[str, type] = {}
    # Server -> client: e.g. "text" for log lines streamed as text frames
    server_message_kind: Literal["text", "binary", "json"] = "text"
    # Client -> server: e.g. "none" for receive-only, "text" for optional pings
    client_message_kind: Literal["none", "text", "binary", "json"] = "none"


# =============================================================================
# WebSocket contracts – single source of truth
# =============================================================================

WS_CONTRACTS: dict[str, WebSocketEndpointDefinition] = {
    "miner_logs": WebSocketEndpointDefinition(
        path="/ws/miner/{ip}",
        description="Stream logs from a miner. Backend connects once per device; "
        "pyasic-bridge selects the miner-specific WebSocket client and streams "
        "log lines from the miner firmware to the connected WebSocket.",
        path_params={"ip": str},
        server_message_kind="text",
        client_message_kind="none",
    ),
}


def get_ws_contract(name: str) -> WebSocketEndpointDefinition:
    """Return the WebSocket contract for a named endpoint."""
    if name not in WS_CONTRACTS:
        raise KeyError(f"Unknown WS contract: {name}. Known: {list(WS_CONTRACTS.keys())}")
    return WS_CONTRACTS[name]
