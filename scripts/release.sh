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
DIFF_BASE=""  # Will be determined dynamically if not explicitly set
EXPLICIT_DIFF_BASE=""  # Set if user explicitly provides --diff-base

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
  --diff-base <ref>            Git ref to detect changes from (default: auto-detect last release tag)
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
  # Avoid PCRE-only escapes (e.g. \s) for portability across BSD/GNU sed.
  grep -m 1 '"version":' "$service/package.json" | sed -E 's/.*"version":[[:space:]]*"([^"]+)".*/\1/'
}

# Function to check the current Git branch
check_git_branch() {
  local branch
  branch=$(git rev-parse --abbrev-ref HEAD)
  if [[ "$branch" != "main" ]]; then
    err "You must be on the 'main' branch to release."
  fi
}

# Function to find the last release tag
# This is important for squash-and-merge workflows where HEAD~1 only shows
# the single squash commit. By comparing against the last release tag, we
# can properly evaluate all changes since the last release.
find_last_release_tag() {
  command_exists git || err "git is required"

  # Fetch tags to ensure we have the latest
  git fetch --tags origin 2>/dev/null || git fetch --tags 2>/dev/null || true

  # Look for tags matching common release patterns: v*.*.* (e.g., v1.2.3)
  # Sort by version and get the latest
  local last_tag
  last_tag=$(git tag -l 'v[0-9]*.[0-9]*.[0-9]*' | sort -V | tail -n 1)

  if [[ -n "$last_tag" ]]; then
    # Verify the tag exists in the current repo
    if git rev-parse --verify "$last_tag" >/dev/null 2>&1; then
      echo "$last_tag"
      return 0
    fi
  fi

  # No release tag found
  return 1
}

# Function to determine the appropriate DIFF_BASE for version bumping
# When running on main after a squash-and-merge, origin/main and HEAD are the same
# (or HEAD is just the squash commit ahead). We need to compare against the last
# release tag to properly evaluate all changes since the last release.
#
# For consistency with beta-release.sh:
# - beta-release.sh: compares feature branch against origin/main (sees feature commits)
# - release.sh: compares main against last release tag (sees all changes since last release)
# Both evaluate the same commits (from the feature branch) but from different perspectives.
determine_diff_base() {
  local explicit_base="${1:-}"

  # If explicitly provided via environment or argument, use it
  if [[ -n "$explicit_base" ]]; then
    echo "$explicit_base"
    return 0
  fi

  # Priority 1: Try to find the last release tag
  # This is the best option for releases - it shows all changes since the last release,
  # including the merged PRs. This properly handles squash-and-merge workflows.
  local last_tag
  if last_tag=$(find_last_release_tag); then
    log "Found last release tag: $last_tag (using as diff base for version bumping)"
    echo "$last_tag"
    return 0
  fi

  # Priority 2: Check if HEAD is ahead of origin/main (we have local commits not yet pushed)
  # This handles the case where we're on main with local commits (e.g., just merged locally)
  if git rev-parse --verify "origin/main" >/dev/null 2>&1; then
    local head_commit origin_main_commit
    head_commit=$(git rev-parse HEAD 2>/dev/null || true)
    origin_main_commit=$(git rev-parse origin/main 2>/dev/null || true)

    if [[ -n "$head_commit" ]] && [[ -n "$origin_main_commit" ]] && [[ "$head_commit" != "$origin_main_commit" ]]; then
      # HEAD is ahead of origin/main - we have local commits
      # Check if HEAD is a direct descendant (linear history)
      if git merge-base --is-ancestor "$origin_main_commit" "$head_commit" 2>/dev/null; then
        log "HEAD is ahead of origin/main. Using origin/main as diff base."
        echo "origin/main"
        return 0
      fi
    fi
  fi

  # Priority 3: Use HEAD~1 as last resort
  # This will only show the single squash commit, but it's better than nothing
  log_warning "No release tag found. Using HEAD~1 as diff base."
  log_warning "Note: With squash-and-merge, this will only analyze the single squash commit."
  log_warning "Consider using --diff-base to specify a better comparison point (e.g., last release tag),"
  log_warning "or ensure PR titles follow conventional commits format."
  echo "HEAD~1"
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

# Helper function to find the most recent commit that modified package.json for a service
# This helps us determine when the current version was set
find_last_package_json_commit() {
  local service=$1
  local package_file="$service/package.json"

  command_exists git || err "git is required"

  # Find the most recent commit that modified package.json
  local commit
  commit=$(git log -1 --format="%H" -- "$package_file" 2>/dev/null || true)

  echo "$commit"
}

# Helper function to check if there are meaningful commits since the version was set
# Returns true (0) if there are new commits, false (1) if no new commits
has_commits_since_version_set() {
  local service=$1
  local version_commit=$2

  command_exists git || err "git is required"

  # If we can't find the version commit, assume there might be new commits (bump)
  if [[ -z "$version_commit" ]] || ! git rev-parse --verify "$version_commit" >/dev/null 2>&1; then
    return 0  # Assume there are commits (safer to bump)
  fi

  # Check if the version commit itself is the HEAD (no new commits after version was set)
  local head_commit
  head_commit=$(git rev-parse HEAD 2>/dev/null || true)

  if [[ "$version_commit" == "$head_commit" ]]; then
    # Version was set in the current commit - check if there are other changes in this commit
    # If package.json is the only file changed, likely no new functional changes
    # Use git show which is more compatible across platforms
    local changed_files
    changed_files=$(git show --name-only --pretty=format: "$version_commit" 2>/dev/null | grep -v "^${service}/package.json$" | grep "^${service}/" || true)

    if [[ -z "$changed_files" ]]; then
      return 1  # Only package.json was changed, no new commits
    else
      return 0  # Other files were changed, there are new commits
    fi
  fi

  # Version commit is not HEAD - check if there are commits after it that touch this service
  # Use version_commit..HEAD (not version_commit^..HEAD) to check commits AFTER version_commit
  local commits
  commits=$(git log --oneline "${version_commit}..HEAD" -- "${service}/" 2>/dev/null || true)

  if [[ -n "$commits" ]]; then
    return 0  # There are new commits after version was set
  fi

  return 1  # No new commits after version was set
}

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
    # Prerelease version - smart detection: check if there are new commits since version was set
    local base="${BASH_REMATCH[1]}"

    # Smart detection: if no new commits since version was set, just strip suffix
    local version_commit
    version_commit=$(find_last_package_json_commit "$service")

    if has_commits_since_version_set "$service" "$version_commit"; then
      # There are new commits since version was set - bump as normal
      log "New commits detected since prerelease $current_version was set. Bumping version based on changes (level: $bump_level)."
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
      # No new commits since version was set - just strip the prerelease suffix
      log "No new commits detected since prerelease $current_version was set. Promoting to stable version $base."
      new_version="$base"
    fi
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
      --diff-base)
        [[ -n "${2:-}" ]] || err "--diff-base requires a value"
        EXPLICIT_DIFF_BASE="$2"
        DIFF_BASE="$2"
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

  # Determine DIFF_BASE for version bumping and change detection
  # This is important for squash-and-merge workflows where we need to compare
  # against the last release tag rather than just HEAD~1
  if [[ -z "$DIFF_BASE" ]]; then
    # Check if explicitly set via environment variable
    if [[ -n "${RELEASE_DIFF_BASE:-}" ]]; then
      DIFF_BASE="$RELEASE_DIFF_BASE"
      log "Using DIFF_BASE from RELEASE_DIFF_BASE environment variable: $DIFF_BASE"
    else
      # Auto-detect: try to find last release tag, fall back to merge-base or HEAD~1
      DIFF_BASE=$(determine_diff_base)
    fi
  else
    log "Using explicitly provided DIFF_BASE: $DIFF_BASE"
  fi

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
    # mapfile/readarray are not available in macOS' default Bash (3.2).
    # Read services line-by-line instead for portability.
    while IFS= read -r service; do
      [[ -n "$service" ]] && target_services+=("$service")
    done < <(detect_changed_services)
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

  # macOS ships Bash 3.2 by default which does not support associative arrays
  # or [[ -v ... ]]. Keep service->version mapping by index to remain portable.
  local service_versions=()
  local service_current_versions=()

  # Get and set versions for each service
  for i in "${!target_services[@]}"; do
    local service="${target_services[$i]}"
    if [[ ! -d "$service" ]]; then
      log "Skipping service '$service' (directory not found)"
      service_versions[$i]=""
      service_current_versions[$i]=""
      continue
    fi

    local current_version
    current_version=$(get_current_version "$service")
    service_current_versions[$i]="$current_version"

    local new_version
    if $BUMP_VERSION; then
      # Automatically bump version based on semantic versioning rules inferred
      # from git log for this service between DIFF_BASE and HEAD.
      # DIFF_BASE is automatically determined to handle squash-and-merge workflows:
      # it prioritizes the last release tag, which allows proper evaluation of all
      # changes since the last release. This is necessary because on main after a merge,
      # origin/main and HEAD are the same, so comparing against origin/main would show
      # no changes. Comparing against the last release tag shows all merged PRs since
      # the last release.
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

    service_versions[$i]="$new_version"
  done

  # Build and publish images for each service
  for i in "${!target_services[@]}"; do
    local service="${target_services[$i]}"
    local new_version="${service_versions[$i]:-}"
    if [[ -z "$new_version" ]]; then
      continue
    fi

    local current_version="${service_current_versions[$i]:-}"

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
  for i in "${!target_services[@]}"; do
    local service="${target_services[$i]}"
    local version="${service_versions[$i]:-}"
    if [[ -z "$version" ]]; then
      continue
    fi
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
    for i in "${!target_services[@]}"; do
      local service="${target_services[$i]}"
      local version="${service_versions[$i]:-}"
      if [[ -z "$version" ]]; then
        continue
      fi
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
       for i in "${!target_services[@]}"; do
         release_version="${service_versions[$i]:-}"
         if [[ -n "$release_version" ]]; then
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
    for i in "${!target_services[@]}"; do
      local service="${target_services[$i]}"
      local version="${service_versions[$i]:-}"
      if [[ -n "$version" ]]; then
        summary_items+=("$service: v$version")
      fi
    done
    if [[ ${#summary_items[@]} -gt 0 ]]; then
      print_summary "${summary_items[@]}"
    fi
  fi
}

main "$@"
