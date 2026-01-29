from typing import Any

from pydantic import BaseModel


class ScanRequest(BaseModel):
    subnet: str | None = None
    ip: str | None = None


class MinerInfo(BaseModel):
    ip: str
    mac: str | None = None
    model: str | None = None
    hostname: str | None = None
    hashrate: float | None = None
    data: dict[str, Any]


class ValidateRequest(BaseModel):
    ips: list[str]


class MinerValidationResult(BaseModel):
    ip: str
    is_miner: bool
    model: str | None = None
    error: str | None = None

