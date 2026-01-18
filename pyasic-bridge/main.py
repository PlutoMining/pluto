"""
Pyasic Bridge Service
A FastAPI service that wraps pyasic library to provide REST API access
for miner discovery, data retrieval, and control operations.
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import asyncio
import logging
from pyasic import get_miner
from pyasic.network import MinerNetwork

app = FastAPI(title="Pyasic Bridge", version="1.0.0")
logger = logging.getLogger(__name__)


def convert_hashrate_to_ghs(hashrate_value: Any) -> float:
    """
    Convert hashrate value to Gh/s, handling different units and formats.
    
    Args:
        hashrate_value: Can be:
            - AlgoHashRateType object with rate and unit
            - Number (int or float) in various units
            - Dict with rate/unit keys (from as_dict serialization)
            - Dict with nested unit.value structure
            - None
    
    Returns:
        float: Hashrate in Gh/s, or 0.0 if invalid
    """
    if hashrate_value is None:
        return 0.0
    
    try:
        rate = None
        unit = None
        
        # Try to get rate and unit from AlgoHashRateType object
        if hasattr(hashrate_value, 'rate') and hasattr(hashrate_value, 'unit'):
            rate = float(hashrate_value.rate)
            # Unit might be a number or an object with 'value'
            if hasattr(hashrate_value.unit, 'value'):
                unit = float(hashrate_value.unit.value)
            elif isinstance(hashrate_value.unit, (int, float)):
                unit = float(hashrate_value.unit)
            else:
                unit = 1  # Default to H/s if we can't determine
        # Try dict format (from as_dict) - handle nested unit structure
        elif isinstance(hashrate_value, dict) and 'rate' in hashrate_value:
            rate = float(hashrate_value['rate'])
            unit_obj = hashrate_value.get('unit')
            if unit_obj is not None:
                # Unit might be a dict with 'value' key (nested structure)
                if isinstance(unit_obj, dict) and 'value' in unit_obj:
                    unit = float(unit_obj['value'])
                elif isinstance(unit_obj, (int, float)):
                    unit = float(unit_obj)
                else:
                    unit = 1  # Default to H/s
            else:
                unit = 1  # Default to H/s if unit is missing
        # Try direct number
        elif isinstance(hashrate_value, (int, float)):
            rate = float(hashrate_value)
            # Detect unit based on magnitude
            if rate >= 1e8:
                unit = 1  # H/s
            elif rate >= 1e6:
                unit = 1  # H/s
            elif rate >= 1e3:
                unit = 1e9  # Gh/s
            else:
                unit = 1e12  # Th/s
        else:
            # Last resort: try to convert to float
            rate = float(hashrate_value)
            # Detect unit based on magnitude
            if rate >= 1e8:
                unit = 1  # H/s
            elif rate >= 1e6:
                unit = 1  # H/s
            elif rate >= 1e3:
                unit = 1e9  # Gh/s
            else:
                unit = 1e12  # Th/s
        
        # Convert to Gh/s based on unit
        if abs(unit - 1) < 0.1:
            result = rate / 1e9  # H/s -> Gh/s
        elif abs(unit - 1e6) < 1e3:
            result = rate / 1000  # MH/s -> Gh/s
        elif abs(unit - 1e9) < 1e6:
            result = rate  # Already Gh/s
        elif abs(unit - 1e12) < 1e9:
            result = rate * 1000  # Th/s -> Gh/s
        else:
            # Fallback: detect by magnitude
            if rate >= 1e9:
                result = rate / 1e9
            elif rate >= 1e6:
                result = rate / 1000
            elif rate >= 1000:
                result = rate
            else:
                result = rate * 1000
        
        return float(result) if result >= 0 else 0.0
    except Exception as e:
        logger.warning(f"Error converting hashrate: {e}, value: {hashrate_value}, type: {type(hashrate_value)}")
        return 0.0


def normalize_hashrate_structure(hashrate_value: Any) -> Dict[str, Any]:
    """
    Normalize hashrate to Gh/s while preserving the nested structure with unit information.
    
    Args:
        hashrate_value: Can be:
            - AlgoHashRateType object with rate and unit
            - Number (int or float) in various units
            - Dict with rate/unit keys (from as_dict serialization)
            - None
    
    Returns:
        Dict: Normalized hashrate structure with rate in Gh/s and unit info
        {
            "unit": {
                "value": 1000000000,  # 1e9 for Gh/s
                "suffix": "Gh/s"
            },
            "rate": <number in Gh/s>
        }
    """
    if hashrate_value is None:
        return {
            "unit": {
                "value": 1000000000,
                "suffix": "Gh/s"
            },
            "rate": 0.0
        }
    
    # Convert to Gh/s value
    rate_ghs = convert_hashrate_to_ghs(hashrate_value)
    
    # Return normalized structure
    return {
        "unit": {
            "value": 1000000000,  # 1e9 for Gh/s
            "suffix": "Gh/s"
        },
        "rate": rate_ghs
    }


def normalize_efficiency_structure(efficiency_value: Any, wattage: Optional[float] = None, hashrate_ghs: Optional[float] = None) -> Dict[str, Any]:
    """
    Normalize efficiency to J/Th while preserving the nested structure with unit information.
    
    Priority order:
    1. Calculate from wattage and hashrate (most precise, real-time)
    2. Fallback to pyasic's efficiency value (converted from its unit)
    
    Args:
        efficiency_value: Can be:
            - String (scientific notation like "1.8e-11") - used as fallback
            - Number (int or float) - used as fallback
            - None
        wattage: Power in watts (used for calculation - priority 1)
        hashrate_ghs: Hashrate in Gh/s (used for calculation - priority 1)
    
    Returns:
        Dict: Normalized efficiency structure with rate in J/Th and unit info
        {
            "unit": {
                "suffix": "J/Th"
            },
            "rate": <number in J/Th>
        }
    """
    try:
        rate_jth = 0.0
        calculated = False
        
        # Priority 1: Calculate efficiency from wattage and hashrate (most precise, real-time)
        # efficiency (J/Th) = power (W) / hashrate (Th/s)
        # Note: hashrate_ghs is normalized to Gh/s by normalize_hashrate_structure()
        # So we need to convert Gh/s to Th/s: hashrate_ths = hashrate_ghs / 1000
        if wattage is not None and wattage > 0 and hashrate_ghs is not None and hashrate_ghs > 0:
            try:
                # Convert Gh/s to Th/s
                hashrate_ths = hashrate_ghs / 1000
                # Calculate efficiency: efficiency (J/Th) = power (W) / hashrate (Th/s)
                rate_jth = wattage / hashrate_ths
                
                # Sanity check: if efficiency is unreasonably high (> 1000 J/Th), 
                # the hashrate might be incorrectly normalized (maybe it's already in Th/s)
                # In that case, try using hashrate directly as Th/s
                if rate_jth > 1000:
                    logger.warning(f"Calculated efficiency {rate_jth:.2f} J/Th seems too high. "
                                 f"Hashrate might be in Th/s already. Hashrate: {hashrate_ghs}, Power: {wattage}")
                    # Try treating hashrate as Th/s directly
                    rate_jth = wattage / hashrate_ghs
                    calculated = True
                else:
                    calculated = True
            except ZeroDivisionError:
                rate_jth = 0.0
        
        # Priority 2: Fallback to pyasic's efficiency value if calculation not possible
        if not calculated and efficiency_value is not None and efficiency_value != 0:
            # Convert to float (handles scientific notation strings)
            if isinstance(efficiency_value, str):
                rate_raw = float(efficiency_value)
            else:
                rate_raw = float(efficiency_value)
            
            # Convert from pyasic's efficiency unit to J/Th
            # pyasic provides efficiency in a unit that needs to be converted to J/Th
            # Conversion factor: multiply by 1e12 to convert to J/Th
            # Example: 1.8e-11 * 1e12 = 18.20 J/Th
            rate_jth = rate_raw * 1e12
        
        # Ensure non-negative
        rate_jth = max(0.0, float(rate_jth))
        
    except (ValueError, TypeError, ZeroDivisionError) as e:
        logger.warning(f"Error normalizing efficiency: {e}")
        rate_jth = 0.0
    
    return {
        "unit": {
            "suffix": "J/Th"
        },
        "rate": rate_jth
    }


def normalize_miner_data(data_dict: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalize miner data to ensure consistent formats:
    - Convert hashrate values to Gh/s
    - Convert difficulty values to strings
    - Ensure efficiency is a proper number (not scientific notation)
    
    Args:
        data_dict: Raw miner data dictionary from pyasic
    
    Returns:
        Dict: Normalized miner data
    """
    normalized = data_dict.copy()
    
    # Normalize main hashrate - preserve structure but convert rate to Gh/s
    if 'hashrate' in normalized and normalized['hashrate'] is not None:
        normalized['hashrate'] = normalize_hashrate_structure(normalized['hashrate'])
    else:
        normalized['hashrate'] = {
            "unit": {
                "value": 1000000000,
                "suffix": "Gh/s"
            },
            "rate": 0.0
        }
    
    
    # Normalize difficulty fields (convert to string, handle None)
    if 'best_difficulty' in normalized:
        if normalized['best_difficulty'] is not None:
            try:
                normalized['best_difficulty'] = str(int(normalized['best_difficulty']))
            except (ValueError, TypeError):
                normalized['best_difficulty'] = "0"
        else:
            normalized['best_difficulty'] = "0"
    else:
        normalized['best_difficulty'] = "0"
    
    if 'best_session_difficulty' in normalized:
        if normalized['best_session_difficulty'] is not None:
            try:
                normalized['best_session_difficulty'] = str(int(normalized['best_session_difficulty']))
            except (ValueError, TypeError):
                normalized['best_session_difficulty'] = "0"
        else:
            normalized['best_session_difficulty'] = "0"
    else:
        normalized['best_session_difficulty'] = "0"
    
    # Normalize efficiency - preserve structure but convert rate to J/Th
    # Extract hashrate rate for efficiency calculation if needed
    hashrate_obj = normalized.get('hashrate')
    hashrate_ghs = hashrate_obj['rate'] if isinstance(hashrate_obj, dict) and 'rate' in hashrate_obj else (hashrate_obj if isinstance(hashrate_obj, (int, float)) else 0.0)
    wattage = normalized.get('wattage')
    
    # Get efficiency value (check efficiency_fract as fallback)
    efficiency_value = normalized.get('efficiency')
    if (efficiency_value is None or efficiency_value == 0) and 'efficiency_fract' in normalized:
        efficiency_value = normalized.get('efficiency_fract')
    
    # Normalize efficiency to structured format
    normalized['efficiency'] = normalize_efficiency_structure(
        efficiency_value,
        wattage=wattage,
        hashrate_ghs=hashrate_ghs
    )
    
    return normalized


class ScanRequest(BaseModel):
    subnet: Optional[str] = None
    ip: Optional[str] = None


class MinerInfo(BaseModel):
    ip: str
    mac: Optional[str] = None
    model: Optional[str] = None
    hostname: Optional[str] = None
    hashrate: Optional[float] = None
    data: Dict[str, Any]


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.post("/scan", response_model=List[MinerInfo])
async def scan_miners(request: ScanRequest):
    """Scan for miners using pyasic"""
    try:
        miners = []
        
        if request.ip:
            # Single IP scan
            miner = await get_miner(request.ip)
            if miner:
                data = await miner.get_data()
                # Serialize first to get the dict
                data_dict = data.as_dict() if hasattr(data, "as_dict") else {}
                
                # Normalize the data (hashrate will be normalized with structure preserved)
                normalized_data = normalize_miner_data(data_dict)
                
                # Extract hashrate rate for the top-level hashrate field (for backward compatibility)
                normalized_hashrate_rate = normalized_data['hashrate']['rate'] if isinstance(normalized_data.get('hashrate'), dict) else 0.0
                
                miners.append({
                    "ip": request.ip,
                    "mac": getattr(data, "mac", None),
                    "model": getattr(data, "model", None),
                    "hostname": getattr(data, "hostname", None),
                    "hashrate": normalized_hashrate_rate,  # Top-level for backward compatibility
                    "data": normalized_data
                })
        elif request.subnet:
            # Network scan
            network = MinerNetwork.from_subnet(request.subnet)
            found_miners = await network.scan()
            for miner in found_miners:
                data = await miner.get_data()
                # Serialize first to get the dict
                data_dict = data.as_dict() if hasattr(data, "as_dict") else {}
                
                # Normalize the data (hashrate will be normalized with structure preserved)
                normalized_data = normalize_miner_data(data_dict)
                
                # Extract hashrate rate for the top-level hashrate field (for backward compatibility)
                normalized_hashrate_rate = normalized_data['hashrate']['rate'] if isinstance(normalized_data.get('hashrate'), dict) else 0.0
                
                miners.append({
                    "ip": miner.ip,
                    "mac": getattr(data, "mac", None),
                    "model": getattr(data, "model", None),
                    "hostname": getattr(data, "hostname", None),
                    "hashrate": normalized_hashrate_rate,  # Top-level for backward compatibility
                    "data": normalized_data
                })
        else:
            raise HTTPException(status_code=400, detail="Either 'ip' or 'subnet' must be provided")
        
        return miners
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/miner/{ip}/data")
async def get_miner_data(ip: str):
    """Get data from a specific miner using get_data()"""
    try:
        miner = await get_miner(ip)
        if not miner:
            raise HTTPException(status_code=404, detail="Miner not found")
        
        data = await miner.get_data()
        # Serialize first to get the dict
        data_dict = data.as_dict() if hasattr(data, "as_dict") else {}
        
        # Normalize the data (hashrate will be normalized with structure preserved)
        normalized_data = normalize_miner_data(data_dict)
        
        return normalized_data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/miner/{ip}/config")
async def get_miner_config(ip: str):
    """Get config from a specific miner"""
    try:
        miner = await get_miner(ip)
        if not miner:
            raise HTTPException(status_code=404, detail="Miner not found")
        
        config = await miner.get_config()
        return config.as_dict() if hasattr(config, "as_dict") else {}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/miner/{ip}/config")
async def update_miner_config(ip: str, config: Dict[str, Any]):
    """Update miner config"""
    try:
        miner = await get_miner(ip)
        if not miner:
            raise HTTPException(status_code=404, detail="Miner not found")
        
        from pyasic.config import MinerConfig
        miner_config = MinerConfig(**config)
        await miner.send_config(miner_config)
        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/miner/{ip}/restart")
async def restart_miner(ip: str):
    """Restart a miner"""
    try:
        miner = await get_miner(ip)
        if not miner:
            raise HTTPException(status_code=404, detail="Miner not found")
        
        await miner.reboot()
        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/miner/{ip}/fault-light/on")
async def fault_light_on(ip: str):
    """Turn on fault light"""
    try:
        miner = await get_miner(ip)
        if not miner:
            raise HTTPException(status_code=404, detail="Miner not found")
        
        await miner.fault_light_on()
        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/miner/{ip}/fault-light/off")
async def fault_light_off(ip: str):
    """Turn off fault light"""
    try:
        miner = await get_miner(ip)
        if not miner:
            raise HTTPException(status_code=404, detail="Miner not found")
        
        await miner.fault_light_off()
        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/miner/{ip}/errors")
async def get_miner_errors(ip: str):
    """Get miner errors if available"""
    try:
        miner = await get_miner(ip)
        if not miner:
            raise HTTPException(status_code=404, detail="Miner not found")
        
        errors = await miner.get_errors()
        return errors if errors else []
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
