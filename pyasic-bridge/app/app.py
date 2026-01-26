"""
FastAPI application setup for pyasic-bridge.

Wires together dependencies (MinerService, MinerClient, MinerDataNormalizer)
and configures the FastAPI app with routes.
"""

import os

from fastapi import FastAPI

from .api import get_miner_service, router
from .normalization import DefaultMinerDataNormalizer, MinerDataNormalizer
from .pyasic_client import MinerClient, PyasicMinerClient
from .services import MinerService


def create_app() -> FastAPI:
    """
    Create and configure the FastAPI application.

    Instantiates dependencies and wires them together:
    - MinerClient (defaults to PyasicMinerClient)
    - MinerDataNormalizer (defaults to DefaultMinerDataNormalizer, configurable via env)
    - MinerService (combines client and normalizer)

    Returns:
        Configured FastAPI application instance
    """
    app = FastAPI(title="Pyasic Bridge", version="1.0.0")

    # Instantiate dependencies
    client: MinerClient = PyasicMinerClient()

    # Allow normalization strategy to be configured via environment variable
    # For now, only DefaultMinerDataNormalizer is available, but this allows
    # future extensibility (e.g., "bitaxe", "brandx", etc.)
    strategy_name = os.getenv("NORMALIZATION_STRATEGY", "default").lower()
    normalizer: MinerDataNormalizer

    if strategy_name == "default":
        normalizer = DefaultMinerDataNormalizer()
    else:
        # Future: support other strategies via registry
        # For now, fall back to default
        normalizer = DefaultMinerDataNormalizer()

    # Create service with dependencies
    miner_service = MinerService(client=client, normalizer=normalizer)

    # Store service in app state for access in dependency
    app.state.miner_service = miner_service

    # Override the dependency function to return our service instance
    app.dependency_overrides[get_miner_service] = lambda: miner_service

    # Include routes
    app.include_router(router)

    return app


# Create the app instance
app = create_app()
