"""
Miner error service.

Handles retrieval of miner errors.
"""

import logging

from app.models import MinerErrorEntry
from app.pyasic_client import MinerClient

logger = logging.getLogger(__name__)


class MinerErrorService:
    """
    Service for miner error retrieval operations.

    Handles getting miner errors.
    Returns domain models (Pydantic) for type safety and TypeScript generation.
    """

    def __init__(self, client: MinerClient):
        """
        Initialize MinerErrorService.

        Args:
            client: MinerClient implementation
        """
        self.client = client

    async def get_miner_errors(self, ip: str) -> list[MinerErrorEntry]:
        """
        Get miner errors if available.

        Args:
            ip: IP address of the miner

        Returns:
            List of MinerErrorEntry domain model instances

        Raises:
            ValueError: If miner is not found
        """
        # Use client's abstracted method
        errors = await self.client.get_miner_errors(ip)
        if not errors:
            return []

        # Convert to MinerErrorEntry domain models
        error_entries: list[MinerErrorEntry] = []
        for e in errors:
            if hasattr(e, "model_dump"):
                # Already a Pydantic model, convert to dict and validate
                error_dict = e.model_dump()
                error_entries.append(MinerErrorEntry.model_validate(error_dict))
            elif isinstance(e, dict):
                # Already a dict, validate directly
                error_entries.append(MinerErrorEntry.model_validate(e))
            else:
                # Fallback: create from error code
                error_entries.append(MinerErrorEntry.model_validate({"error_code": 0, "message": str(e)}))

        return error_entries
