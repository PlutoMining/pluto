"""
FastAPI routes for pyasic-bridge.

Defines all HTTP endpoints as thin wrappers around MinerService.
"""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from .models import MinerInfo, ScanRequest
from .services import MinerService


def get_miner_service() -> MinerService:
    """
    Dependency function to get MinerService instance.

    This will be overridden in app.py to provide the actual service instance
    from app.state or dependency injection.
    """
    # This is a placeholder - the actual implementation will be provided
    # via dependency override in app.py
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
    """Get data from a specific miner using get_data()"""
    try:
        return await service.get_miner_data(ip)
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
