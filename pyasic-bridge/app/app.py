"""
FastAPI application setup for pyasic-bridge.

Wires together dependencies (MinerService, MinerClient)
and configures the FastAPI app with routes.
"""

from fastapi import FastAPI

from .api import get_miner_service, router
from .pyasic_client import MinerClient, PyasicMinerClient
from .services import MinerService


def create_app() -> FastAPI:
    """
    Create and configure the FastAPI application.

    Instantiates dependencies and wires them together:
    - MinerClient (PyasicMinerClient) backed by pyasic library
    - MinerService instance that works for all devices

    Returns:
        Configured FastAPI application instance
    """
    app = FastAPI(title="Pyasic Bridge", version="1.0.0")

    # Instantiate client backed by pyasic library
    unified_client: MinerClient = PyasicMinerClient()

    # Create service - normalizer is selected automatically per miner
    unified_miner_service = MinerService(client=unified_client)

    # Store service in app state for access in dependency
    app.state.miner_service = unified_miner_service

    # Override dependency function to return our unified service instance
    app.dependency_overrides[get_miner_service] = lambda: unified_miner_service

    # Include routes
    app.include_router(router)

    return app


# Create the app instance
app = create_app()
