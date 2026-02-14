"""
WebSocket client package for miner log streaming.

This package exposes the public abstractions and factories for creating
miner WebSocket clients. Concrete implementations live in dedicated
modules to keep each miner family isolated and maintainable.
"""

from .base import MinerWebSocketClient
from .bitaxe import BitaxeWebSocketClient
from .factory import get_miner_ws_client
from .noop import NoopWebSocketClient

__all__ = [
    "MinerWebSocketClient",
    "BitaxeWebSocketClient",
    "NoopWebSocketClient",
    "get_miner_ws_client",
]

