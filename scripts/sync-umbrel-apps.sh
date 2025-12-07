#!/usr/bin/env bash

# Copyright (C) 2024 Alberto Gangarossa.
# Pluto is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License
# as published by the Free Software Foundation, version 3.
# See <https://www.gnu.org/licenses/>.

set -euo pipefail

SCRIPT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Load common functions
SCRIPT_NAME="sync-umbrel-apps"
# shellcheck source=scripts/lib/common.sh
source "${SCRIPT_ROOT}/scripts/lib/common.sh"

# Load .env file if present, preserving APPS_TO_SYNC from command line
load_env_file "$SCRIPT_ROOT" APPS_TO_SYNC

DEFAULT_SOURCE_DIR="${SCRIPT_ROOT}/umbrel-apps"

# Sensitive values must be provided via environment variables or the env file
# These are intentionally not set as defaults to prevent committing personal info
SOURCE_DIR="${SOURCE_DIR:-$DEFAULT_SOURCE_DIR}"
REMOTE_PATH="${REMOTE_PATH:-}"
UMBEL_HOST="${UMBEL_HOST:-}"
UMBEL_USER="${UMBEL_USER:-umbrel}"
UMBEL_PASSWORD="${UMBEL_PASSWORD:-}"

# Validate required environment variables
if [[ -z "${REMOTE_PATH}" ]]; then
  echo "Error: REMOTE_PATH environment variable is required" >&2
  echo "Usage: REMOTE_PATH=/path/to/remote UMBREL_HOST=host UMBREL_PASSWORD=pass $0" >&2
  exit 1
fi

if [[ -z "${UMBEL_HOST}" ]]; then
  echo "Error: UMBREL_HOST environment variable is required" >&2
  echo "Usage: REMOTE_PATH=/path/to/remote UMBREL_HOST=host UMBREL_PASSWORD=pass $0" >&2
  exit 1
fi

if [[ -z "${UMBEL_PASSWORD}" ]]; then
  echo "Error: UMBREL_PASSWORD environment variable is required" >&2
  echo "Usage: REMOTE_PATH=/path/to/remote UMBREL_HOST=host UMBREL_PASSWORD=pass $0" >&2
  exit 1
fi

if ! command -v sshpass >/dev/null 2>&1; then
  echo "sshpass is required. Install it (e.g. sudo apt install sshpass)." >&2
  exit 1
fi

SSH_BASE=(sshpass -p "${UMBEL_PASSWORD}" ssh -o StrictHostKeyChecking=accept-new "${UMBEL_USER}@${UMBEL_HOST}")

echo "Syncing ${SOURCE_DIR} -> ${UMBEL_USER}@${UMBEL_HOST}:${REMOTE_PATH}"
sshpass -p "${UMBEL_PASSWORD}" rsync -av --exclude=".gitkeep" \
  "${SOURCE_DIR}/" "${UMBEL_USER}@${UMBEL_HOST}:${REMOTE_PATH}/"

IFS=',' read -r -a APP_LIST <<< "${APPS_TO_SYNC:-pluto,pluto-next}"

REMOTE_CMD=$(cat <<EOF
set -euo pipefail

on_err() {
  local status=\$?
  echo "[Umbrel Sync] Command '\${BASH_COMMAND}' failed with exit code \${status}" >&2
  exit \${status}
}
trap on_err ERR

cd "${REMOTE_PATH}"
for app_id in ${APP_LIST[*]}; do
  echo "[Umbrel Sync] Uninstalling \${app_id} app..."
  # Silently ignore uninstall errors (app may not be installed)
  umbreld client apps.uninstall.mutate --appId "\${app_id}" 2>/dev/null || true
  echo "[Umbrel Sync] Installing \${app_id} app..."
  umbreld client apps.install.mutate --appId "\${app_id}"
done
EOF
)

echo "Running remote Umbrel commands..."
"${SSH_BASE[@]}" "${REMOTE_CMD}"

echo "Done."

