"""
Normalized miner data model (GET /miner/{ip}/data response).

Matches the structure produced by the pyasic-bridge normalizers.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

# -----------------------------------------------------------------------------
# Nested models for MinerData
# -----------------------------------------------------------------------------


class DeviceInfo(BaseModel):
    """Device make/model/firmware info."""

    make: str | None = None
    model: str | None = None
    firmware: str | None = None
    algo: str | None = None


class HashrateUnit(BaseModel):
    """Hashrate unit (value + suffix, e.g. TH/s, Gh/s)."""

    value: int | None = None
    suffix: str | None = None


class HashrateStruct(BaseModel):
    """Hashrate with unit and rate."""

    unit: HashrateUnit | None = None
    rate: float | None = None


class FanReading(BaseModel):
    """Single fan speed reading."""

    speed: int | None = None


class HashboardReading(BaseModel):
    """Single hashrate board reading."""

    slot: int | None = None
    hashrate: HashrateStruct | None = None
    inlet_temp: float | None = None
    outlet_temp: float | None = None
    temp: float | None = None
    chip_temp: float | None = None
    chips: int | None = None
    expected_chips: int | None = None
    serial_number: str | None = None
    missing: bool | None = None
    tuned: Any = None
    active: bool | None = None
    voltage: float | None = None


class PoolEntry(BaseModel):
    """Pool URL/user/password."""

    url: str | None = None
    user: str | None = None
    password: str | None = None


class PoolGroup(BaseModel):
    """Group of pools with quota."""

    pools: list[PoolEntry] = Field(default_factory=list)
    quota: int | None = None
    name: str | None = None


class PoolsConfig(BaseModel):
    """Pools configuration."""

    groups: list[PoolGroup] = Field(default_factory=list)


class FanModeConfig(BaseModel):
    """Fan mode configuration."""

    mode: str | None = None
    speed: int | None = None
    minimum_fans: int | None = None


class TemperatureConfig(BaseModel):
    """Temperature limits config."""

    target: float | int | None = None
    hot: float | int | None = None
    danger: float | int | None = None


class MiningModeConfig(BaseModel):
    """Mining mode (e.g. normal)."""

    mode: str | None = None


class MinerConfigModel(BaseModel):
    """Miner configuration (pools, fan, temp, mode, extra)."""

    pools: PoolsConfig | None = None
    fan_mode: FanModeConfig | None = None
    temperature: TemperatureConfig | None = None
    mining_mode: MiningModeConfig | None = None
    extra_config: dict[str, Any] | None = None


class MinerErrorEntry(BaseModel):
    """
    Single miner error (aligned with pyasic BaseMinerError serialization).

    pyasic get_errors() returns list of BaseMinerError; serialized at least error_code.
    Subclasses may add message, description, etc. extra="allow" preserves them.
    """

    error_code: int = Field(..., description="Error code from miner")
    model_config = {"extra": "allow"}


# -----------------------------------------------------------------------------
# Normalized miner data (output of normalizers)
# -----------------------------------------------------------------------------


class MinerData(BaseModel):
    """
    Normalized miner data returned by GET /miner/{ip}/data.

    Matches the structure produced by the pyasic-bridge normalizers.
    """

    ip: str = Field(..., description="Miner IP address")
    device_info: DeviceInfo | None = None
    serial_number: str | None = None
    psu_serial_number: str | None = None
    mac: str | None = None
    api_ver: str | None = None
    fw_ver: str | None = None
    hostname: str | None = None
    sticker_hashrate: Any = None
    expected_hashrate: HashrateStruct | None = None
    expected_hashboards: int | None = None
    expected_chips: int | None = None
    expected_fans: int | None = None
    env_temp: float | None = None
    wattage: int | None = None
    voltage: float | None = None
    network_difficulty: int | None = None
    best_difficulty: str | None = None
    best_session_difficulty: str | None = None
    shares_accepted: int | None = None
    shares_rejected: int | None = None
    fans: list[FanReading] = Field(default_factory=list)
    fan_psu: Any = None
    hashboards: list[HashboardReading] = Field(default_factory=list)
    config: MinerConfigModel | None = None
    fault_light: Any = None
    errors: list[MinerErrorEntry] = Field(default_factory=list)
    is_mining: bool | None = None
    uptime: int | None = None
    pools: list[Any] = Field(default_factory=list)
    hashrate: HashrateStruct | None = None
    wattage_limit: int | None = None
    total_chips: int | None = None
    nominal: bool | None = None
    percent_expected_chips: int | None = None
    percent_expected_hashrate: int | None = None
    percent_expected_wattage: int | None = None
    temperature_avg: int | None = None
    efficiency: HashrateStruct | None = None
    efficiency_fract: float | None = None
    datetime: str | None = None
    timestamp: int | None = None
    make: str | None = None
    model: str | None = None
    firmware: str | None = None
    algo: str | None = None

    model_config = {"populate_by_name": True}
