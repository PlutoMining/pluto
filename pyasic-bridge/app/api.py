"""
FastAPI routes for pyasic-bridge.

Defines all HTTP endpoints as thin wrappers around MinerService and
exposes WebSocket endpoints for miner log streaming.
Response models and contracts are defined in api_contracts.py.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, WebSocket

from .api_contracts import API_CONTRACTS
from .models import (
    BitaxeExtraConfig,
    ConfigValidationResponse,
    HealthResponse,
    MinerConfigPatch,
    RootResponse,
    ScanRequest,
    ValidateRequest,
)
from .services import MinerService
from .validators import ConfigValidationError, ExtraConfigNotAvailableError
from .websockets import get_miner_ws_client
from .ws_contracts import WS_CONTRACTS

logger = logging.getLogger(__name__)


def get_miner_service() -> MinerService:
    """
    Dependency function to get MinerService instance.

    This will be overridden in app.py to provide the actual service instance
    from app.state or dependency injection.
    """
    raise RuntimeError("MinerService not configured. This should be overridden in app.py")


router = APIRouter()


@router.get("/", response_model=RootResponse)
async def root():
    """Root endpoint: service info and links."""
    return RootResponse(
        service="Pyasic Bridge",
        version="1.0.0",
        docs="/docs",
        health="/health",
    )


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(status="healthy")


@router.post(
    "/scan",
    response_model=API_CONTRACTS["scan"].response_body,
)
async def scan_miners(
    request: ScanRequest,
    service: MinerService = Depends(get_miner_service)
):
    """Scan for miners using pyasic"""
    try:
        return await service.scan_miners(ip=request.ip, subnet=request.subnet)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get(
    "/miner/{ip}/data",
    response_model=API_CONTRACTS["get_miner_data"].response_body,
)
async def get_miner_data(
    ip: str,
    service: MinerService = Depends(get_miner_service),
):
    """Get normalized data from a specific miner using get_data()."""
    try:
        logger.info("GET /miner/%s/data - Fetching miner data", ip)
        result = await service.get_miner_data(ip)
        # In production this is a MinerData model; in tests it may be a plain dict.
        logger.info("GET /miner/%s/data - Successfully fetched miner data", ip)
        return result
    except ValueError as e:
        # Miner not found or not a valid miner - return 404
        logger.warning(f"Miner not found or invalid at {ip}: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e)) from e
    except (ConnectionError, TimeoutError, OSError) as e:
        # Network/connection errors - return 404 (device not reachable)
        logger.warning(f"Connection error for miner at {ip}: {str(e)}")
        raise HTTPException(status_code=404, detail=f"Could not connect to miner at {ip}: {str(e)}") from e
    except Exception as e:
        # Only return 500 for actual server errors
        # Log the full exception for debugging
        logger.exception(f"Unexpected error fetching miner data for {ip}: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}") from e


@router.get(
    "/miner/{ip}/data/raw",
    response_model=API_CONTRACTS["get_miner_data_raw"].response_body,
)
async def get_miner_data_raw(
    ip: str,
    service: MinerService = Depends(get_miner_service),
):
    """Get raw data from a specific miner without normalization."""
    try:
        return await service.get_miner_data_raw(ip)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get(
    "/miner/{ip}/config",
    response_model=API_CONTRACTS["get_miner_config"].response_body,
)
async def get_miner_config(
    ip: str,
    service: MinerService = Depends(get_miner_service),
):
    """Get config from a specific miner."""
    try:
        return await service.get_miner_config(ip)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.patch(
    "/miner/{ip}/config",
    response_model=API_CONTRACTS["update_miner_config"].response_body,
)
async def update_miner_config(
    ip: str,
    config: MinerConfigPatch,
    service: MinerService = Depends(get_miner_service),
):
    """Update miner config."""
    try:
        return await service.update_miner_config(ip, config.model_dump(exclude_none=True))
    except ConfigValidationError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except ExtraConfigNotAvailableError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except ValueError as e:
        # Distinguish between "miner not found" and other value-related errors.
        message = str(e)
        if "not found" in message.lower():
            raise HTTPException(status_code=404, detail=message) from e
        # For other ValueErrors (e.g. validation issues), return 400.
        raise HTTPException(status_code=400, detail=message) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post(
    "/miner/{ip}/config/validate",
    response_model=API_CONTRACTS["validate_miner_config"].response_body,
)
async def validate_miner_config(
    ip: str,
    config: MinerConfigPatch,
    service: MinerService = Depends(get_miner_service),
):
    """Validate miner config without applying it."""
    try:
        result = await service.validate_miner_config(ip, config.model_dump(exclude_none=True))
        return ConfigValidationResponse(**result)
    except ValueError as e:
        # e.g. miner not found
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/extra-config-schemas/bitaxe", response_model=BitaxeExtraConfig)
async def get_bitaxe_extra_config_schema():
    """
    Get JSON schema for Bitaxe extra_config.

    This endpoint exists primarily to expose BitaxeExtraConfig in OpenAPI schema.
    The schema can also be used directly, but the recommended approach is to extract
    schemas from the OpenAPI JSON file during build time.

    Note: This endpoint returns a sample BitaxeExtraConfig instance to ensure
    the model appears in the OpenAPI schema. The actual schema is extracted
    from the OpenAPI JSON during build time.
    """
    # Return a sample instance to ensure the model is included in OpenAPI schema
    # The actual schema extraction happens from the OpenAPI JSON file
    return BitaxeExtraConfig()


@router.post(
    "/miner/{ip}/restart",
    response_model=API_CONTRACTS["restart_miner"].response_body,
)
async def restart_miner(
    ip: str,
    service: MinerService = Depends(get_miner_service),
):
    """Restart a miner."""
    try:
        return await service.restart_miner(ip)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post(
    "/miner/{ip}/fault-light/on",
    response_model=API_CONTRACTS["fault_light_on"].response_body,
)
async def fault_light_on(
    ip: str,
    service: MinerService = Depends(get_miner_service),
):
    """Turn on fault light."""
    try:
        return await service.fault_light_on(ip)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post(
    "/miner/{ip}/fault-light/off",
    response_model=API_CONTRACTS["fault_light_off"].response_body,
)
async def fault_light_off(
    ip: str,
    service: MinerService = Depends(get_miner_service),
):
    """Turn off fault light."""
    try:
        return await service.fault_light_off(ip)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get(
    "/miner/{ip}/errors",
    response_model=API_CONTRACTS["get_miner_errors"].response_body,
)
async def get_miner_errors(
    ip: str,
    service: MinerService = Depends(get_miner_service),
):
    """Get miner errors if available."""
    try:
        return await service.get_miner_errors(ip)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post(
    "/miners/validate",
    response_model=API_CONTRACTS["validate_miners"].response_body,
)
async def validate_miners(
    request: ValidateRequest,
    service: MinerService = Depends(get_miner_service),
):
    """Validate multiple IPs to check if they are supported miners."""
    try:
        if not request.ips:
            raise ValueError("IPs list cannot be empty")
        logger.info(
            "POST /miners/validate - Validating %d IP(s): %s",
            len(request.ips),
            ", ".join(request.ips),
        )
        # The service returns a list of MinerValidationResult models in production,
        # but tests may mock it with plain dicts. Just pass the results through.
        results = await service.validate_miners(request.ips)
        return results
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.websocket(WS_CONTRACTS["miner_logs"].path)
async def miner_logs_ws(
    websocket: WebSocket,
    ip: str,
    service: MinerService = Depends(get_miner_service),
) -> None:
    """Stream logs from a miner. Contract: ws_contracts.WS_CONTRACTS['miner_logs']."""
    await websocket.accept()

    miner_model: str | None = None
    try:
        # Best-effort: reuse existing service to infer miner model.
        data = await service.get_miner_data(ip)
        # Use attribute access since data is now a MinerData Pydantic model
        model_from_root = data.model
        device_info = data.device_info
        model_from_info = device_info.model if device_info else None
        miner_model = (model_from_root or model_from_info) or None
    except Exception:
        # If we cannot determine the model, fall back to factory defaults.
        miner_model = None

    # No special handling - select WebSocket client based on miner model
    client = get_miner_ws_client(miner_model=miner_model)
    await client.connect_and_stream(ip, websocket)


# Note: Mock WebSocket endpoint has been removed.
# Mock devices are now handled transparently through the unified /ws/miner/{ip} endpoint.
# The WebSocket factory automatically detects mock devices based on the IP.
