#!/usr/bin/env bash

# Copyright (C) 2024 Alberto Gangarossa.
# Pluto is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License
# as published by the Free Software Foundation, version 3.
# See <https://www.gnu.org/licenses/>.

set -euo pipefail

# Small helper to bump Umbrel app versions based on image bundle changes.
# It does NOT build/push images; it only edits umbrel-app.yml and docker-compose.yml.
#
# Usage example:
#   scripts/bump-umbrel-app-version.sh \
#     --app pluto \
#     --channel stable \
#     --manifest umbrel-apps/pluto/umbrel-app.yml \
#     --compose umbrel-apps/pluto/docker-compose.yml \
#     --images "backend=ghcr.io/plutomining/pluto-backend:1.2.3@sha256:...,frontend=..."
#

SCRIPT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Load common functions
SCRIPT_NAME="bump-umbrel-app-version"
# shellcheck source=scripts/lib/common.sh
source "${SCRIPT_ROOT}/scripts/lib/common.sh"

APP=""
CHANNEL=""
MANIFEST=""
COMPOSE=""
IMAGES_ARG=""

usage() {
  cat <<EOF
Usage: $(basename "$0") --app pluto|pluto-next --channel stable|beta \\
       --manifest PATH --compose PATH --images "svc=image,..."

Options:
  --app           Target app id inside this repo (pluto | pluto-next)
  --channel       Release channel (stable | beta)
  --manifest      Path to umbrel-app.yml to update
  --compose       Path to docker-compose.yml to update
  --images        Comma-separated list of service=image refs to pin
                  Example: "backend=ghcr.io/...@sha256:...,frontend=ghcr.io/...@sha256:..."
  -h, --help      Show this help
EOF
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --app)
        APP="${2:-}"
        shift 2
        ;;
      --channel)
        CHANNEL="${2:-}"
        shift 2
        ;;
      --manifest)
        MANIFEST="${2:-}"
        shift 2
        ;;
      --compose)
        COMPOSE="${2:-}"
        shift 2
        ;;
      --images)
        IMAGES_ARG="${2:-}"
        shift 2
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

ensure_args() {
  [[ -n "$APP" ]] || err "--app is required"
  [[ "$APP" == "pluto" || "$APP" == "pluto-next" ]] || err "--app must be pluto or pluto-next"

  [[ -n "$CHANNEL" ]] || err "--channel is required"
  [[ "$CHANNEL" == "stable" || "$CHANNEL" == "beta" ]] || err "--channel must be stable or beta"

  [[ -n "$MANIFEST" && -f "$MANIFEST" ]] || err "manifest file '$MANIFEST' not found"
  [[ -n "$COMPOSE" && -f "$COMPOSE" ]] || err "compose file '$COMPOSE' not found"

  [[ -n "$IMAGES_ARG" ]] || err "--images is required"
}

declare -A NEW_IMAGES

parse_images() {
  IFS=',' read -r -a pairs <<<"$IMAGES_ARG"
  for pair in "${pairs[@]}"; do
    [[ "$pair" == *"="* ]] || err "Invalid --images entry '$pair' (expected svc=image)"
    local svc="${pair%%=*}"
    local img="${pair#*=}"
    [[ -n "$svc" && -n "$img" ]] || err "Invalid --images entry '$pair'"
    NEW_IMAGES["$svc"]="$img"
  done
}

get_current_app_version() {
  # expects a line like: version: "1.2.3" or version: "1.2.3-beta.0"
  grep -E '^version:' "$MANIFEST" | sed -E 's/version: "(.*)"/\1/'
}

compute_bundle_fingerprint() {
  local file=$1
  local -a entries=()

  # Extract all service image lines and sort them for stability.
  # Format: service=image-ref
  awk '
    $1 ~ /^[a-zA-Z0-9_-]+:$/ { svc=substr($1, 1, length($1)-1) }
    $1 == "image:" && svc != "" {
      img=$2
      gsub("\"", "", img)
      printf "%s=%s\n", svc, img
    }
  ' "$file" | sort
}

update_compose_images() {
  local svc img
  for svc in "${!NEW_IMAGES[@]}"; do
    img="${NEW_IMAGES[$svc]}"
    # Replace the image: line under the given service.
    # This is a simple sed-based replacement; it assumes the standard
    # structure generated/maintained by this project.
    sed -i -E "/^${svc}:/,/^[a-zA-Z0-9_-]+:|^$/s|^( +)image:.*|\\1image: ${img}|" "$COMPOSE"
  done
}

compare_fingerprints() {
  local cur new
  cur="$(compute_bundle_fingerprint "$COMPOSE" | sha256sum | awk '{print $1}')"

  # Create a temp copy with new images applied to compute the target fingerprint.
  local tmp
  tmp="$(mktemp)"
  cp "$COMPOSE" "$tmp"
  local svc img
  for svc in "${!NEW_IMAGES[@]}"; do
    img="${NEW_IMAGES[$svc]}"
    sed -i -E "/^${svc}:/,/^[a-zA-Z0-9_-]+:|^$/s|^( +)image:.*|\\1image: ${img}|" "$tmp"
  done
  new="$(compute_bundle_fingerprint "$tmp" | sha256sum | awk '{print $1}')"
  rm -f "$tmp"

  if [[ "$cur" == "$new" ]]; then
    echo "same"
  else
    echo "different"
  fi
}

bump_stable_version() {
  local current="$1"
  local base="$2"

  if [[ -z "$current" ]]; then
    echo "$base"
    return
  fi

  # Compare semver-like X.Y.Z using sort -V
  local higher
  higher=$(printf "%s\n%s\n" "$current" "$base" | sort -V | tail -n1)
  if [[ "$higher" == "$base" && "$base" != "$current" ]]; then
    echo "$base"
  else
    # same base (or base < current) -> bump patch
    local major minor patch
    IFS='.' read -r major minor patch <<<"$current"
    patch=$((patch + 1))
    echo "${major}.${minor}.${patch}"
  fi
}

bump_beta_version() {
  local current="$1"
  local base="$2"

  # current expected: X.Y.Z-beta.N
  local cur_base cur_suffix
  cur_base="${current%%-*}"
  cur_suffix="${current#*-}"

  if [[ "$cur_base" != "$base" || -z "$cur_suffix" ]]; then
    echo "${base}-beta.0"
    return
  fi

  if [[ "$cur_suffix" =~ ^beta\.([0-9]+)$ ]]; then
    local n="${BASH_REMATCH[1]}"
    n=$((n + 1))
    echo "${base}-beta.${n}"
  else
    echo "${base}-beta.0"
  fi
}

main() {
  parse_args "$@"
  ensure_args
  parse_images

  local diff
  diff=$(compare_fingerprints)
  if [[ "$diff" == "same" ]]; then
    log "Bundle unchanged; leaving app version and compose file as-is."
    exit 0
  fi

  local current_version
  current_version=$(get_current_app_version)
  if [[ -z "$current_version" ]]; then
    err "Could not determine current app version from $MANIFEST"
  fi

  # Derive base version from current_version for now (you can extend this later
  # to accept an explicit --base-version if desired).
  local base_version
  if [[ "$CHANNEL" == "stable" ]]; then
    base_version="$current_version"
  else
    base_version="${current_version%%-*}"
  fi

  local next_version
  if [[ "$CHANNEL" == "stable" ]]; then
    next_version="$(bump_stable_version "$current_version" "$base_version")"
  else
    next_version="$(bump_beta_version "$current_version" "$base_version")"
  fi

  log "Current app version: $current_version"
  log "New app version:     $next_version"

  # Update manifest version
  sed -i -E "s/version: \".*\"/version: \"${next_version}\"/" "$MANIFEST"
  sed -i -E "s/Version .*/Version ${next_version}/" "$MANIFEST" || true

  # Update compose images
  update_compose_images

  log "Updated $MANIFEST and $COMPOSE for app '$APP' ($CHANNEL)."
}

main "$@"
