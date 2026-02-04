"""
Factory helpers for miner WebSocket clients.
"""

from __future__ import annotations

from app.miner_detection import is_bitaxe_model

from .base import MinerWebSocketClient
from .bitaxe import BitaxeWebSocketClient
from .noop import NoopWebSocketClient


def get_miner_ws_client(
    *,
    miner_model: str | None = None,
) -> MinerWebSocketClient:
    """
    Factory for MinerWebSocketClient implementations.

    Selects the appropriate WebSocket client based on miner model.
    New miner families can register their own client without changing callers.
    """
    if is_bitaxe_model(miner_model):
        return BitaxeWebSocketClient()
    return NoopWebSocketClient()

