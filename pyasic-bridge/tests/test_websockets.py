"""
Unit tests for WebSocket abstractions.
"""

import sys
import types
from unittest.mock import AsyncMock

import pytest

from app.websockets import (
    BitaxeWebSocketClient,
    MinerWebSocketClient,
    NoopWebSocketClient,
    get_miner_ws_client,
)


class DummyWebSocket:
    """
    Minimal stand-in for FastAPI's WebSocket for unit testing.

    We only care about send_text and close being awaited with the right values.
    """

    def __init__(self) -> None:
        self.send_text = AsyncMock()
        self.close = AsyncMock()


@pytest.mark.asyncio
async def test_noop_websocket_client_sends_info_and_closes():
    ws = DummyWebSocket()
    client: MinerWebSocketClient = NoopWebSocketClient()

    await client.connect_and_stream("192.168.1.100", ws)

    ws.send_text.assert_awaited_once()
    ws.close.assert_awaited_once()


def test_get_miner_ws_client_bitaxe_model_returns_bitaxe_client():
    client = get_miner_ws_client(miner_model="My Bitaxe Miner")
    assert isinstance(client, BitaxeWebSocketClient)


def test_get_miner_ws_client_unknown_model_returns_noop():
    client = get_miner_ws_client(miner_model="SomeOtherModel")
    assert isinstance(client, NoopWebSocketClient)


@pytest.mark.asyncio
async def test_bitaxe_websocket_client_streams_messages_to_client():
    ws = DummyWebSocket()
    client = BitaxeWebSocketClient(path="/api/ws")

    async def miner_message_generator():
        # Simulate two text messages from the miner side.
        yield "log line 1"
        yield "log line 2"

    class DummyMinerWebSocket:
        def __init__(self):
            self._gen = miner_message_generator()

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        def __aiter__(self):
            return self

        async def __anext__(self):
            try:
                return await self._gen.__anext__()  # type: ignore[attr-defined]
            except StopAsyncIteration as exc:
                raise StopAsyncIteration from exc

    def dummy_connect(url: str):
        # Ensure the URL is well-formed and uses the expected path.
        assert url.endswith("/api/ws")
        return DummyMinerWebSocket()

    # Inject fake websockets modules so BitaxeWebSocketClient can import them
    fake_ws_module = types.ModuleType("websockets")
    fake_ws_module.connect = dummy_connect

    fake_exceptions_module = types.ModuleType("websockets.exceptions")

    class DummyWebSocketException(Exception):
        pass

    fake_exceptions_module.WebSocketException = DummyWebSocketException

    sys.modules["websockets"] = fake_ws_module
    sys.modules["websockets.exceptions"] = fake_exceptions_module

    try:
        await client.connect_and_stream("192.168.1.100", ws)
    finally:
        # Clean up our fake modules to avoid side effects
        sys.modules.pop("websockets", None)
        sys.modules.pop("websockets.exceptions", None)

    # Two messages should have been forwarded.
    assert ws.send_text.await_count >= 1
    ws.close.assert_awaited()


@pytest.mark.asyncio
async def test_bitaxe_websocket_client_handles_connection_error():
    ws = DummyWebSocket()
    client = BitaxeWebSocketClient(path="/api/ws")

    # Connect will raise the same exception class BitaxeWebSocketClient expects.
    def failing_connect(url: str):
        raise ConnectionError("boom")

    fake_ws_module = types.ModuleType("websockets")
    fake_ws_module.connect = failing_connect

    fake_exceptions_module = types.ModuleType("websockets.exceptions")

    class DummyWebSocketException(Exception):
        pass

    # Make WebSocketException an alias for ConnectionError so the except branch matches.
    fake_exceptions_module.WebSocketException = ConnectionError  # type: ignore[attr-defined]

    sys.modules["websockets"] = fake_ws_module
    sys.modules["websockets.exceptions"] = fake_exceptions_module

    try:
        await client.connect_and_stream("192.168.1.100", ws)
    finally:
        sys.modules.pop("websockets", None)
        sys.modules.pop("websockets.exceptions", None)

    # Error branch should have attempted to send an error and then close.
    ws.send_text.assert_awaited()
    ws.close.assert_awaited()


@pytest.mark.asyncio
async def test_bitaxe_websocket_client_decodes_bytes_message():
    """Test Bitaxe client decodes bytes messages and sends as text."""
    ws = DummyWebSocket()
    client = BitaxeWebSocketClient(path="/api/ws")

    async def miner_message_generator():
        yield b"log line as bytes"

    class DummyMinerWebSocket:
        def __init__(self):
            self._gen = miner_message_generator()

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        def __aiter__(self):
            return self

        async def __anext__(self):
            return await self._gen.__anext__()

    def dummy_connect(url: str):
        return DummyMinerWebSocket()

    fake_ws_module = types.ModuleType("websockets")
    fake_ws_module.connect = dummy_connect
    fake_exceptions_module = types.ModuleType("websockets.exceptions")
    fake_exceptions_module.WebSocketException = Exception

    sys.modules["websockets"] = fake_ws_module
    sys.modules["websockets.exceptions"] = fake_exceptions_module

    try:
        await client.connect_and_stream("192.168.1.100", ws)
    finally:
        sys.modules.pop("websockets", None)
        sys.modules.pop("websockets.exceptions", None)

    ws.send_text.assert_awaited()
    call_args = ws.send_text.await_args[0][0]
    assert call_args == "log line as bytes"
    ws.close.assert_awaited()


@pytest.mark.asyncio
async def test_bitaxe_websocket_client_send_text_raises_stops_streaming():
    """Test Bitaxe client stops streaming when send_text raises."""
    ws = DummyWebSocket()
    ws.send_text = AsyncMock(side_effect=Exception("client disconnected"))
    client = BitaxeWebSocketClient(path="/api/ws")

    async def miner_message_generator():
        yield "first"
        yield "second"

    class DummyMinerWebSocket:
        def __init__(self):
            self._gen = miner_message_generator()

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        def __aiter__(self):
            return self

        async def __anext__(self):
            return await self._gen.__anext__()

    def dummy_connect(url: str):
        return DummyMinerWebSocket()

    fake_ws_module = types.ModuleType("websockets")
    fake_ws_module.connect = dummy_connect
    fake_exceptions_module = types.ModuleType("websockets.exceptions")
    fake_exceptions_module.WebSocketException = Exception

    sys.modules["websockets"] = fake_ws_module
    sys.modules["websockets.exceptions"] = fake_exceptions_module

    try:
        await client.connect_and_stream("192.168.1.100", ws)
    finally:
        sys.modules.pop("websockets", None)
        sys.modules.pop("websockets.exceptions", None)

    ws.send_text.assert_awaited_once()
    ws.close.assert_awaited()


@pytest.mark.asyncio
async def test_bitaxe_websocket_client_connection_error_send_fails_ignored():
    """Test Bitaxe client ignores exception when sending error message to client."""
    ws = DummyWebSocket()
    ws.send_text = AsyncMock(side_effect=Exception("send failed"))
    client = BitaxeWebSocketClient(path="/api/ws")

    def failing_connect(url: str):
        raise OSError("connection refused")

    fake_ws_module = types.ModuleType("websockets")
    fake_ws_module.connect = failing_connect
    fake_exceptions_module = types.ModuleType("websockets.exceptions")
    fake_exceptions_module.WebSocketException = OSError

    sys.modules["websockets"] = fake_ws_module
    sys.modules["websockets.exceptions"] = fake_exceptions_module

    try:
        await client.connect_and_stream("192.168.1.100", ws)
    finally:
        sys.modules.pop("websockets", None)
        sys.modules.pop("websockets.exceptions", None)

    ws.send_text.assert_awaited()
    ws.close.assert_awaited()


@pytest.mark.asyncio
async def test_bitaxe_websocket_client_close_raises_ignored():
    """Test Bitaxe client ignores exception when closing client socket."""
    ws = DummyWebSocket()
    ws.close = AsyncMock(side_effect=Exception("close failed"))
    client = BitaxeWebSocketClient(path="/api/ws")

    async def miner_message_generator():
        yield "one"

    class DummyMinerWebSocket:
        def __init__(self):
            self._gen = miner_message_generator()

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        def __aiter__(self):
            return self

        async def __anext__(self):
            return await self._gen.__anext__()

    def dummy_connect(url: str):
        return DummyMinerWebSocket()

    fake_ws_module = types.ModuleType("websockets")
    fake_ws_module.connect = dummy_connect
    fake_exceptions_module = types.ModuleType("websockets.exceptions")
    fake_exceptions_module.WebSocketException = Exception

    sys.modules["websockets"] = fake_ws_module
    sys.modules["websockets.exceptions"] = fake_exceptions_module

    try:
        await client.connect_and_stream("192.168.1.100", ws)
    finally:
        sys.modules.pop("websockets", None)
        sys.modules.pop("websockets.exceptions", None)

    ws.close.assert_awaited()

