"""
Raw miner data model (GET /miner/{ip}/data/raw response).

Represents the output of pyasic's get_data().as_dict() before normalization.
This is the input shape consumed by the normalizers (see normalizers/base.py,
normalizers/default.py, normalizers/factory.py).
"""

from typing import Any

from pydantic import BaseModel, Field

from .data import MinerConfigModel


class MinerDataRaw(BaseModel):
    """
    Raw miner data returned by GET /miner/{ip}/data/raw.

    Matches the structure returned by pyasic (as_dict()) before normalization.
    The normalizer reads: device_info, hashrate, best_difficulty,
    best_session_difficulty, wattage, efficiency, efficiency_fract,
    extra_fields, make, model. Other keys are preserved via extra="allow".
    """

    model_config = {"extra": "allow"}

    # Fields used by normalizer / factory (all optional; pyasic varies by miner)
    device_info: dict[str, Any] | None = Field(
        default=None,
        description="Device make/model/firmware (used by normalizer factory)",
    )
    hashrate: Any = Field(
        default=None,
        description="Hashrate (dict with rate/unit or object; normalized to Gh/s)",
    )
    best_difficulty: Any = Field(
        default=None,
        description="Best difficulty (normalized to string)",
    )
    best_session_difficulty: Any = Field(
        default=None,
        description="Best session difficulty (normalized to string)",
    )
    wattage: int | float | None = Field(
        default=None,
        description="Power in watts (used for efficiency calculation)",
    )
    efficiency: Any = Field(
        default=None,
        description="Efficiency value (normalized to J/Th)",
    )
    efficiency_fract: float | None = Field(
        default=None,
        description="Efficiency fallback (used if efficiency missing)",
    )
    extra_fields: Any = Field(
        default=None,
        description="Vendor-specific fields (e.g. Bitaxe extra_fields)",
    )
    make: str | None = Field(default=None, description="Top-level make (factory detection)")
    model: str | None = Field(default=None, description="Top-level model (factory detection)")
    mac: str | None = Field(default=None, description="MAC address (pyasic may use mac or macAddr)")
    macAddr: str | None = Field(default=None, description="Alternative MAC key from pyasic")
    hostname: str | None = None
    api_ver: str | None = None
    fw_ver: str | None = None
    serial_number: str | None = None
    psu_serial_number: str | None = None
    expected_hashrate: Any = None
    expected_hashboards: int | None = None
    expected_chips: int | None = None
    expected_fans: int | None = None
    env_temp: Any = None
    voltage: Any = None
    network_difficulty: int | None = None
    shares_accepted: int | None = None
    shares_rejected: int | None = None
    fans: list[Any] = Field(default_factory=list)
    fan_psu: Any = None
    hashboards: list[Any] = Field(default_factory=list)
    config: MinerConfigModel | None = None
    fault_light: Any = None
    errors: list[Any] = Field(default_factory=list)
    is_mining: bool | None = None
    uptime: int | None = None
    pools: list[Any] = Field(default_factory=list)
    wattage_limit: Any = None
    total_chips: int | None = None
    nominal: bool | None = None
    percent_expected_chips: int | None = None
    percent_expected_hashrate: int | None = None
    percent_expected_wattage: Any = None
    temperature_avg: Any = None
    datetime: str | None = None
    timestamp: int | None = None
    firmware: str | None = None
    algo: str | None = None
    sticker_hashrate: Any = None
