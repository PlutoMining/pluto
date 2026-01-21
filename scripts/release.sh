#!/usr/bin/env bash

# Copyright (C) 2024 Alberto Gangarossa.
# Pluto is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License
# as published by the Free Software Foundation, version 3.
# See <https://www.gnu.org/licenses/>.

set -euo pipefail

SCRIPT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_ROOT"

# Load common functions
SCRIPT_NAME="release"
# shellcheck source=scripts/lib/common.sh
source "${SCRIPT_ROOT}/scripts/lib/common.sh"
# shellcheck source=scripts/lib/semver.sh
source "${SCRIPT_ROOT}/scripts/lib/semver.sh"

AVAILABLE_SERVICES=(backend discovery frontend prometheus)
DOCKER_REGISTRY="${DOCKER_REGISTRY:-ghcr.io/plutomining}"

SKIP_LOGIN=false
BUMP_VERSION=false
UPDATE_MANIFESTS=false
SYNC_TO_UMBREL=false
DRY_RUN=false
SKIP_CHANGELOG=false
VERBOSE=false
QUIET=false
CUSTOM_SERVICES=()
DIFF_BASE="${RELEASE_DIFF_BASE:-HEAD~1}"

APP_ID="pluto"
APP_DIR="umbrel-apps/pluto"
MANIFEST="${APP_DIR}/umbrel-app.yml"
COMPOSE="${APP_DIR}/docker-compose.yml"

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Build and push stable Docker images for Pluto (pluto app only), using per-service
semantic versioning and optionally updating Umbrel manifests.

Options:
  --skip-login                 Skip Docker login prompt
  --bump-version               Automatically bump package.json versions per service based on git history
                               (major / minor / patch via scripts/lib/semver.sh)
  --update-manifests           Update pluto Umbrel app manifests after building images
  --sync-to-umbrel             Sync manifests to Umbrel device (implies --update-manifests)
  --skip-changelog             Skip automatic changelog generation
  --services "svc1,svc2"       Comma-separated list of services to release (override auto-detection)
  --diff-base <ref>            Git ref to detect changes from (default: HEAD~1)
  --verbose                    Enable verbose logging
  --quiet                      Minimal output (errors only)
  --dry-run                    Print actions without building/pushing or editing files
  -h, --help                   Show this help

Examples:
  # Build stable images with interactive version prompts
  scripts/release.sh

  # Build, bump versions via SemVer, update manifests, and sync to device
  scripts/release.sh --bump-version --update-manifests --sync-to-umbrel
EOF
}

# Function to get the current version from the package.json file
get_current_version() {
  local service=$1
  grep '"version":' "$service/package.json" | sed -E 's/.*"version":\s*"([^"]+)".*/\1/'
}

# Function to check the current Git branch
check_git_branch() {
  local branch
  branch=$(git rev-parse --abbrev-ref HEAD)
  if [[ "$branch" != "main" ]]; then
    err "You must be on the 'main' branch to release."
  fi
}

# Function to detect which services have changed
detect_changed_services() {
  command_exists git || err "git is required"
  git fetch -q origin || true
  
  # Try to detect changes, but handle case where DIFF_BASE might not exist
  if ! git rev-parse --verify "${DIFF_BASE}" >/dev/null 2>&1; then
    # If DIFF_BASE doesn't exist, check if we can use origin/main
    if git rev-parse --verify "origin/main" >/dev/null 2>&1; then
      DIFF_BASE="origin/main"
    else
      # If nothing works, return all services (fallback behavior)
      log_warning "Could not determine diff base '${DIFF_BASE}'. Processing all services."
      echo "${AVAILABLE_SERVICES[@]}"
      return 0
    fi
  fi

  git diff --name-only "${DIFF_BASE}...HEAD" \
    | awk -F/ '
      /^(backend|discovery|frontend|prometheus)\// {print $1}
    ' \
    | sort -u
}

# Function to update docker-compose.release.local.yml with new image references
update_local_compose() {
  local service=$1
  local new_version=$2
  local image_sha=$3
  local registry=$4
  local compose_file="docker-compose.release.local.yml"

  # Validate inputs
  if [[ -z "$service" ]] || [[ -z "$new_version" ]] || [[ -z "$image_sha" ]] || [[ -z "$registry" ]]; then
    err "update_local_compose called with invalid parameters"
  fi

  if [[ ! -f "$compose_file" ]]; then
    log "Warning: File $compose_file not found, skipping..."
    return 0
  fi

  local new_image="${registry}/pluto-${service}:${new_version}@sha256:${image_sha}"

  # Update the image line for the service
  # Match GitHub registry format (ghcr.io/plutomining/pluto-SERVICE) with any version
  # Also match broken references with partial @ or @sha256:
  if [[ "$(uname)" == "Darwin" ]]; then
    # macOS uses BSD sed
    sed -i '' -E "s|ghcr\.io/plutomining/pluto-${service}:[^@[:space:]]+(@sha256:[^[:space:]]*)?(@[^[:space:]]*)?|${new_image}|g" "$compose_file"
  else
    # Linux uses GNU sed
    sed -i -E "s|ghcr\.io/plutomining/pluto-${service}:[^@[:space:]]+(@sha256:[^[:space:]]*)?(@[^[:space:]]*)?|${new_image}|g" "$compose_file"
  fi
}

###############################################################################
# Version bumping (uses semver bump level: major / minor / patch)
###############################################################################

bump_package_version() {
  local service=$1
  local bump_level=$2  # major|minor|patch
  local package_file="$service/package.json"
  local current_version
  current_version=$(get_current_version "$service")

  local new_version

  if [[ "$current_version" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
    # Stable version - bump according to bump_level
    local major="${BASH_REMATCH[1]}"
    local minor="${BASH_REMATCH[2]}"
    local patch="${BASH_REMATCH[3]}"

    case "$bump_level" in
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
      *)
        err "Unsupported bump level '$bump_level' for service '$service'"
        ;;
    esac

    new_version="${major}.${minor}.${patch}"
  elif [[ "$current_version" =~ ^([0-9]+\.[0-9]+\.[0-9]+)- ]]; then
    # Prerelease version - strip prerelease suffix and bump base according to bump_level
    local base="${BASH_REMATCH[1]}"
    local major minor patch
    IFS='.' read -r major minor patch <<<"$base"

    case "$bump_level" in
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
      *)
        err "Unsupported bump level '$bump_level' for service '$service'"
        ;;
    esac

    new_version="${major}.${minor}.${patch}"
  else
    err "Cannot parse version '$current_version' for service '$service'"
  fi

  if $DRY_RUN; then
    log "[dry-run] Would bump $service version: $current_version -> $new_version (level: $bump_level)"
    echo "$new_version"
    return
  fi

  # Update package.json
  if [[ "$(uname)" == "Darwin" ]]; then
    # macOS uses BSD sed
    sed -i '' "s/\"version\": \"${current_version}\"/\"version\": \"${new_version}\"/" "$package_file"
  else
    # Linux uses GNU sed
    sed -i "s/\"version\": \"${current_version}\"/\"version\": \"${new_version}\"/" "$package_file"
  fi

  log "Bumped $service version: $current_version -> $new_version (level: $bump_level)"
  echo "$new_version"
}


parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --skip-login)
        SKIP_LOGIN=true
        shift
        ;;
      --bump-version)
        BUMP_VERSION=true
        shift
        ;;
      --update-manifests)
        UPDATE_MANIFESTS=true
        shift
        ;;
      --sync-to-umbrel)
        SYNC_TO_UMBREL=true
        shift
        ;;
      --skip-changelog)
        SKIP_CHANGELOG=true
        shift
        ;;
      --verbose)
        VERBOSE=true
        shift
        ;;
      --quiet)
        QUIET=true
        shift
        ;;
      --dry-run)
        DRY_RUN=true
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

generate_changelog() {
  if $SKIP_CHANGELOG; then
    log "Skipping changelog generation (--skip-changelog flag set)"
    return 0
  fi

  log_step "Generating changelog from conventional commits..."

  if $DRY_RUN; then
    log "[dry-run] Would generate changelog using generate-changelog.sh --skip-commit"
    return 0
  fi

  # Use the dedicated changelog script with --skip-commit to avoid commit failures
  # on protected branches. All changes will be left uncommitted for PR workflow.
  if "${SCRIPT_ROOT}/scripts/generate-changelog.sh" --skip-commit; then
    if [[ -f "CHANGELOG.md" ]]; then
      log_success "Changelog generated successfully (not committed)"
    else
      log "No changes detected - changelog is up to date"
    fi
  else
    log_warning "Changelog generation failed. Continuing without changelog update."
    log_warning "Note: With squash-and-merge, ensure PR titles follow conventional commits."
  fi
}

main() {
  parse_args "$@"

  # Set up error trap
  setup_error_trap

  # If --sync-to-umbrel is set, automatically enable --update-manifests
  if $SYNC_TO_UMBREL && ! $UPDATE_MANIFESTS; then
    UPDATE_MANIFESTS=true
  fi

  # Load .env file if present
  load_env_file "$SCRIPT_ROOT"

  # Set verbose mode
  if $VERBOSE; then
    export DEBUG=true
    export LOG_TIMESTAMP=true
  fi

  # Pre-flight checks
  log_step "Running pre-flight checks..."

  command_exists docker || err "docker is required"
  command_exists jq || err "jq is required"
  if ! docker buildx version >/dev/null 2>&1; then
    err "docker buildx is required"
  fi

  # Check Docker daemon
  if ! check_docker_daemon; then
    err "Docker daemon is not running. Please start Docker and try again."
  fi

  # Check disk space (require at least 5GB free)
  if ! check_disk_space 5; then
    log_warning "Low disk space detected. Build may fail."
  fi

  # Check git branch - must be on main for stable releases
  check_git_branch

  # Validate git state (allow uncommitted changes but warn)
  if ! validate_git_state --allow-uncommitted; then
    log_warning "You have uncommitted changes. Consider committing before release."
  fi

  # Validate service versions
  validate_service_versions "${AVAILABLE_SERVICES[@]}"

  # Verify manifest files exist
  if [[ ! -f "$MANIFEST" ]] || [[ ! -f "$COMPOSE" ]]; then
    err "Missing manifest or compose file for app '$APP_ID' at '$APP_DIR'"
  fi

  # Only perform Docker login if the skip login flag is not set
  if [[ "$SKIP_LOGIN" == false ]] && ! $DRY_RUN; then
    # Use credentials from .env if available, otherwise prompt
    if [[ -z "${GITHUB_USERNAME:-}" ]]; then
      log "Logging in to GitHub Container Registry (ghcr.io)..."
      echo "Enter your GitHub username:"
      read -r GITHUB_USERNAME
    fi
    if [[ -z "${GITHUB_TOKEN:-}" ]]; then
      echo "Enter your GitHub Personal Access Token (PAT) with 'write:packages' scope:"
      echo "Create one at: https://github.com/settings/tokens"
      read -rs GITHUB_TOKEN
      echo
    else
      log "Using GitHub credentials from .env file"
    fi
    
    echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_USERNAME" --password-stdin
    
    if [[ $? -ne 0 ]]; then
      err "Docker login failed. Please check your credentials."
    fi
  elif $DRY_RUN; then
    log "[dry-run] Would prompt for Docker login"
  else
    log "Skipping Docker login..."
  fi

  # Determine which services to process
  local target_services=()
  if [[ ${#CUSTOM_SERVICES[@]} -gt 0 ]]; then
    target_services=("${CUSTOM_SERVICES[@]}")
    log "Using custom services: ${target_services[*]}"
  else
    mapfile -t target_services < <(detect_changed_services)
    if [[ ${#target_services[@]} -eq 0 ]]; then
      log_warning "No changed services detected since ${DIFF_BASE}."
      log_warning "This might mean:"
      log_warning "  1. No services were modified in recent commits"
      log_warning "  2. The diff base '${DIFF_BASE}' is incorrect"
      log_warning ""
      log_warning "Use --services to explicitly specify services, or --diff-base to change the comparison point."
      log_warning "Processing all services as fallback..."
      target_services=("${AVAILABLE_SERVICES[@]}")
    else
      log "Detected changed services: ${target_services[*]}"
    fi
  fi

  # Get and set versions for each service
  declare -A service_versions
  declare -A service_current_versions
  for service in "${target_services[@]}"; do
    if [[ ! -d "$service" ]]; then
      log "Skipping service '$service' (directory not found)"
      continue
    fi

    local current_version
    current_version=$(get_current_version "$service")
    service_current_versions["$service"]="$current_version"
    
    local new_version
    if $BUMP_VERSION; then
      # Automatically bump version based on semantic versioning rules inferred
      # from git log for this service between DIFF_BASE and HEAD.
      local bump_level
      bump_level=$(determine_bump_level_for_service "$service" "$DIFF_BASE")
      if [[ "$bump_level" == "none" ]]; then
        # No commits touching this service – in practice this should not happen
        # for services in target_services, but fall back to patch if it does.
        bump_level="patch"
      fi
      new_version=$(bump_package_version "$service" "$bump_level")
    else
      if $DRY_RUN; then
        log "[dry-run] Would prompt for version for $service (current: $current_version)"
        new_version=$current_version
      else
        # Interactive prompt
        echo "Current version for $service is $current_version. Enter the new version (press Enter to keep $current_version):"
        read -r new_version
        if [[ -z "$new_version" ]]; then
          new_version=$current_version
        fi
      fi
    fi
    
    service_versions["$service"]="$new_version"
  done

  # Build and publish images for each service
  for service in "${target_services[@]}"; do
    if [[ ! -v service_versions["$service"] ]]; then
      continue
    fi
    
    local new_version="${service_versions[$service]}"
    local current_version="${service_current_versions[$service]}"

    # Skip build if version hasn't changed
    if [[ "$new_version" == "$current_version" ]]; then
      log "Skipping Docker build for $service as the version has not changed ($current_version)."
      if $DRY_RUN; then
        log "[dry-run] Would skip build for $service (version unchanged: $current_version)"
      fi
      continue
    fi

    if $DRY_RUN; then
      log "[dry-run] Would build docker image for $service with version $new_version"
    else
      log_progress "Building Docker image for $service"
      
      # Check if image already exists
      local image_tag="${DOCKER_REGISTRY}/pluto-${service}:${new_version}"
      if image_exists "$image_tag"; then
        log_warning "Image $image_tag already exists in registry. Skipping build."
        log_progress_done
        continue
      fi

      # Build and push both version and latest tags in a single command to avoid race conditions
      if retry_command 2 docker buildx build --platform linux/amd64,linux/arm64 \
          -t "${DOCKER_REGISTRY}/pluto-${service}:${new_version}" \
          -t "${DOCKER_REGISTRY}/pluto-${service}:latest" \
          -f "$service/Dockerfile" . --push; then
        log_progress_done
        log_success "Built and pushed $service:$new_version"
      else
        log_progress_fail
        err "Failed to build and push image for $service after retries"
      fi
    fi
  done

  if $DRY_RUN; then
    log "[dry-run] Would build and push stable images for services: ${AVAILABLE_SERVICES[*]}"
  else
    log "Stable images built and pushed for services: ${AVAILABLE_SERVICES[*]}"
  fi

  # Update docker-compose.release.local.yml with new image references
  log "Updating docker-compose.release.local.yml..."
  for service in "${target_services[@]}"; do
    if [[ ! -v service_versions["$service"] ]]; then
      continue
    fi
    
    local version="${service_versions[$service]}"
    local image_tag="${DOCKER_REGISTRY}/pluto-${service}:${version}"
    
    if $DRY_RUN; then
      log "[dry-run] Would update docker-compose.release.local.yml for $service with ${image_tag}@sha256:dry-run-sha"
    else
      local sha
      # Get SHA for the image (either newly built or existing)
      if ! sha=$(get_image_sha_safe "$image_tag"); then
        log "Warning: Could not retrieve SHA for ${image_tag}. Image may not exist in registry. Skipping compose file update for $service."
        continue
      fi
      update_local_compose "$service" "$version" "$sha" "$DOCKER_REGISTRY"
      log "Updated docker-compose.release.local.yml for $service"
    fi
  done

  # Update manifests if requested
  if $UPDATE_MANIFESTS || $SYNC_TO_UMBREL; then
    log "Updating $APP_ID manifests..."

    # Build image refs string for bump-umbrel-app-version.sh
    local images_arg=()
    for service in "${target_services[@]}"; do
      if [[ ! -v service_versions["$service"] ]]; then
        continue
      fi
      
      local version="${service_versions[$service]}"
      local image_tag="${DOCKER_REGISTRY}/pluto-${service}:${version}"
      
      if $DRY_RUN; then
        log "[dry-run] Would resolve SHA for ${image_tag}"
        images_arg+=("${service}=${image_tag}@sha256:dry-run-sha")
      else
        local sha
        sha=$(get_image_sha "$image_tag")
        local image_ref="${image_tag}@sha256:${sha}"
        images_arg+=("${service}=${image_ref}")
      fi
    done

    # Join with commas
    local images_string
    IFS=',' eval 'images_string="${images_arg[*]}"'

    if $DRY_RUN; then
      log "[dry-run] Would call bump-umbrel-app-version.sh with: ${images_string}"
    else
      "${SCRIPT_ROOT}/scripts/bump-umbrel-app-version.sh" \
        --app "$APP_ID" \
        --channel stable \
        --manifest "$MANIFEST" \
        --compose "$COMPOSE" \
        --images "$images_string"
    fi

    # Sync to Umbrel if requested
    if $SYNC_TO_UMBREL; then
      if $DRY_RUN; then
        log "[dry-run] Would sync manifests to Umbrel device"
      else
        log "Syncing manifests to Umbrel device..."
        APPS_TO_SYNC="pluto" "${SCRIPT_ROOT}/scripts/sync-umbrel-apps.sh"
      fi
    fi
  fi

  # Generate changelog automatically after successful release
  if ! $DRY_RUN; then
    generate_changelog
    
    # Inform user about uncommitted changes for PR workflow
    if ! $SKIP_CHANGELOG && [[ -f "CHANGELOG.md" ]]; then
      # Get the new version from the first service that was updated
      local release_version=""
      for service in "${target_services[@]}"; do
        if [[ -v service_versions["$service"] ]]; then
          release_version="${service_versions[$service]}"
          break
        fi
      done
      
      log ""
      log "Release completed successfully!"
      log "All changes have been left uncommitted for PR workflow:"
      log "  - package.json files (version bumps)"
      if $UPDATE_MANIFESTS; then
        log "  - umbrel-app.yml and docker-compose.yml (manifest updates)"
      fi
      log "  - CHANGELOG.md (changelog updates)"
      log ""
      if [[ -n "$release_version" ]]; then
        log "Next steps:"
        log "  1. Create a branch: git checkout -b chore/release-v${release_version}"
        log "  2. Commit changes: git add . && git commit -m 'chore(release): bump versions to v${release_version}'"
        log "  3. Push and create PR: git push origin chore/release-v${release_version}"
      else
        log "Next steps:"
        log "  1. Create a branch: git checkout -b chore/release-$(date +%Y%m%d)"
        log "  2. Commit changes: git add . && git commit -m 'chore(release): update release files'"
        log "  3. Push and create PR: git push origin chore/release-$(date +%Y%m%d)"
      fi
    fi
  fi

  # Print summary
  if ! $QUIET; then
    local summary_items=()
    for service in "${target_services[@]}"; do
      if [[ -v service_versions["$service"] ]]; then
        local version="${service_versions[$service]}"
        summary_items+=("$service: v$version")
      fi
    done
    if [[ ${#summary_items[@]} -gt 0 ]]; then
      print_summary "${summary_items[@]}"
    fi
  fi
}

main "$@"
