"""
Common API response models (root, health, status).
"""

from pydantic import BaseModel, Field


class StatusResponse(BaseModel):
    """Status response for PATCH config, POST restart, POST fault-light (aligned with bridge return)."""

    status: str = Field(..., description="e.g. 'success'")


class RootResponse(BaseModel):
    """Root endpoint: service info and links."""

    service: str = Field(..., description="Service name")
    version: str = Field(..., description="API version")
    docs: str = Field(..., description="Path to OpenAPI docs")
    health: str = Field(..., description="Path to health endpoint")


class HealthResponse(BaseModel):
    """Health check response."""

    status: str = Field(..., description="healthy")
