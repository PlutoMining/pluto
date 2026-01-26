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
    - MinerClient (defaults to PyasicMinerClient)
    - MinerService (automatically selects appropriate normalizer per miner)

    Returns:
        Configured FastAPI application instance
    """
    app = FastAPI(title="Pyasic Bridge", version="1.0.0")

    # Instantiate dependencies
    client: MinerClient = PyasicMinerClient()

    # Create service - normalizer is selected automatically per miner
    miner_service = MinerService(client=client)

    # Store service in app state for access in dependency
    app.state.miner_service = miner_service

    # Override the dependency function to return our service instance
    app.dependency_overrides[get_miner_service] = lambda: miner_service

    # Include routes
    app.include_router(router)

    return app


# Create the app instance
app = create_app()
