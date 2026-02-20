"""
Miner configuration service.

Handles retrieval and updates of miner configuration.
"""

import logging
from typing import Any

from app.mappers import miner_config_from_pyasic, miner_config_to_pyasic
from app.models import MinerConfigModel, StatusResponse
from app.pyasic_client import MinerClient
from app.validators import ExtraConfigNotAvailableError, get_config_validator

logger = logging.getLogger(__name__)


class MinerConfigService:
    """
    Service for miner configuration operations.

    Handles getting and updating miner configuration.
    """

    def __init__(self, client: MinerClient):
        """
        Initialize MinerConfigService.

        Args:
            client: MinerClient implementation
        """
        self.client = client

    async def get_miner_config(self, ip: str) -> MinerConfigModel:
        """
        Get config from a specific miner.

        Args:
            ip: IP address of the miner

        Returns:
            MinerConfigModel domain model instance

        Raises:
            ValueError: If miner is not found
        """
        # Use client's abstracted method to get config
        config = await self.client.get_miner_config_dict(ip)

        # Use object-based mapper to convert pyasic MinerConfig (or similar)
        # into our internal MinerConfigModel domain model.
        try:
            return miner_config_from_pyasic(config)
        except Exception as e:
            # Defensive fallback for unexpected config shapes.
            logger.exception(
                f"Error converting pyasic MinerConfig to internal MinerConfigModel for {ip}. "
                f"Exception type: {type(e).__name__}, Exception message: {str(e)}"
            )
            # Return empty config model instead of dict
            return MinerConfigModel()

    async def update_miner_config(self, ip: str, config: dict[str, Any]) -> dict[str, str]:
        """
        Update miner config.

        Args:
            ip: IP address of the miner
            config: Config dictionary to apply

        Returns:
            Success status dictionary

        Raises:
            ValueError: If miner is not found
            ConfigValidationError: If config validation fails
            ExtraConfigNotAvailableError: If extra_config is not available
        """
        # Fetch current config so we can perform a partial update safely.
        existing_cfg = await self.client.get_miner_config_dict(ip)

        # Convert existing pyasic config to internal model and then to dict for
        # merging and validation.
        existing_internal: MinerConfigModel = miner_config_from_pyasic(existing_cfg)
        base_dict: dict[str, Any] = existing_internal.model_dump(exclude_none=True)

        # Merge configs: start from existing (internal shape), apply request on top.
        # Deep merge nested structures (fan_mode, temperature, mining_mode, extra_config).
        # Pools are atomic: if provided in PATCH, they fully replace existing pools.
        merged_config: dict[str, Any] = {**base_dict, **config}

        for nested_key in ("fan_mode", "temperature", "mining_mode", "extra_config"):
            if nested_key in config:
                incoming = config.get(nested_key)
                existing_nested = base_dict.get(nested_key)
                if isinstance(existing_nested, dict) and isinstance(incoming, dict):
                    merged_config[nested_key] = {**existing_nested, **incoming}

        # Get miner instance for validation
        miner = await self.client.get_miner(ip)
        if not miner:
            raise ValueError(f"Miner not found at {ip}")

        # Validate config using miner-specific validator (e.g. Bitaxe frequency constraints).
        validator = get_config_validator(miner)
        validator.validate(merged_config, miner)

        # extra_config type MUST come from existing_cfg (pyasic). No dict fallback, no detection.
        existing_extra_obj = getattr(existing_cfg, "extra_config", None)
        if existing_extra_obj is None:
            raise ExtraConfigNotAvailableError(
                "Miner config has no extra_config; cannot update. "
                "Ensure the miner exposes extra_config from get_config()."
            )

        # Convert merged internal config dict to MinerConfigModel and then to
        # pyasic MinerConfig (FanModeConfig, etc.) using object-based mappers.
        internal_model = MinerConfigModel.model_validate(merged_config)
        miner_config = miner_config_to_pyasic(internal_model, existing_cfg)

        # Use client's abstracted method to send config
        await self.client.send_miner_config(ip, miner_config)
        return StatusResponse(status="success")

    async def validate_miner_config(self, ip: str, config: dict[str, Any]) -> dict[str, Any]:
        """
        Validate miner config without applying it.

        Args:
            ip: IP address of the miner
            config: Config dictionary to validate

        Returns:
            Dictionary with 'valid' (bool) and 'errors' (list[str]) keys

        Raises:
            ValueError: If miner is not found
        """
        # Fetch current config for merging
        existing_cfg = await self.client.get_miner_config_dict(ip)

        # Convert existing pyasic config to internal model
        existing_internal: MinerConfigModel = miner_config_from_pyasic(existing_cfg)
        base_dict: dict[str, Any] = existing_internal.model_dump(exclude_none=True)

        # Merge configs (same logic as update_miner_config)
        merged_config: dict[str, Any] = {**base_dict, **config}

        for nested_key in ("fan_mode", "temperature", "mining_mode", "extra_config"):
            if nested_key in config:
                incoming = config.get(nested_key)
                existing_nested = base_dict.get(nested_key)
                if isinstance(existing_nested, dict) and isinstance(incoming, dict):
                    merged_config[nested_key] = {**existing_nested, **incoming}

        # Get miner instance for validation
        miner = await self.client.get_miner(ip)
        if not miner:
            raise ValueError(f"Miner not found at {ip}")

        # Validate config using miner-specific validator
        errors: list[str] = []
        try:
            validator = get_config_validator(miner)
            validator.validate(merged_config, miner)
            return {"valid": True, "errors": []}
        except Exception as e:
            errors.append(str(e))
            return {"valid": False, "errors": errors}
