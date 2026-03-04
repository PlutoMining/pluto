"""
Single place for miner type detection (Bitaxe/espminer vs others).

Used by validators, extra_config factory, normalizers, and websockets
so detection stays consistent across the app.
"""

from collections.abc import Mapping
from typing import Any

# Keys that typically appear in Bitaxe/espminer extra_config (fallback detection)
ESPMINER_EXTRA_CONFIG_KEYS = frozenset({
    "frequency", "core_voltage", "min_fan_speed", "display_timeout",
    "rotation", "invertscreen", "overheat_mode", "stats_frequency",
    "overclock_enabled", "display",
})


def is_bitaxe_model(model_str: str | None) -> bool:
    """
    Return True if the model string indicates a Bitaxe miner.

    Use when you only have a model label (e.g. for WebSocket client selection).
    """
    return "bitaxe" in (model_str or "").lower()


def is_bitaxe_from_data(data: Mapping[str, Any]) -> bool:
    """
    Return True if raw or normalized miner data indicates a Bitaxe miner.

    Checks device_info.make, device_info.model, and top-level make/model.
    Use for normalizer selection and any logic that has a data dict (e.g. scan result).
    """
    device_info = data.get("device_info") or {}
    make = str(device_info.get("make", "") or "").lower()
    model = str(device_info.get("model", "") or "").lower()
    top_make = str(data.get("make", "") or "").lower()
    top_model = str(data.get("model", "") or "").lower()
    return (
        "bitaxe" in make
        or "bitaxe" in model
        or "bitaxe" in top_make
        or "bitaxe" in top_model
    )


def is_espminer(
    miner: Any,
    existing_extra_config: dict[str, Any] | None = None,
) -> bool:
    """
    Return True if the miner instance is a Bitaxe/espminer (needs ESPMinerExtraConfig).

    Checks, in order:
    1. miner.model (e.g. "BitAxe Gamma")
    2. Miner class name (bitaxe / espminer)
    3. Miner class module path (e.g. pyasic.miners.espminer)
    4. If existing_extra_config is provided: whether it has Bitaxe-shaped keys
       (fallback when pyasic does not set model/class/module).
    """
    if is_bitaxe_model(getattr(miner, "model", None)):
        return True

    class_name = miner.__class__.__name__.lower()
    if "bitaxe" in class_name or "espminer" in class_name:
        return True

    module = getattr(miner.__class__, "__module__", "") or ""
    if "espminer" in module.lower() or "bitaxe" in module.lower():
        return True

    if existing_extra_config and isinstance(existing_extra_config, dict):
        keys = set(existing_extra_config.keys())
        if keys & ESPMINER_EXTRA_CONFIG_KEYS:
            return True

    return False
