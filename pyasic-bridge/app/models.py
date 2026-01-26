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

