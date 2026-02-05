#!/usr/bin/env python3
"""
Generate TypeScript client from OpenAPI schema.

This script generates a TypeScript client for the pyasic-bridge service
and places it in common/pyasic-bridge-client for use by other TypeScript services.

Cross-platform: Works on Unix, macOS, and Windows.

Usage:
    # From project root:
    python3 pyasic-bridge/scripts/generate_client.py
    
    # Or from pyasic-bridge directory:
    cd pyasic-bridge
    python3 scripts/generate_client.py
    
    # If Poetry is configured (pyproject.toml exists):
    cd pyasic-bridge
    poetry run python scripts/generate_client.py

Requirements:
    - Node.js and npm must be installed
    - OpenAPI schema must exist at common/contracts/pyasic-bridge-openapi.json
      (run export_openapi.py first if needed)
"""

import platform
import shutil
import subprocess
import sys
from pathlib import Path

# Colors for output (cross-platform)
class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    NC = '\033[0m'  # No Color
    
    @staticmethod
    def disable():
        """Disable colors on Windows if ANSI support is not available."""
        if platform.system() == 'Windows':
            # Check if ANSI colors are supported (Windows 10+)
            try:
                import ctypes
                kernel32 = ctypes.windll.kernel32
                # Enable ANSI escape sequences
                kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
            except:
                Colors.RED = ''
                Colors.GREEN = ''
                Colors.YELLOW = ''
                Colors.NC = ''

Colors.disable()


def print_error(message: str):
    """Print error message."""
    print(f"{Colors.RED}❌ {message}{Colors.NC}", file=sys.stderr)


def print_success(message: str):
    """Print success message."""
    print(f"{Colors.GREEN}✅ {message}{Colors.NC}")


def print_info(message: str):
    """Print info message."""
    print(f"{Colors.GREEN}{message}{Colors.NC}")


def print_warning(message: str):
    """Print warning message."""
    print(f"{Colors.YELLOW}💡 {message}{Colors.NC}")


def find_command(cmd: str) -> str | None:
    """
    Find command in PATH, cross-platform.
    
    Args:
        cmd: Command name to find
        
    Returns:
        Full path to command or None if not found
    """
    # On Windows, check for .cmd, .exe, .bat extensions
    if platform.system() == 'Windows':
        extensions = ['', '.cmd', '.exe', '.bat']
        for ext in extensions:
            full_cmd = shutil.which(f"{cmd}{ext}")
            if full_cmd:
                return full_cmd
        return None
    else:
        return shutil.which(cmd)


def check_dependencies() -> tuple[bool, str | None]:
    """
    Check if Node.js and npm are available.
    
    Returns:
        Tuple of (is_available, error_message)
    """
    node_cmd = find_command('node')
    if not node_cmd:
        return False, "Node.js is not installed. Please install Node.js to generate TypeScript clients."
    
    npm_cmd = find_command('npm')
    if not npm_cmd:
        return False, "npm is not installed. Please install npm to generate TypeScript clients."
    
    return True, None


def get_paths() -> tuple[Path, Path, Path, Path]:
    """
    Get all required paths, cross-platform.
    
    Returns:
        Tuple of (script_dir, project_root, openapi_schema, client_output_dir)
    """
    script_dir = Path(__file__).parent.resolve()
    project_root = script_dir.parent.parent.resolve()
    common_dir = project_root / "common"
    openapi_schema = common_dir / "contracts" / "pyasic-bridge-openapi.json"
    client_output_dir = common_dir / "pyasic-bridge-client"
    
    return script_dir, project_root, openapi_schema, client_output_dir


def generate_client(openapi_schema: Path, client_output_dir: Path) -> bool:
    """
    Generate TypeScript client using @hey-api/openapi-ts.

    Uses paths relative to common/ so the tool writes to the correct place on all platforms.

    Args:
        openapi_schema: Path to OpenAPI schema JSON file
        client_output_dir: Path to output directory for generated client

    Returns:
        True if successful, False otherwise
    """
    # Create output directory
    src_dir = client_output_dir / "src"
    src_dir.mkdir(parents=True, exist_ok=True)

    # Run from common/ (parent of pyasic-bridge-client) so relative paths are predictable
    cwd = client_output_dir.parent
    # Input: use absolute path so @hey-api/openapi-ts treats it as a file, not "org/project" shorthand
    input_str = str(openapi_schema.resolve())
    try:
        output_rel = str(client_output_dir.relative_to(cwd)) + "/src"
    except ValueError:
        output_rel = str(src_dir.resolve())

    print_info("⚙️  Generating TypeScript client...")

    cmd = [
        "npx",
        "--yes",
        "@hey-api/openapi-ts",
        "-i", input_str,
        "-o", output_rel,
    ]

    try:
        result = subprocess.run(
            cmd,
            check=True,
            capture_output=True,
            text=True,
            cwd=cwd,
        )
        # Verify generated files exist (tool can exit 0 but write elsewhere on some setups)
        sdk_file = src_dir / "sdk.gen.ts"
        types_file = src_dir / "types.gen.ts"
        if not sdk_file.exists() or not types_file.exists():
            print_error("Generator ran but expected files are missing.")
            print(f"  Looked for: {sdk_file} and {types_file}", file=sys.stderr)
            if result.stdout:
                print(result.stdout, file=sys.stderr)
            if result.stderr:
                print(result.stderr, file=sys.stderr)
            return False
        return True
    except subprocess.CalledProcessError as e:
        print_error("Failed to generate TypeScript client")
        print(f"Command: {' '.join(cmd)}", file=sys.stderr)
        if e.stdout:
            print(e.stdout, file=sys.stderr)
        if e.stderr:
            print(e.stderr, file=sys.stderr)
        print_warning("Check that the OpenAPI schema is valid.")
        return False
    except FileNotFoundError:
        print_error("npx not found. Make sure Node.js and npm are installed.")
        return False


def create_index_file(client_output_dir: Path) -> None:
    """Create main index.ts file that re-exports from generated code."""
    index_content = '''/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
 */

/**
 * AUTO-GENERATED - DO NOT EDIT
 * Generated from OpenAPI schema: common/contracts/pyasic-bridge-openapi.json
 * Run: pyasic-bridge/scripts/generate_client.py
 * 
 * This package provides a TypeScript client for the pyasic-bridge service.
 * All types, services, and client code are auto-generated from the OpenAPI schema.
 */

// Re-export everything from the generated client
export * from './src';
'''
    
    index_file = client_output_dir / "index.ts"
    index_file.write_text(index_content, encoding='utf-8')


def create_gitignore(client_output_dir: Path) -> None:
    """Create .gitignore file for generated files."""
    gitignore_content = '''# Generated files
src/

# Dependencies
node_modules/

# Build output
dist/

# IDE
.idea/
.vscode/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db
'''
    
    gitignore_file = client_output_dir / ".gitignore"
    gitignore_file.write_text(gitignore_content, encoding='utf-8')


def main() -> int:
    """Main function."""
    print_info("🚀 Generating TypeScript client for pyasic-bridge...")
    
    # Get paths
    script_dir, project_root, openapi_schema, client_output_dir = get_paths()
    
    # Check if OpenAPI schema exists
    if not openapi_schema.exists():
        print_error(f"OpenAPI schema not found at {openapi_schema}")
        print_warning("Run export_openapi.py first to generate the schema")
        print(f"   python3 {script_dir / 'export_openapi.py'}")
        return 1
    
    # Check dependencies
    deps_ok, deps_error = check_dependencies()
    if not deps_ok:
        print_error(deps_error)
        return 1
    
    # Generate client
    if not generate_client(openapi_schema, client_output_dir):
        return 1
    
    # Create index.ts
    print_info("📝 Creating main index.ts exports...")
    create_index_file(client_output_dir)
    
    # Create .gitignore
    print_info("📝 Creating .gitignore...")
    create_gitignore(client_output_dir)
    
    # Success message
    print_success("TypeScript client generated successfully!")
    print_info(f"📦 Output: {client_output_dir}")
    print_info(f"   Client code is in: {client_output_dir / 'src'} (sdk.gen.ts, types.gen.ts, etc.)")
    print()
    print_warning("Next steps:")
    print(f"   1. Install dependencies: cd {client_output_dir} && npm install")
    print("   2. Build the package: npm run build")
    print("   3. Use in your TypeScript services:")
    print("      import { client } from '@pluto/pyasic-bridge-client';")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
