"""
Factory helpers for miner WebSocket clients.
"""

from __future__ import annotations

from .base import MinerWebSocketClient
from .bitaxe import BitaxeWebSocketClient
from .noop import NoopWebSocketClient


def get_miner_ws_client(
  *,
  miner_model: str | None = None,
) -> MinerWebSocketClient:
  """
  Factory for MinerWebSocketClient implementations.

  Selects the appropriate WebSocket client based on miner model:
  - Bitaxe miners use BitaxeWebSocketClient when the model string suggests it.
  - All other miners fall back to NoopWebSocketClient.

  This keeps the API open for extension: new miner families can register
  their own MinerWebSocketClient without changing existing callers.
  """
  normalized_model = (miner_model or "").lower()

  # Very conservative heuristic: treat models mentioning "bitaxe" as Bitaxe.
  if "bitaxe" in normalized_model:
    return BitaxeWebSocketClient()

  # Default: logs not supported for this miner.
  return NoopWebSocketClient()

