"""
Unit tests for app module.
"""

import os
from unittest.mock import patch

from app.app import create_app
from app.normalization import DefaultMinerDataNormalizer
from app.pyasic_client import PyasicMinerClient
from app.services import MinerService


class TestCreateApp:
    """Test create_app function."""

    def test_create_app_defaults(self):
        """Test creating app with default dependencies."""
        app = create_app()

        assert app is not None
        assert app.title == "Pyasic Bridge"
        assert hasattr(app.state, "miner_service")
        assert isinstance(app.state.miner_service, MinerService)

    def test_create_app_dependencies(self):
        """Test app has correct dependencies."""
        app = create_app()

        # Check that service has client and normalizer
        service = app.state.miner_service
        assert service.client is not None
        assert isinstance(service.client, PyasicMinerClient)
        assert service.normalizer is not None
        assert isinstance(service.normalizer, DefaultMinerDataNormalizer)

    @patch.dict(os.environ, {"NORMALIZATION_STRATEGY": "default"})
    def test_create_app_with_default_strategy(self):
        """Test creating app with default normalization strategy."""
        app = create_app()
        service = app.state.miner_service
        assert isinstance(service.normalizer, DefaultMinerDataNormalizer)

    @patch.dict(os.environ, {"NORMALIZATION_STRATEGY": "unknown"})
    def test_create_app_with_unknown_strategy_falls_back(self):
        """Test creating app with unknown strategy falls back to default."""
        app = create_app()
        service = app.state.miner_service
        # Should fall back to default
        assert isinstance(service.normalizer, DefaultMinerDataNormalizer)

    def test_create_app_has_routes(self):
        """Test app has routes registered."""
        app = create_app()

        # Check that routes are registered
        routes = [route.path for route in app.routes]
        assert "/health" in routes
        assert "/scan" in routes
        assert "/miner/{ip}/data" in routes
        assert "/miner/{ip}/config" in routes

    def test_create_app_dependency_override(self):
        """Test app has dependency override configured."""
        app = create_app()

        # Check that dependency override is set
        from app.api import get_miner_service
        assert get_miner_service in app.dependency_overrides
