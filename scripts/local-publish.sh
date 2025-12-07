#!/usr/bin/env bash

# Copyright (C) 2024 Alberto Gangarossa.
# Pluto is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License
# as published by the Free Software Foundation, version 3.
# See <https://www.gnu.org/licenses/>.

set -euo pipefail

# Wrapper script to automate local Umbrel app manifest updates and optional device sync.
# This script infers all parameters from the channel and service package.json versions.
#
# Usage:
#   scripts/local-publish.sh --channel stable [--sync-to-umbrel]
#   scripts/local-publish.sh --channel beta [--sync-to-umbrel]

SCRIPT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_ROOT"

# Load common functions
SCRIPT_NAME="local-publish"
# shellcheck source=scripts/lib/common.sh
source "${SCRIPT_ROOT}/scripts/lib/common.sh"

AVAILABLE_SERVICES=(backend discovery frontend grafana prometheus)
DOCKER_REGISTRY="${DOCKER_REGISTRY:-ghcr.io/plutomining}"

CHANNEL=""
SYNC_TO_UMBREL=false

usage() {
  cat <<EOF
Usage: $(basename "$0") --channel stable|beta [--sync-to-umbrel]

Automatically update local Umbrel app manifests (umbrel-app.yml and docker-compose.yml)
based on the current service versions in package.json files.

Options:
  --channel stable|beta   Release channel (determines which app to update)
  --sync-to-umbrel       After updating manifests, sync them to the local Umbrel device
  -h, --help             Show this help

Examples:
  # Update pluto (stable) manifests only
  scripts/local-publish.sh --channel stable

  # Update pluto-next (beta) manifests and sync to Umbrel device
  scripts/local-publish.sh --channel beta --sync-to-umbrel
EOF
}


parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --channel)
        [[ -n "${2:-}" ]] || err "--channel requires a value"
        CHANNEL="$2"
        shift 2
        ;;
      --sync-to-umbrel)
        SYNC_TO_UMBREL=true
        shift
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        err "Unknown argument: $1"
        ;;
    esac
  done
}

determine_app_config() {
  case "$CHANNEL" in
    stable)
      APP_ID="pluto"
      APP_DIR="umbrel-apps/pluto"
      ;;
    beta)
      APP_ID="pluto-next"
      APP_DIR="umbrel-apps/pluto-next"
      ;;
    *)
      err "Invalid channel '$CHANNEL'. Must be 'stable' or 'beta'."
      ;;
  esac

  MANIFEST="${APP_DIR}/umbrel-app.yml"
  COMPOSE="${APP_DIR}/docker-compose.yml"

  if [[ ! -f "$MANIFEST" ]] || [[ ! -f "$COMPOSE" ]]; then
    err "Missing manifest or compose file for app '$APP_ID' at '$APP_DIR'"
  fi
}

get_package_version() {
  local service=$1
  if [[ ! -f "$service/package.json" ]]; then
    err "Missing package.json for service '$service'"
  fi
  grep '"version":' "$service/package.json" | sed -E 's/.*"version":\s*"([^"]+)".*/\1/'
}


build_image_refs() {
  local images_map=()

  log "Resolving image versions and digests for channel '$CHANNEL'..."

  for service in "${AVAILABLE_SERVICES[@]}"; do
    if [[ ! -d "$service" ]]; then
      log "Skipping service '$service' (directory not found)"
      continue
    fi

    local version
    version=$(get_package_version "$service")

    local image_tag="${DOCKER_REGISTRY}/pluto-${service}:${version}"
    log "  ${service}: ${version}"

    local sha
    sha=$(get_image_sha "$image_tag")

    local image_ref="${image_tag}@sha256:${sha}"
    images_map+=("${service}=${image_ref}")
  done

  if [[ ${#images_map[@]} -eq 0 ]]; then
    err "No valid services found to update"
  fi

  # Join with commas
  IFS=',' eval 'echo "${images_map[*]}"'
}

main() {
  parse_args "$@"

  if [[ -z "$CHANNEL" ]]; then
    err "--channel is required"
  fi

  command_exists docker || err "docker is required"
  command_exists jq || err "jq is required"
  if ! docker buildx version >/dev/null 2>&1; then
    err "docker buildx is required"
  fi

  determine_app_config

  log "Updating app '$APP_ID' (channel: $CHANNEL)"
  log "Manifest: $MANIFEST"
  log "Compose: $COMPOSE"

  local images_arg
  images_arg=$(build_image_refs)

  log "Calling bump-umbrel-app-version.sh..."
  "${SCRIPT_ROOT}/scripts/bump-umbrel-app-version.sh" \
    --app "$APP_ID" \
    --channel "$CHANNEL" \
    --manifest "$MANIFEST" \
    --compose "$COMPOSE" \
    --images "$images_arg"

  if $SYNC_TO_UMBREL; then
    log "Syncing manifests to Umbrel device..."
    APPS_TO_SYNC="$APP_ID" "${SCRIPT_ROOT}/scripts/sync-umbrel-apps.sh"
  else
    log "Manifests updated. Run 'scripts/sync-umbrel-apps.sh' to push to your Umbrel device."
  fi

  log "Done."
}

main "$@"

