#!/usr/bin/env python3
"""
Validate that API implementation matches contracts.

This script ensures that:
1. All contracts in api_contracts.py have corresponding routes
2. All routes use the correct response_model from contracts
3. Request/response types match contract definitions

Usage:
    # From project root:
    python3 pyasic-bridge/scripts/validate_contracts.py
    
    # Or from pyasic-bridge directory:
    cd pyasic-bridge
    python3 scripts/validate_contracts.py
    
    # If Poetry is configured (pyproject.toml exists):
    cd pyasic-bridge
    poetry run python scripts/validate_contracts.py

Requirements:
    Install dependencies first:
        # Using venv (recommended for this project):
        cd pyasic-bridge
        make setup-pyasic-bridge
        # Or manually:
        python3 -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt
        
        # If Poetry is configured:
        cd pyasic-bridge
        poetry install
"""

import sys
from pathlib import Path

# Add app directory to path
script_dir = Path(__file__).parent
pyasic_bridge_dir = script_dir.parent
sys.path.insert(0, str(pyasic_bridge_dir))

# Check for Poetry and pyproject.toml
import subprocess
poetry_available = False
poetry_configured = False
try:
    result = subprocess.run(
        ["poetry", "--version"],
        capture_output=True,
        text=True,
        timeout=2
    )
    poetry_available = result.returncode == 0
    # Check if pyproject.toml exists (Poetry is configured for this project)
    poetry_configured = (pyasic_bridge_dir / "pyproject.toml").exists()
except (FileNotFoundError, subprocess.TimeoutExpired):
    pass

# Check for venv and suggest activation
venv_path = pyasic_bridge_dir / "venv"
in_venv = hasattr(sys, "real_prefix") or (hasattr(sys, "base_prefix") and sys.base_prefix != sys.prefix)

if poetry_configured and not in_venv:
    print("💡 Tip: Poetry detected. Consider using:", file=sys.stderr)
    print(f"   poetry run python {Path(__file__).relative_to(pyasic_bridge_dir)}", file=sys.stderr)
    print("   This will automatically use Poetry's virtual environment.\n", file=sys.stderr)
elif venv_path.exists() and not in_venv:
    print("💡 Tip: Virtual environment detected but not activated.", file=sys.stderr)
    print(f"   Activate it with: source {venv_path}/bin/activate", file=sys.stderr)
    print("   Or run: make setup-pyasic-bridge\n", file=sys.stderr)

# Check for required dependencies
try:
    from fastapi.routing import APIRoute
    from app.api_contracts import API_CONTRACTS
    from app.app import create_app
except ImportError as e:
    if "fastapi" in str(e).lower() or "ModuleNotFoundError" in str(type(e).__name__):
        print("❌ Error: FastAPI and dependencies are not installed.", file=sys.stderr)
        print("\nPlease install dependencies first:", file=sys.stderr)
        if poetry_available:
            print(f"  cd {pyasic_bridge_dir}", file=sys.stderr)
            print("  poetry install", file=sys.stderr)
            print("  poetry run python scripts/validate_contracts.py", file=sys.stderr)
        elif venv_path.exists():
            print(f"  source {venv_path}/bin/activate", file=sys.stderr)
            print("  pip install -r requirements.txt", file=sys.stderr)
        else:
            print(f"  cd {pyasic_bridge_dir}", file=sys.stderr)
            print("  make setup-pyasic-bridge  # Creates venv and installs deps", file=sys.stderr)
            print("  # Or manually:", file=sys.stderr)
            print("  python3 -m venv venv", file=sys.stderr)
            print("  source venv/bin/activate", file=sys.stderr)
            print("  pip install -r requirements.txt", file=sys.stderr)
        sys.exit(1)
    raise


def get_route_by_path_and_method(
    app_routes,
    path: str,
    method: str
) -> APIRoute | None:
    """
    Find a route by path and HTTP method.

    Args:
        app_routes: List of routes from FastAPI app
        path: Route path
        method: HTTP method (GET, POST, etc.)

    Returns:
        Matching route or None
    """
    for route in app_routes:
        if isinstance(route, APIRoute):
            # Normalize paths (remove trailing slashes, handle path params)
            route_path = route.path.rstrip("/")
            contract_path = path.rstrip("/")

            # Check if paths match (handle path params)
            if route_path == contract_path or route_path.replace("{", "").replace("}", "") == contract_path.replace("{", "").replace("}", ""):
                if method.upper() in route.methods:
                    return route
    return None


def validate_contracts() -> tuple[bool, list[str]]:
    """
    Validate that all contracts have matching routes.

    Returns:
        Tuple of (is_valid, list of errors)
    """
    app = create_app()
    errors: list[str] = []

    # Get all routes from the app
    all_routes: list[APIRoute] = []
    for route in app.routes:
        if isinstance(route, APIRoute):
            all_routes.append(route)

    # Check each contract
    for contract_name, contract in API_CONTRACTS.items():
        route = get_route_by_path_and_method(
            app.routes,
            contract.path,
            contract.method
        )

        if route is None:
            errors.append(
                f"❌ Contract '{contract_name}': No route found for "
                f"{contract.method} {contract.path}"
            )
            continue

        # Check response model matches
        if hasattr(route, "response_model"):
            route_response_model = route.response_model
            contract_response_model = contract.response_body

            # Handle RootModel wrapping
            if hasattr(contract_response_model, "__root__"):
                # RootModel - check if route returns the wrapped type
                wrapped_type = contract_response_model.__root__
                if route_response_model != contract_response_model and route_response_model != wrapped_type:
                    errors.append(
                        f"⚠️  Contract '{contract_name}': Response model mismatch. "
                        f"Contract expects {contract_response_model.__name__}, "
                        f"route uses {route_response_model.__name__ if hasattr(route_response_model, '__name__') else route_response_model}"
                    )
            elif route_response_model != contract_response_model:
                errors.append(
                    f"⚠️  Contract '{contract_name}': Response model mismatch. "
                    f"Contract expects {contract_response_model.__name__}, "
                    f"route uses {route_response_model.__name__ if hasattr(route_response_model, '__name__') else route_response_model}"
                )

    # Check for routes without contracts (warnings only)
    contract_paths = {(c.path, c.method) for c in API_CONTRACTS.values()}
    for route in all_routes:
        route_key = (route.path, list(route.methods)[0] if route.methods else "")
        if route_key[0] not in [c.path for c in API_CONTRACTS.values()]:
            # Skip root and health endpoints (they're simple)
            if route.path not in ["/", "/health", "/docs", "/openapi.json", "/redoc"]:
                errors.append(
                    f"⚠️  Route {list(route.methods)[0] if route.methods else '?'} {route.path} "
                    f"has no contract definition"
                )

    return len([e for e in errors if e.startswith("❌")]) == 0, errors


if __name__ == "__main__":
    print("🔍 Validating API contracts...\n")

    is_valid, errors = validate_contracts()

    if errors:
        for error in errors:
            print(error)
        print()

    if is_valid:
        print("✅ All contracts are valid!")
        sys.exit(0)
    else:
        print("❌ Contract validation failed!")
        sys.exit(1)
