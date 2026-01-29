"""
FastAPI routes for pyasic-bridge.

Defines all HTTP endpoints as thin wrappers around MinerService and
exposes WebSocket endpoints for miner log streaming.
"""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, WebSocket

from .models import MinerInfo, MinerValidationResult, ScanRequest, ValidateRequest
from .services import MinerService
from .websockets import get_miner_ws_client


def get_miner_service() -> MinerService:
    """
    Dependency function to get MinerService instance.

    This will be overridden in app.py to provide the actual service instance
    from app.state or dependency injection.
    """
    raise RuntimeError("MinerService not configured. This should be overridden in app.py")


router = APIRouter()


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


@router.post("/scan", response_model=list[MinerInfo])
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


@router.get("/miner/{ip}/data")
async def get_miner_data(
    ip: str,
    service: MinerService = Depends(get_miner_service)
):
    """Get normalized data from a specific miner using get_data()"""
    import logging
    logger = logging.getLogger(__name__)

    try:
        logger.debug(f"Fetching miner data for {ip}")
        result = await service.get_miner_data(ip)
        logger.debug(f"Successfully fetched miner data for {ip}, keys: {list(result.keys())}")
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


@router.get("/miner/{ip}/data/raw")
async def get_miner_data_raw(
    ip: str,
    service: MinerService = Depends(get_miner_service)
):
    """Get raw data from a specific miner without normalization"""
    try:
        return await service.get_miner_data_raw(ip)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/miner/{ip}/config")
async def get_miner_config(
    ip: str,
    service: MinerService = Depends(get_miner_service)
):
    """Get config from a specific miner"""
    try:
        return await service.get_miner_config(ip)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.patch("/miner/{ip}/config")
async def update_miner_config(
    ip: str,
    config: dict[str, Any],
    service: MinerService = Depends(get_miner_service)
):
    """Update miner config"""
    try:
        return await service.update_miner_config(ip, config)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/miner/{ip}/restart")
async def restart_miner(
    ip: str,
    service: MinerService = Depends(get_miner_service)
):
    """Restart a miner"""
    try:
        return await service.restart_miner(ip)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/miner/{ip}/fault-light/on")
async def fault_light_on(
    ip: str,
    service: MinerService = Depends(get_miner_service)
):
    """Turn on fault light"""
    try:
        return await service.fault_light_on(ip)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/miner/{ip}/fault-light/off")
async def fault_light_off(
    ip: str,
    service: MinerService = Depends(get_miner_service)
):
    """Turn off fault light"""
    try:
        return await service.fault_light_off(ip)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/miner/{ip}/errors")
async def get_miner_errors(
    ip: str,
    service: MinerService = Depends(get_miner_service)
):
    """Get miner errors if available"""
    try:
        return await service.get_miner_errors(ip)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/miners/validate", response_model=list[MinerValidationResult])
async def validate_miners(
    request: ValidateRequest,
    service: MinerService = Depends(get_miner_service)
):
    """Validate multiple IPs to check if they are supported miners"""
    try:
        if not request.ips:
            raise ValueError("IPs list cannot be empty")
        return await service.validate_miners(request.ips)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.websocket("/ws/miner/{ip}")
async def miner_logs_ws(
    websocket: WebSocket,
    ip: str,
    service: MinerService = Depends(get_miner_service),
) -> None:
    """
    WebSocket endpoint for streaming logs from a miner.

    The backend connects here once per device; pyasic-bridge then chooses the
    appropriate miner WebSocket client implementation and streams logs from
    the miner firmware to the connected WebSocket.
    """
    await websocket.accept()

    miner_model: str | None = None
    try:
        # Best-effort: reuse existing service to infer miner model.
        data = await service.get_miner_data(ip)
        model_from_root = data.get("model")
        device_info = data.get("device_info") or {}
        model_from_info = device_info.get("model")
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
