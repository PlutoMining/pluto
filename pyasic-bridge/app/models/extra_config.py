"""
Extra config models for different miner types.

Re-exports Pydantic models from validators for OpenAPI exposure.
These models define the structure and validation rules for miner-specific extra_config fields.
"""

from pydantic import BaseModel

from app.validators.bitaxe import BitaxeExtraConfig

# Registry: miner type pattern -> extra_config model class
# Used to map miner types to their corresponding extra_config models
EXTRA_CONFIG_MODELS: dict[str, type[BaseModel]] = {
    "bitaxe": BitaxeExtraConfig,
    "espminer": BitaxeExtraConfig,  # Same model for espminer
}


def get_extra_config_model_for_miner_type(miner_type: str | None) -> type[BaseModel] | None:
    """
    Get extra_config model class for a miner type string.

    Args:
        miner_type: Miner type string (e.g., "BitAxe Gamma", "espminer", etc.)

    Returns:
        ExtraConfig model class if found, None otherwise
    """
    if not miner_type:
        return None
    miner_type_lower = miner_type.lower()
    for pattern, model_class in EXTRA_CONFIG_MODELS.items():
        if pattern in miner_type_lower:
            return model_class
    return None


# Re-export models for OpenAPI inclusion
__all__ = [
    "BitaxeExtraConfig",
    "EXTRA_CONFIG_MODELS",
    "get_extra_config_model_for_miner_type",
]
