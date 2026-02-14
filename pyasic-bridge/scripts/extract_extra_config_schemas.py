#!/usr/bin/env python3
"""
Extract extra_config JSON schemas from OpenAPI schema and generate TypeScript file.

This script extracts miner-specific extra_config schemas (like BitaxeExtraConfig)
from the OpenAPI schema and generates a TypeScript file that can be imported
directly in the frontend for validation using AJV.

Usage:
    # From project root (after export_openapi.py):
    python3 pyasic-bridge/scripts/extract_extra_config_schemas.py
    
    # Or from pyasic-bridge directory:
    cd pyasic-bridge
    python3 scripts/extract_extra_config_schemas.py
"""

import json
import sys
from pathlib import Path

# Add app directory to path
script_dir = Path(__file__).parent
pyasic_bridge_dir = script_dir.parent
project_root = pyasic_bridge_dir.parent
sys.path.insert(0, str(pyasic_bridge_dir))

from app.models.extra_config import EXTRA_CONFIG_MODELS


def extract_extra_config_schemas(
    openapi_schema_path: Path,
    output_path: Path,
) -> bool:
    """
    Extract extra_config schemas from OpenAPI schema and generate TypeScript file.

    Args:
        openapi_schema_path: Path to OpenAPI schema JSON file
        output_path: Path to output TypeScript file

    Returns:
        True if successful, False otherwise
    """
    # Read OpenAPI schema
    try:
        with open(openapi_schema_path, "r") as f:
            openapi_schema = json.load(f)
    except FileNotFoundError:
        print(f"❌ OpenAPI schema not found at {openapi_schema_path}", file=sys.stderr)
        return False
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON in OpenAPI schema: {e}", file=sys.stderr)
        return False

    # Get components.schemas
    components = openapi_schema.get("components", {})
    schemas = components.get("schemas", {})

    # Extract schemas for each miner type
    # Track which models we've already exported to avoid duplicates
    extracted_schemas: dict[str, dict] = {}
    schema_exports: dict[str, str] = {}  # model_name -> export_name
    miner_type_to_export: dict[str, str] = {}  # miner_type -> export_name

    for miner_type_pattern, model_class in EXTRA_CONFIG_MODELS.items():
        model_name = model_class.__name__
        if model_name in schemas:
            schema = schemas[model_name]
            extracted_schemas[miner_type_pattern] = schema
            
            # Create export name (e.g., BitaxeExtraConfigSchema)
            export_name = f"{model_name}Schema"
            
            # Only add to exports if we haven't seen this model before
            if model_name not in schema_exports:
                schema_exports[model_name] = export_name
            
            # Map miner type to export name (may reuse same export for multiple types)
            miner_type_to_export[miner_type_pattern] = schema_exports[model_name]
        else:
            print(f"⚠️  Warning: {model_name} not found in OpenAPI schema", file=sys.stderr)

    if not extracted_schemas:
        print("❌ No extra_config schemas found in OpenAPI schema", file=sys.stderr)
        return False

    # Generate TypeScript file
    output_path.parent.mkdir(parents=True, exist_ok=True)

    ts_content = '''/**
 * AUTO-GENERATED - DO NOT EDIT
 * Generated from OpenAPI schema: common/contracts/pyasic-bridge-openapi.json
 * Run: python3 pyasic-bridge/scripts/extract_extra_config_schemas.py
 * 
 * This file contains JSON schemas for miner-specific extra_config models.
 * These schemas are used for client-side validation using AJV.
 */

'''

    # Export individual schemas (only once per unique model)
    for model_name, export_name in schema_exports.items():
        if model_name in schemas:
            schema_json = json.dumps(schemas[model_name], indent=2)
            ts_content += f"export const {export_name} = {schema_json} as const;\n\n"

    # Export mapping of miner types to schemas
    ts_content += "/**\n"
    ts_content += " * Mapping of miner type patterns to their extra_config JSON schemas.\n"
    ts_content += " * Used by MinerSettingsFactory to get the correct schema for a miner type.\n"
    ts_content += " */\n"
    ts_content += "export const ExtraConfigSchemas: Record<string, any> = {\n"

    for miner_type_pattern in EXTRA_CONFIG_MODELS.keys():
        if miner_type_pattern in miner_type_to_export:
            export_name = miner_type_to_export[miner_type_pattern]
            ts_content += f'  {json.dumps(miner_type_pattern)}: {export_name},\n'

    ts_content += "};\n"

    # Write file
    try:
        with open(output_path, "w") as f:
            f.write(ts_content)
        print(f"✅ Extracted {len(extracted_schemas)} extra_config schemas to {output_path}")
        return True
    except Exception as e:
        print(f"❌ Failed to write output file: {e}", file=sys.stderr)
        return False


def main() -> int:
    """Main function."""
    # Get paths
    script_dir = Path(__file__).parent
    project_root = script_dir.parent.parent
    openapi_schema_path = project_root / "common" / "contracts" / "pyasic-bridge-openapi.json"
    client_output_dir = project_root / "common" / "pyasic-bridge-client"
    output_path = client_output_dir / "src" / "extra-config-schemas.gen.ts"

    # Check if OpenAPI schema exists
    if not openapi_schema_path.exists():
        print(f"❌ OpenAPI schema not found at {openapi_schema_path}", file=sys.stderr)
        print("   Run export_openapi.py first to generate the schema", file=sys.stderr)
        return 1

    # Extract schemas
    if not extract_extra_config_schemas(openapi_schema_path, output_path):
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
