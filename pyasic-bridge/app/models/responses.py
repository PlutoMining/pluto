"""
Response models for scan, validate, config, actions, errors.
"""

from __future__ import annotations

from pydantic import BaseModel, Field, RootModel

from .common import StatusResponse
from .data import MinerConfigModel, MinerData, MinerErrorEntry


class MinerInfo(BaseModel):
    """Normalized miner info returned from scan/validation (data = pyasic get_data() normalized)."""

    ip: str = Field(..., description="Miner IP address")
    mac: str | None = Field(default=None, description="MAC address if available")
    model: str | None = Field(default=None, description="Device model name")
    hostname: str | None = Field(default=None, description="Device hostname")
    hashrate: float | None = Field(default=None, description="Reported hashrate")
    data: MinerData = Field(..., description="Normalized miner data (pyasic get_data() shape)")


class MinerValidationResult(BaseModel):
    """Result of validating a single IP as a miner."""

    ip: str = Field(..., description="IP that was validated")
    is_miner: bool = Field(..., description="Whether the IP responded as a miner")
    model: str | None = Field(default=None, description="Detected miner model if applicable")
    error: str | None = Field(default=None, description="Error message if validation failed")


# -----------------------------------------------------------------------------
# Response wrappers for API contracts (list / dict responses)
# -----------------------------------------------------------------------------


class ScanResponse(RootModel[list[MinerInfo]]):
    """Response of POST /scan: list of MinerInfo."""


class ValidateResponse(RootModel[list[MinerValidationResult]]):
    """Response of POST /miners/validate: list of MinerValidationResult."""


# Internal config shape for GET /miner/{ip}/config response.
# Populated from pyasic via miner_config_from_pyasic (app.mappers.miner_config_mapper).
MinerConfigResponse = MinerConfigModel

# PATCH config, POST restart, POST fault-light: same status shape (aligned with bridge return)
MinerActionResponse = StatusResponse


class MinerErrorsResponse(RootModel[list[MinerErrorEntry]]):
    """Response of GET /miner/{ip}/errors: list of error entries (pyasic BaseMinerError serialization)."""


class ConfigValidationResponse(BaseModel):
    """Response of POST /miner/{ip}/config/validate: validation result."""

    valid: bool = Field(..., description="Whether the config is valid")
    errors: list[str] = Field(default_factory=list, description="List of validation error messages if invalid")
