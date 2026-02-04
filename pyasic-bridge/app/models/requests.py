"""
Request body models.
"""

from pydantic import BaseModel, Field

from .data import MinerConfigModel


class ScanRequest(BaseModel):
    """Request body for triggering a subnet or single-IP scan."""

    subnet: str | None = Field(default=None, description="CIDR subnet to scan (e.g. 192.168.1.0/24)")
    ip: str | None = Field(default=None, description="Single IP address to scan")


class ValidateRequest(BaseModel):
    """Request body for validating one or more IPs as miners."""

    ips: list[str] = Field(..., description="List of IP addresses to validate", min_length=1)


# Internal config shape for PATCH body; all fields optional for partial PATCH.
# Mapped to/from pyasic MinerConfig only at the boundary (see app.mappers.config_mapper).
MinerConfigPatch = MinerConfigModel
