#!/bin/sh
set -e

# Function to install dependencies in a module (common or other file dependencies)
install_common_module() {
  local module_path=$1
  local module_name=$2
  
  if [ ! -d "$module_path" ]; then
    return 0
  fi
  
  # Check if node_modules exists and if the main package is installed
  if [ -d "$module_path/node_modules" ]; then
    local needs_reinstall=false
    local validation_passed=false

    # Verify if the main package is installed correctly for known modules
    case "$module_name" in
      logger)
        if [ -f "$module_path/node_modules/winston/package.json" ]; then
          echo "Dependencies already installed in $module_name"
          return 0
        else
          needs_reinstall=true
        fi
        ;;
      db)
        if [ -f "$module_path/node_modules/level/package.json" ]; then
          echo "Dependencies already installed in $module_name"
          return 0
        else
          needs_reinstall=true
        fi
        ;;
      interfaces|utils)
        # These modules might not have runtime dependencies
        if [ -f "$module_path/node_modules/typescript/package.json" ] || [ ! -f "$module_path/package.json" ] || ! grep -q '"dependencies"' "$module_path/package.json" 2>/dev/null; then
          echo "Dependencies already installed in $module_name"
          return 0
        else
          needs_reinstall=true
        fi
        ;;
      *)
        # For unknown modules, do a basic sanity check
        # Check if node_modules has content (at least one directory or file)
        if [ -n "$(ls -A "$module_path/node_modules" 2>/dev/null)" ]; then
          # Basic validation: check if package.json exists and has dependencies
          if [ ! -f "$module_path/package.json" ]; then
            validation_passed=true
          elif ! grep -q '"dependencies"' "$module_path/package.json" 2>/dev/null; then
            # No dependencies to check
            validation_passed=true
          else
            # Has dependencies, assume node_modules is valid if it has content
            validation_passed=true
          fi

          if [ "$validation_passed" = true ]; then
            echo "Dependencies already installed in $module_name"
            return 0
          fi
        fi
        # If node_modules is empty or validation failed, reinstall
        needs_reinstall=true
        ;;
    esac

    # Only remove and reinstall if we detected a problem
    if [ "$needs_reinstall" = true ]; then
      echo "Reinstalling dependencies in $module_name..."
      rm -rf "$module_path/node_modules" 2>/dev/null || true
    fi
  fi
  
  echo "Installing dependencies in $module_name..."
  cd "$module_path"
  # Retry logic to handle concurrency errors
  # Include devDependencies for TypeScript compilation
  for i in 1 2 3; do
    if npm install --prefer-offline --no-audit --include=dev 2>&1; then
      echo "Successfully installed dependencies in $module_name"
      return 0
    else
      if [ $i -lt 3 ]; then
        echo "Install attempt $i failed, retrying in 2 seconds..."
        sleep 2
        # Clean and retry
        rm -rf node_modules package-lock.json 2>/dev/null || true
      fi
    fi
  done
  echo "Warning: Failed to install dependencies in $module_name after 3 attempts"
  return 1
}

# Build TypeScript modules that need compilation
build_common_module() {
  local module_path=$1
  local module_name=$2

  if [ ! -d "$module_path" ] || [ ! -f "$module_path/package.json" ]; then
    return 0
  fi

  # Check if dist directory exists with compiled files
  # Force rebuild if FORCE_REBUILD environment variable is set
  if [ -d "$module_path/dist" ] && [ -f "$module_path/dist/index.js" ] && [ -z "$FORCE_REBUILD" ]; then
    echo "TypeScript already compiled in $module_path"
    return 0
  fi

  # Clean dist directory if forcing rebuild
  if [ -n "$FORCE_REBUILD" ] && [ -d "$module_path/dist" ]; then
    echo "Force rebuild requested, cleaning dist directory in $module_path..."
    rm -rf "$module_path/dist"
  fi

  echo "Building TypeScript in $module_path..."
  cd "$module_path"
  # Use npx to ensure tsc is available from node_modules/.bin
  if npx --yes tsc 2>&1; then
    echo "Successfully built $module_path"
    return 0
  else
    echo "Warning: Failed to build $module_path"
    return 1
  fi
}

# Return to the app directory
cd /home/node/app

# Generic: Build any file: dependencies found in package.json
if [ -f "package.json" ]; then
  echo "Checking for file: dependencies to build..."
  grep -o '"[^"]*":\s*"file:[^"]*"' package.json 2>/dev/null | while IFS= read -r line; do
    dep_path=$(echo "$line" | sed -n 's/.*"file:\([^"]*\)".*/\1/p')
    if [ -n "$dep_path" ]; then
      # Try to resolve the path - use cd to resolve relative paths
      abs_path=""

      # Method 1: Try using cd to resolve (most reliable)
      if resolved=$(cd /home/node/app && cd "$dep_path" 2>/dev/null && pwd 2>/dev/null); then
        abs_path="$resolved"
      else
        # Method 2: Manual resolution for ../ paths
        if echo "$dep_path" | grep -q "^\.\./"; then
          remaining=$(echo "$dep_path" | sed 's|^\.\./||')
          # Try /home/node/remaining
          if [ -d "/home/node/$remaining" ]; then
            abs_path="/home/node/$remaining"
          fi
        fi
      fi

      # Debug: Check if path exists
      if [ -n "$abs_path" ]; then
        echo "Checking path: $abs_path"
        if [ -d "$abs_path" ]; then
          echo "  Directory exists: yes"
          if [ -f "$abs_path/package.json" ]; then
            echo "  package.json exists: yes"
          else
            echo "  package.json exists: no"
          fi
        else
          echo "  Directory exists: no"
        fi
      fi

      if [ -n "$abs_path" ] && [ -d "$abs_path" ] && [ -f "$abs_path/package.json" ]; then
        module_name=$(basename "$abs_path")
        echo "Found file dependency: $dep_path -> $abs_path, installing and building..."
        install_common_module "$abs_path" "$module_name" || true
        build_common_module "$abs_path" "$module_name" || true
      else
        echo "File dependency $dep_path not found (tried: $abs_path), skipping..."
      fi
    fi
  done
fi

# Install dependencies if node_modules doesn't exist or if critical dependencies are missing
if [ ! -d "node_modules" ] || [ ! -f "node_modules/nodemon/package.json" ]; then
  echo "Installing dependencies in app..."
  # Retry logic
  for i in 1 2 3; do
    if npm install --prefer-offline --no-audit 2>&1; then
      break
    else
      if [ $i -lt 3 ]; then
        echo "Install attempt $i failed, retrying in 2 seconds..."
        sleep 2
        rm -rf node_modules package-lock.json 2>/dev/null || true
      else
        echo "Warning: Failed to install app dependencies after 3 attempts"
      fi
    fi
  done
fi

# Execute the passed command
exec "$@"