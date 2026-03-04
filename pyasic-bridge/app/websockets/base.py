"""
Base abstractions for miner WebSocket clients.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from fastapi import WebSocket


class MinerWebSocketClient(ABC):
  """
  Abstraction for connecting to a miner's WebSocket endpoint and
  streaming log messages to a connected client WebSocket.

  Responsibilities:
  - Establish a connection to the miner-specific WebSocket URI.
  - Forward messages from the miner to the consumer WebSocket.
  - Handle cleanup and error reporting in a miner-agnostic way.
  """

  @abstractmethod
  async def connect_and_stream(self, ip: str, client_ws: WebSocket) -> None:  # pragma: no cover - interface
    """
    Connect to the miner at the given IP and stream messages to client_ws.

    Implementations are responsible for:
    - Using the appropriate miner-specific URI.
    - Forwarding messages from miner -> client.
    - Handling client disconnects and cleanup.
    """

