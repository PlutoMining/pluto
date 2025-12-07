#!/bin/sh
set -e

# Function to install dependencies in a common module
install_common_module() {
  local module_path=$1
  local module_name=$2
  
  if [ ! -d "$module_path" ]; then
    return 0
  fi
  
  # Check if node_modules exists and if the main package is installed
  if [ -d "$module_path/node_modules" ]; then
    # Verify if the main package is installed correctly
    case "$module_name" in
      logger)
        if [ -f "$module_path/node_modules/winston/package.json" ]; then
          echo "Dependencies already installed in common/$module_name"
          return 0
        fi
        ;;
      db)
        if [ -f "$module_path/node_modules/level/package.json" ]; then
          echo "Dependencies already installed in common/$module_name"
          return 0
        fi
        ;;
      interfaces|utils)
        # These modules might not have runtime dependencies
        if [ -f "$module_path/node_modules/typescript/package.json" ] || [ ! -f "$module_path/package.json" ] || ! grep -q '"dependencies"' "$module_path/package.json" 2>/dev/null; then
          echo "Dependencies already installed in common/$module_name"
          return 0
        fi
        ;;
    esac
    # If node_modules exists but the package is not installed, remove it and reinstall
    echo "Cleaning corrupted node_modules in common/$module_name..."
    rm -rf "$module_path/node_modules" 2>/dev/null || true
  fi
  
  echo "Installing dependencies in common/$module_name..."
  cd "$module_path"
  # Retry logic to handle concurrency errors
  for i in 1 2 3; do
    if npm install --prefer-offline --no-audit 2>&1; then
      echo "Successfully installed dependencies in common/$module_name"
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
  echo "Warning: Failed to install dependencies in common/$module_name after 3 attempts"
  return 1
}

# Install dependencies in common modules
install_common_module "/home/node/common/logger" "logger" || true
install_common_module "/home/node/common/interfaces" "interfaces" || true
install_common_module "/home/node/common/db" "db" || true

# Return to the app directory
cd /home/node/app

# Install dependencies if node_modules doesn't exist or if critical dependencies are missing
if [ ! -d "node_modules" ] || [ ! -f "node_modules/nodemon/package.json" ] || [ ! -f "node_modules/tsx/package.json" ]; then
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
