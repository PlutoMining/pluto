"""
Pydantic models for pyasic-bridge API.

Single source of truth for request/response shapes and API contracts.
"""

from __future__ import annotations

from .common import HealthResponse, RootResponse, StatusResponse
from .data import (
    DeviceInfo,
    FanModeConfig,
    FanReading,
    HashboardReading,
    HashrateStruct,
    HashrateUnit,
    MinerConfigModel,
    MinerData,
    MinerErrorEntry,
    MiningModeConfig,
    PoolEntry,
    PoolGroup,
    PoolsConfig,
    TemperatureConfig,
)
from .data_raw import MinerDataRaw
from .requests import MinerConfigPatch, ScanRequest, ValidateRequest
from .responses import (
    MinerActionResponse,
    MinerConfigResponse,
    MinerErrorsResponse,
    MinerInfo,
    MinerValidationResult,
    ScanResponse,
    ValidateResponse,
)

__all__ = [
    # common
    "HealthResponse",
    "RootResponse",
    "StatusResponse",
    # data (normalized)
    "DeviceInfo",
    "FanModeConfig",
    "FanReading",
    "HashboardReading",
    "HashrateStruct",
    "HashrateUnit",
    "MinerConfigModel",
    "MinerData",
    "MinerErrorEntry",
    "MiningModeConfig",
    "PoolEntry",
    "PoolGroup",
    "PoolsConfig",
    "TemperatureConfig",
    # data_raw
    "MinerDataRaw",
    # requests
    "MinerConfigPatch",
    "ScanRequest",
    "ValidateRequest",
    # responses
    "MinerActionResponse",
    "MinerConfigResponse",
    "MinerErrorsResponse",
    "MinerInfo",
    "MinerValidationResult",
    "ScanResponse",
    "ValidateResponse",
]
