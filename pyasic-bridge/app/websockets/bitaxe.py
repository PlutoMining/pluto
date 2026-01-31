"""
Bitaxe-specific miner WebSocket client.
"""

from fastapi import WebSocket

from .base import MinerWebSocketClient


class BitaxeWebSocketClient(MinerWebSocketClient):
  """
  MinerWebSocketClient implementation for Bitaxe miners.

  Connects directly to the Bitaxe firmware WebSocket endpoint and forwards
  log messages to the connected client.
  """

  def __init__(self, path: str = "/api/ws") -> None:
    # The path can be overridden for testing or future firmware changes.
    self._path = path

  async def connect_and_stream(self, ip: str, client_ws: WebSocket) -> None:
    # Import websockets lazily so that the dependency is only required
    # when this client is actually used.
    import asyncio

    import websockets
    from websockets.exceptions import WebSocketException

    miner_url = f"ws://{ip}{self._path}"

    try:
      async with websockets.connect(miner_url) as miner_ws:
        # Stream messages from miner -> client.
        async for message in miner_ws:
          try:
            if isinstance(message, bytes):
              # Decode bytes defensively; logs are expected to be text.
              text = message.decode("utf-8", errors="ignore")
            else:
              text = str(message)
            await client_ws.send_text(text)
          except Exception:
            # If the client disconnects or sending fails, stop streaming.
            break
    except (OSError, WebSocketException, asyncio.CancelledError) as exc:
      # Surface a concise error to the client and close.
      try:
        await client_ws.send_text(f"error connecting to miner websocket: {exc}")
      except Exception:
        # Ignore failures while reporting the error.
        pass
    finally:
      # Always close the client socket when we're done.
      try:
        await client_ws.close()
      except Exception:
        # The client may have already disconnected.
        pass

