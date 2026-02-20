"""
No-op miner WebSocket client.

Used when a miner type does not expose a WebSocket API.
"""

from fastapi import WebSocket

from .base import MinerWebSocketClient


class NoopWebSocketClient(MinerWebSocketClient):
  """
  No-op implementation used when a miner type does not expose a WebSocket API.

  This keeps behavior explicit and predictable: the API will accept the
  WebSocket connection, send an informational message and then close.
  """

  async def connect_and_stream(self, ip: str, client_ws: WebSocket) -> None:
    # We intentionally do not attempt any outbound connection.
    try:
      await client_ws.send_text("logs not supported for this miner")
    finally:
      await client_ws.close()

