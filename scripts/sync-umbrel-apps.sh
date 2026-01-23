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

# Backward compatible env var names:
# - Preferred: UMBREL_*
# - Legacy typo: UMBEL_*
UMBREL_HOST="${UMBREL_HOST:-${UMBEL_HOST:-}}"
UMBREL_USER="${UMBREL_USER:-${UMBEL_USER:-umbrel}}"
UMBREL_PASSWORD="${UMBREL_PASSWORD:-${UMBEL_PASSWORD:-}}"

# Validate required environment variables
if [[ -z "${REMOTE_PATH}" ]]; then
  echo "Error: REMOTE_PATH environment variable is required" >&2
  echo "Usage: REMOTE_PATH=/path/to/remote UMBREL_HOST=host [UMBREL_PASSWORD=pass] $0" >&2
  exit 1
fi

if [[ -z "${UMBREL_HOST}" ]]; then
  echo "Error: UMBREL_HOST environment variable is required" >&2
  echo "Usage: REMOTE_PATH=/path/to/remote UMBREL_HOST=host [UMBREL_PASSWORD=pass] $0" >&2
  exit 1
fi

SSH_COMMON_OPTS=(-o StrictHostKeyChecking=accept-new)

if [[ -n "${UMBREL_SSH_KEY:-}" ]]; then
  SSH_COMMON_OPTS+=(-i "${UMBREL_SSH_KEY}")
fi

SSH_TARGET="${UMBREL_USER}@${UMBREL_HOST}"

build_rsync_rsh() {
  local cmd="ssh"
  local opt
  for opt in "${SSH_COMMON_OPTS[@]}"; do
    cmd+=" $(printf '%q' "$opt")"
  done
  printf '%s' "$cmd"
}

RSYNC_RSH="$(build_rsync_rsh)"

if [[ -n "${UMBREL_PASSWORD}" ]]; then
  if ! command -v sshpass >/dev/null 2>&1; then
    echo "sshpass is required when using UMBREL_PASSWORD. Install it (e.g. sudo apt install sshpass)." >&2
    exit 1
  fi
  SSH_BASE=(sshpass -p "${UMBREL_PASSWORD}" ssh "${SSH_COMMON_OPTS[@]}" "$SSH_TARGET")
else
  SSH_BASE=(ssh "${SSH_COMMON_OPTS[@]}" "$SSH_TARGET")
fi

echo "Syncing ${SOURCE_DIR} -> ${SSH_TARGET}:${REMOTE_PATH}"
if [[ -n "${UMBREL_PASSWORD}" ]]; then
  # RSYNC_RSH must be an environment variable for rsync, not a \"command\"
  RSYNC_RSH="${RSYNC_RSH}" sshpass -p "${UMBREL_PASSWORD}" rsync -av --exclude=".gitkeep" \
    "${SOURCE_DIR}/" "${SSH_TARGET}:${REMOTE_PATH}/"
else
  RSYNC_RSH="${RSYNC_RSH}" rsync -av --exclude=".gitkeep" \
    "${SOURCE_DIR}/" "${SSH_TARGET}:${REMOTE_PATH}/"
fi

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
