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

NEW_IMAGE_SERVICES=()
NEW_IMAGE_REFS=()

set_new_image() {
  local svc="$1"
  local img="$2"

  local i
  for i in "${!NEW_IMAGE_SERVICES[@]}"; do
    if [[ "${NEW_IMAGE_SERVICES[$i]}" == "$svc" ]]; then
      NEW_IMAGE_REFS[$i]="$img"
      return 0
    fi
  done

  NEW_IMAGE_SERVICES+=("$svc")
  NEW_IMAGE_REFS+=("$img")
}

parse_images() {
  IFS=',' read -r -a pairs <<<"$IMAGES_ARG"
  for pair in "${pairs[@]}"; do
    [[ "$pair" == *"="* ]] || err "Invalid --images entry '$pair' (expected svc=image)"
    local svc="${pair%%=*}"
    local img="${pair#*=}"
    [[ -n "$svc" && -n "$img" ]] || err "Invalid --images entry '$pair'"
    set_new_image "$svc" "$img"
  done
}

get_current_app_version() {
  # expects a line like: version: "1.2.3" or version: "1.2.3-beta.0"
  grep -E '^version:' "$MANIFEST" | sed -E 's/version: "(.*)"/\1/'
}

compute_bundle_fingerprint() {
  local file=$1
  # Extract all service image lines and sort them for stability.
  # Format: service=image-ref
  # Works with any indentation style (spaces or tabs)
  awk '
    $1 ~ /^[a-zA-Z0-9_-]+:$/ { svc=substr($1, 1, length($1)-1) }
    $1 == "image:" && svc != "" {
      img=$2
      gsub("\"", "", img)
      printf "%s=%s\n", svc, img
    }
  ' "$file" | sort | {
    if command -v sha256sum >/dev/null 2>&1; then
      sha256sum
    else
      shasum -a 256
    fi
  } | awk '{print $1}'
}

update_compose_images() {
  local svc img
  for i in "${!NEW_IMAGE_SERVICES[@]}"; do
    svc="${NEW_IMAGE_SERVICES[$i]}"
    img="${NEW_IMAGE_REFS[$i]}"
    # Replace the image: line under the given service.
    # Flexible pattern that works with any indentation level.
    # Range: from service line (with optional leading spaces) to next service or empty line.
    # Preserves indentation of the image: line.
    if [[ "$(uname)" == "Darwin" ]]; then
      # macOS uses BSD sed
      sed -i '' -E "/^[[:space:]]*${svc}:/,/^[[:space:]]*[a-zA-Z0-9_-]+:|^$/s|^( +)image:.*|\\1image: ${img}|" "$COMPOSE"
    else
      # Linux uses GNU sed
      sed -i -E "/^[[:space:]]*${svc}:/,/^[[:space:]]*[a-zA-Z0-9_-]+:|^$/s|^( +)image:.*|\\1image: ${img}|" "$COMPOSE"
    fi
  done
}

get_current_image_ref() {
  local svc=$1
  local file=$2
  # Extract image reference for a service, works with any indentation style
  awk -v svc="$svc" '
    $1 ~ /^[a-zA-Z0-9_-]+:$/ {
      # Extract service name from $1 (e.g., "backend:" -> "backend")
      current_svc=substr($1, 1, length($1)-1)
    }
    $1 == "image:" && current_svc == svc {
      img=$2
      gsub("\"", "", img)
      print img
      exit
    }
  ' "$file"
}

extract_version_from_image_ref() {
  local image_ref="$1"
  # Extract version from image reference like: ghcr.io/plutomining/pluto-backend:1.2.3@sha256:...
  # or ghcr.io/plutomining/pluto-backend:1.2.3-beta.0@sha256:...
  echo "$image_ref" | sed -E 's|.*:([0-9]+\.[0-9]+\.[0-9]+(-[^@]+)?)@.*|\1|' | head -1
}

extract_version_from_compose() {
  local compose_file="$1"
  local service="$2"
  # Extract version from image line like: image: ghcr.io/plutomining/pluto-backend:1.1.2@sha256:...
  # Uses POSIX-compliant [[:space:]] character class for portability
  grep -A 20 "^[[:space:]]*${service}:" "$compose_file" 2>/dev/null | \
    grep -E "^[[:space:]]+image:" | \
    sed -E 's|.*:([0-9]+\.[0-9]+\.[0-9]+(-[^@]+)?)@.*|\1|' | \
    head -1
}

# Compare two semver versions and return the change type: "major", "minor", "patch", or "none"
compare_semver_change() {
  local old_version="$1"
  local new_version="$2"

  # Remove any pre-release suffixes for comparison
  local old_base="${old_version%%-*}"
  local new_base="${new_version%%-*}"

  if [[ "$old_base" == "$new_base" ]]; then
    echo "none"
    return 0
  fi

  # Parse versions
  local old_major old_minor old_patch
  local new_major new_minor new_patch

  IFS='.' read -r old_major old_minor old_patch <<<"$old_base"
  IFS='.' read -r new_major new_minor new_patch <<<"$new_base"

  if [[ "$old_major" != "$new_major" ]]; then
    echo "major"
  elif [[ "$old_minor" != "$new_minor" ]]; then
    echo "minor"
  elif [[ "$old_patch" != "$new_patch" ]]; then
    echo "patch"
  else
    echo "none"
  fi
}

compare_fingerprints() {
  local cur new
  cur="$(compute_bundle_fingerprint "$COMPOSE")"

  # Create a temp copy with new images applied to compute the target fingerprint.
  local tmp
  tmp="$(mktemp)"
  cp "$COMPOSE" "$tmp"
  local svc img
  local has_changes=false
  
  # Check if any service image references actually differ
  # This is the primary check - if image references differ, we should update
  for i in "${!NEW_IMAGE_SERVICES[@]}"; do
    svc="${NEW_IMAGE_SERVICES[$i]}"
    img="${NEW_IMAGE_REFS[$i]}"
    local current_img
    current_img=$(get_current_image_ref "$svc" "$COMPOSE")
    
    if [[ -z "$current_img" ]]; then
      # Service not found in compose file - this is a change
      has_changes=true
      log "Service $svc not found in compose file - will add: $img"
    elif [[ "$current_img" != "$img" ]]; then
      # Image reference differs - this is a change
      has_changes=true
      log "Service $svc image will change: $current_img -> $img"
    fi
    
    if [[ "$(uname)" == "Darwin" ]]; then
      # macOS uses BSD sed
      sed -i '' -E "/^[[:space:]]*${svc}:/,/^[[:space:]]*[a-zA-Z0-9_-]+:|^$/s|^( +)image:.*|\\1image: ${img}|" "$tmp"
    else
      # Linux uses GNU sed
      sed -i -E "/^[[:space:]]*${svc}:/,/^[[:space:]]*[a-zA-Z0-9_-]+:|^$/s|^( +)image:.*|\\1image: ${img}|" "$tmp"
    fi
  done
  
  new="$(compute_bundle_fingerprint "$tmp")"
  rm -f "$tmp"

  # If we have explicit image changes, always treat as different
  # This ensures version tags are updated even if SHA256 is identical (e.g., due to Docker caching)
  if [[ "$has_changes" == "true" ]]; then
    if [[ "$cur" == "$new" ]]; then
      log "Warning: Image references differ but bundle fingerprint is identical"
      log "This means the new image has the same SHA256 as the existing one."
      log "Possible causes:"
      log "  1. Docker layer caching - code changes didn't affect final image layers"
      log "  2. The compose file already contains the exact same image reference"
      log "  3. Registry returned cached/stale manifest data"
      log "Proceeding with update anyway since image references differ."
    fi
    echo "different"
  elif [[ "$cur" == "$new" ]]; then
    echo "same"
  else
    echo "different"
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
    log "Comparison details:"
    for i in "${!NEW_IMAGE_SERVICES[@]}"; do
      local svc="${NEW_IMAGE_SERVICES[$i]}"
      local target_img="${NEW_IMAGE_REFS[$i]}"
      local current_img
      current_img=$(get_current_image_ref "$svc" "$COMPOSE" 2>/dev/null || echo "(not found)")
      if [[ "$current_img" == "$target_img" ]]; then
        log "  $svc: unchanged ($current_img)"
      else
        log "  $svc: $current_img -> $target_img"
      fi
    done
    log "All image references match exactly (same tag and SHA256)."
    exit 0
  fi

  # Step 1: Extract current versions from docker-compose.yml
  log "Extracting current versions from docker-compose.yml..."
  local current_versions=()
  local new_versions=()
  local version_changes=()
  local svc current_version new_version change_type

  for i in "${!NEW_IMAGE_SERVICES[@]}"; do
    svc="${NEW_IMAGE_SERVICES[$i]}"
    current_version=$(extract_version_from_compose "$COMPOSE" "$svc")
    if [[ -z "$current_version" || "$current_version" == "unknown" ]]; then
      err "Could not extract version for service ${svc} from ${COMPOSE}"
    fi
    current_versions[$i]="$current_version"
    log "  ${svc}: current version ${current_version}"
  done

  # Step 2: Extract new versions from image references
  log ""
  log "Extracting new versions from image references..."
  for i in "${!NEW_IMAGE_SERVICES[@]}"; do
    svc="${NEW_IMAGE_SERVICES[$i]}"
    local img_ref="${NEW_IMAGE_REFS[$i]}"
    new_version=$(extract_version_from_image_ref "$img_ref")
    if [[ -z "$new_version" ]]; then
      err "Could not extract version from image reference for service ${svc}: ${img_ref}"
    fi
    new_versions[$i]="$new_version"
    current_version="${current_versions[$i]}"

    # Determine change type
    change_type=$(compare_semver_change "$current_version" "$new_version")
    version_changes[$i]="$change_type"

    if [[ "$change_type" != "none" ]]; then
      log "  ${svc}: ${current_version} -> ${new_version} (${change_type} change)"
    else
      log "  ${svc}: ${current_version} (no change)"
    fi
  done

  # Step 3: Determine highest semver change type across all services
  log ""
  local highest_change="none"
  for i in "${!NEW_IMAGE_SERVICES[@]}"; do
    change_type="${version_changes[$i]}"
    case "$change_type" in
      major)
        highest_change="major"
        ;;
      minor)
        if [[ "$highest_change" != "major" ]]; then
          highest_change="minor"
        fi
        ;;
      patch)
        if [[ "$highest_change" != "major" && "$highest_change" != "minor" ]]; then
          highest_change="patch"
        fi
        ;;
    esac
  done

  # Step 4: Calculate new app version based on highest change
  local current_app_version next_version
  current_app_version=$(get_current_app_version)
  if [[ -z "$current_app_version" ]]; then
    err "Could not determine current app version from $MANIFEST"
  fi

  # If bundle changed but no version changes, still bump patch
  if [[ "$highest_change" == "none" ]]; then
    log ""
    log "Bundle changed (digests updated) but versions unchanged. Bumping patch version."
    highest_change="patch"
  else
    log ""
    log "Highest change type: ${highest_change}"
  fi

  # Parse current app version and bump accordingly
  local major minor patch
  IFS='.' read -r major minor patch <<<"${current_app_version%%-*}"

  case "$highest_change" in
    major)
      major=$((major + 1))
      minor=0
      patch=0
      ;;
    minor)
      minor=$((minor + 1))
      patch=0
      ;;
    patch)
      patch=$((patch + 1))
      ;;
  esac

  if [[ "$CHANNEL" == "stable" ]]; then
    next_version="${major}.${minor}.${patch}"
  else
    # For beta, check if base version changed
    local current_base="${current_app_version%%-*}"
    local new_base="${major}.${minor}.${patch}"

    if [[ "$current_base" == "$new_base" ]]; then
      # Base version unchanged - increment beta number
      local beta_suffix="${current_app_version#*-}"
      if [[ "$beta_suffix" =~ ^beta\.([0-9]+)$ ]]; then
        local beta_num="${BASH_REMATCH[1]}"
        beta_num=$((beta_num + 1))
        next_version="${major}.${minor}.${patch}-beta.${beta_num}"
      else
        # No beta suffix found, start at beta.0
        next_version="${major}.${minor}.${patch}-beta.0"
      fi
    else
      # Base version changed - reset beta to 0
      next_version="${major}.${minor}.${patch}-beta.0"
    fi
  fi

  log ""
  log "Current app version: $current_app_version"
  log "New app version:     $next_version"

  # Update manifest version
  if [[ "$(uname)" == "Darwin" ]]; then
    sed -i '' -E "s/version: \".*\"/version: \"${next_version}\"/" "$MANIFEST"
    sed -i '' -E "s/Version .*/Version ${next_version}/" "$MANIFEST" || true
  else
    sed -i -E "s/version: \".*\"/version: \"${next_version}\"/" "$MANIFEST"
    sed -i -E "s/Version .*/Version ${next_version}/" "$MANIFEST" || true
  fi

  # Update root package.json version to match app version
  local root_package_json="${SCRIPT_ROOT}/package.json"
  if [[ -f "$root_package_json" ]]; then
    if [[ "$(uname)" == "Darwin" ]]; then
      # macOS uses BSD sed
      sed -i '' -E "s/\"version\": \"[^\"]+\"/\"version\": \"${next_version}\"/" "$root_package_json"
    else
      # Linux uses GNU sed
      sed -i -E "s/\"version\": \"[^\"]+\"/\"version\": \"${next_version}\"/" "$root_package_json"
    fi
    log "Updated root package.json version to ${next_version}"
  fi

  # Update compose images
  update_compose_images

  log "Updated $MANIFEST and $COMPOSE for app '$APP' ($CHANNEL)."
}

main "$@"
