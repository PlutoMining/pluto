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
SCRIPT_NAME="beta-release"
# shellcheck source=scripts/lib/common.sh
source "${SCRIPT_ROOT}/scripts/lib/common.sh"
# shellcheck source=scripts/lib/semver.sh
source "${SCRIPT_ROOT}/scripts/lib/semver.sh"

# NOTE: mock is included so we can publish mock device images for beta testing.
# It is not part of the Umbrel pluto-next manifest bundle by default.
AVAILABLE_SERVICES=(backend discovery frontend prometheus mock)
DOCKER_REGISTRY="${DOCKER_REGISTRY:-ghcr.io/plutomining}"
DIFF_BASE="${BETA_DIFF_BASE:-origin/main}"
TAG_SUFFIX="${BETA_TAG_SUFFIX:-beta}"

DRY_RUN=false
CUSTOM_SERVICES=()
APP_VERSION=""
BUMP_VERSION=false
UPDATE_MANIFESTS=false
SYNC_TO_UMBREL=false
SKIP_LOGIN=false
SKIP_CI_CHECK=false
VERBOSE=false
QUIET=false

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Build and push beta Docker images for pluto-next, using per-service semantic
versioning (major / minor / patch) and prerelease tags, and optionally
updating Umbrel manifests.

Options:
  --services "svc1,svc2"   Comma-separated list of services to release (override auto-detection)
  --app-version X.Y.Z-pr   Explicit pluto-next app version to write into umbrel-app.yml
  --diff-base <ref>        Git ref (default: ${DIFF_BASE}) used to detect changed services
  --tag-suffix <suffix>    Secondary tag pushed alongside the explicit version (default: ${TAG_SUFFIX})
  --skip-login             Skip Docker login prompt
  --bump-version           Automatically bump package.json versions to beta per service based on git history
                           (major / minor / patch via scripts/lib/semver.sh, then add -beta.N)
  --update-manifests       Update pluto-next umbrel-app manifests after building images
  --sync-to-umbrel         Sync manifests to Umbrel device (requires --update-manifests)
  --skip-ci-check          Skip CI status check (not recommended)
  --verbose                Enable verbose logging
  --quiet                  Minimal output (errors only)
  --dry-run                Print actions without building/pushing or editing files
  -h, --help               Show this help

Environment variables:
  DOCKER_REGISTRY          Target registry (default: ${DOCKER_REGISTRY})
  BETA_DIFF_BASE           Same as --diff-base
  BETA_TAG_SUFFIX          Same as --tag-suffix
  GITHUB_TOKEN             GitHub token for CI status checks (default: prompt if needed)
EOF
}


parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
    --services)
      [[ -n "${2:-}" ]] || err "--services requires a value"
      IFS=',' read -r -a CUSTOM_SERVICES <<<"${2// /}"
      shift 2
      ;;
    --app-version)
      [[ -n "${2:-}" ]] || err "--app-version requires a value"
      APP_VERSION="$2"
      shift 2
      ;;
    --diff-base)
      [[ -n "${2:-}" ]] || err "--diff-base requires a value"
      DIFF_BASE="$2"
      shift 2
      ;;
    --tag-suffix)
      [[ -n "${2:-}" ]] || err "--tag-suffix requires a value"
      TAG_SUFFIX="$2"
      shift 2
      ;;
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
      --skip-ci-check)
        SKIP_CI_CHECK=true
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

detect_changed_services() {
  command_exists git || err "git is required"
  git fetch -q origin || true
  git fetch -q "$(echo "$DIFF_BASE" | cut -d/ -f1)" || true

  git diff --name-only "${DIFF_BASE}...HEAD" \
    | awk -F/ '
      /^(backend|discovery|frontend|prometheus|mock)\// {print $1}
    ' \
    | sort -u
}

ensure_service_valid() {
  local service=$1
  local found=false
  for s in "${AVAILABLE_SERVICES[@]}"; do
    if [[ "$s" == "$service" ]]; then
      found=true
      break
    fi
  done
  $found || err "Unsupported service '$service'. Allowed: ${AVAILABLE_SERVICES[*]}"
  [[ -d "$service" ]] || err "Directory '$service' not found"
  [[ -f "$service/package.json" ]] || err "Missing $service/package.json"
  [[ -f "$service/Dockerfile" ]] || err "Missing $service/Dockerfile"
}

get_package_version() {
  local service=$1
  # Avoid PCRE-only escapes (e.g. \s) for portability across BSD/GNU sed.
  grep -m 1 '"version":' "$service/package.json" | sed -E 's/.*"version":[[:space:]]*"([^"]+)".*/\1/'
}

# Function to check the current Git branch
check_git_branch() {
  local branch
  branch=$(git rev-parse --abbrev-ref HEAD)
  if [[ "$branch" == "main" ]]; then
    err "You must not be on the 'main' branch to create beta releases. Use 'scripts/release.sh' for stable releases."
  fi
}

# Function to check if branch is aligned with main
check_branch_aligned_with_main() {
  command_exists git || err "git is required"
  
  # Fetch latest main
  git fetch -q origin main || err "Failed to fetch origin/main"
  
  local current_branch
  current_branch=$(git rev-parse --abbrev-ref HEAD)
  
  # Get the merge-base between current branch and origin/main
  local merge_base
  merge_base=$(git merge-base "origin/main" HEAD 2>/dev/null) || err "Failed to find merge-base with origin/main"
  
  # Get the current HEAD of origin/main
  local main_head
  main_head=$(git rev-parse "origin/main" 2>/dev/null) || err "Failed to get origin/main HEAD"
  
  # Check if branch is behind main
  if [[ "$merge_base" != "$main_head" ]]; then
    # Count commits that main has but branch doesn't
    local commits_behind
    commits_behind=$(git rev-list --count "${merge_base}..${main_head}" 2>/dev/null || echo "0")
    
    if [[ "$commits_behind" -gt 0 ]]; then
      err "Branch '$current_branch' is not aligned with origin/main. Main is $commits_behind commit(s) ahead. Please merge or rebase with origin/main before creating beta releases."
    fi
  fi
  
  log "Branch '$current_branch' is aligned with origin/main"
}

# Function to check if local branch is aligned with remote
check_local_branch_aligned_with_remote() {
  command_exists git || err "git is required"
  
  local current_branch
  current_branch=$(git rev-parse --abbrev-ref HEAD)
  
  # Fetch latest from remote
  git fetch -q origin "$current_branch" 2>/dev/null || {
    log "Warning: Remote branch 'origin/$current_branch' not found. Assuming this is a new branch."
    return 0
  }
  
  # Check if local branch has commits not pushed to remote
  local local_commit
  local_commit=$(git rev-parse HEAD 2>/dev/null) || err "Failed to get local HEAD"
  
  local remote_commit
  remote_commit=$(git rev-parse "origin/$current_branch" 2>/dev/null) || {
    log "Warning: Remote branch 'origin/$current_branch' not found. Assuming this is a new branch."
    return 0
  }
  
  # Check if local is ahead of remote
  local commits_ahead
  commits_ahead=$(git rev-list --count "origin/$current_branch..HEAD" 2>/dev/null || echo "0")
  
  if [[ "$commits_ahead" -gt 0 ]]; then
    err "Local branch '$current_branch' has $commits_ahead unpushed commit(s). Please push all commits to remote before creating beta releases."
  fi
  
  log "Local branch '$current_branch' is aligned with remote"
}

# Function to check for uncommitted files
check_uncommitted_files() {
  command_exists git || err "git is required"
  
  if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    log "Warning: You have uncommitted changes in your working directory."
    log "Warning: It's recommended to commit or stash changes before creating beta releases."
    echo ""
    echo "Uncommitted changes:"
    git status --short
    echo ""
    read -p "Continue anyway? [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      err "Aborted by user"
    fi
  else
    log "Working directory is clean"
  fi
}

# Function to check CI status using GitHub API
check_ci_status() {
  if $SKIP_CI_CHECK; then
    log "Skipping CI status check (--skip-ci-check flag set)"
    return 0
  fi
  
  command_exists git || err "git is required"
  command_exists curl || err "curl is required for CI status checks"
  command_exists jq || err "jq is required for CI status checks"
  
  local github_repo
  github_repo=$(get_github_repo)
  
  local current_branch
  current_branch=$(git rev-parse --abbrev-ref HEAD)
  
  # Get GitHub token (from .env, environment, or prompt)
  local github_token="${GITHUB_TOKEN:-}"
  if [[ -z "$github_token" ]]; then
    log "GitHub token not found in GITHUB_TOKEN environment variable or .env file."
    echo "Enter your GitHub Personal Access Token (PAT) with 'repo' scope:"
    echo "Create one at: https://github.com/settings/tokens"
    read -rs github_token
    echo
    if [[ -z "$github_token" ]]; then
      err "GitHub token is required for CI status checks. Set GITHUB_TOKEN in .env file, env var, or use --skip-ci-check to skip."
    fi
  else
    log "Using GitHub token from .env file or environment variable"
  fi
  
  log "Checking CI status for branch '$current_branch'..."
  
  # Get the latest workflow run for this branch
  local api_url="https://api.github.com/repos/${github_repo}/actions/runs?branch=${current_branch}&per_page=1"
  local response
  response=$(curl -s -H "Authorization: token ${github_token}" \
    -H "Accept: application/vnd.github.v3+json" \
    "$api_url") || err "Failed to query GitHub API"
  
  # Check for API errors
  local error_message
  error_message=$(echo "$response" | jq -r '.message // empty' 2>/dev/null)
  if [[ -n "$error_message" && "$error_message" != "null" ]]; then
    err "GitHub API error: $error_message"
  fi
  
  # Get workflow runs
  local total_count
  total_count=$(echo "$response" | jq -r '.total_count // 0' 2>/dev/null)
  
  if [[ "$total_count" -eq 0 ]]; then
    log "Warning: No workflow runs found for branch '$current_branch'. Proceeding anyway."
    return 0
  fi
  
  # Get the latest run
  local latest_run
  latest_run=$(echo "$response" | jq -r '.workflow_runs[0] // empty' 2>/dev/null)
  
  if [[ -z "$latest_run" || "$latest_run" == "null" ]]; then
    log "Warning: Could not find latest workflow run. Proceeding anyway."
    return 0
  fi
  
  local run_status
  run_status=$(echo "$latest_run" | jq -r '.status // "unknown"' 2>/dev/null)
  local run_conclusion
  run_conclusion=$(echo "$latest_run" | jq -r '.conclusion // "unknown"' 2>/dev/null)
  local workflow_name
  workflow_name=$(echo "$latest_run" | jq -r '.name // "unknown"' 2>/dev/null)
  local run_url
  run_url=$(echo "$latest_run" | jq -r '.html_url // ""' 2>/dev/null)
  
  log "Latest workflow run: $workflow_name"
  log "Status: $run_status, Conclusion: $run_conclusion"
  if [[ -n "$run_url" && "$run_url" != "null" ]]; then
    log "URL: $run_url"
  fi
  
  # Check if workflow is still running
  if [[ "$run_status" == "in_progress" || "$run_status" == "queued" ]]; then
    err "CI is still running (status: $run_status). Please wait for CI to complete before creating beta releases."
  fi
  
  # Check conclusion
  if [[ "$run_conclusion" == "failure" ]]; then
    err "CI failed for branch '$current_branch'. Please fix failing tests before creating beta releases. See: $run_url"
  elif [[ "$run_conclusion" == "cancelled" ]]; then
    err "CI was cancelled for branch '$current_branch'. Please re-run CI before creating beta releases."
  elif [[ "$run_conclusion" == "success" ]]; then
    log "CI passed for branch '$current_branch' ✓"
  else
    log "Warning: CI conclusion is '$run_conclusion'. Proceeding with caution."
  fi
}

ensure_prerelease() {
  local version=$1
  [[ "$version" == *-* ]] || err "Version '$version' lacks a prerelease suffix (expected something like 1.4.0-beta.1)"
}

###############################################################################
# Version bumping (uses semver bump level: major / minor / patch)
###############################################################################

bump_package_version() {
  local service=$1
  local bump_level=$2  # major|minor|patch
  local package_file="$service/package.json"
  local current_version
  current_version=$(get_package_version "$service")

  local new_version=""

  if [[ "$current_version" =~ ^([0-9]+\.[0-9]+\.[0-9]+)-beta\.([0-9]+)$ ]]; then
    # Already a beta version - increment beta number only (keep base the same)
    local base="${BASH_REMATCH[1]}"
    local beta_num="${BASH_REMATCH[2]}"
    beta_num=$((beta_num + 1))
    new_version="${base}-beta.${beta_num}"
  elif [[ "$current_version" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
    # Stable version - bump according to bump_level, then add beta.0
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

    new_version="${major}.${minor}.${patch}-beta.0"
  elif [[ "$current_version" =~ ^([0-9]+\.[0-9]+\.[0-9]+)-.+$ ]]; then
    # Non-beta prerelease (e.g. 0.7.0-rc.2) - keep base version and switch to beta.0.
    # This avoids unexpected base bumps when migrating prerelease tags.
    local base="${BASH_REMATCH[1]}"
    new_version="${base}-beta.0"
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


# Function to update docker-compose.next.local.yml with new image references
update_local_compose() {
  local service=$1
  local new_version=$2
  local image_sha=$3
  local registry=$4
  local compose_file="docker-compose.next.local.yml"

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

build_and_push_service() {
  local service=$1
  local version=$2

  local image_base="${DOCKER_REGISTRY}/pluto-${service}"
  local tags=(-t "${image_base}:${version}")
  if [[ -n "$TAG_SUFFIX" ]]; then
    tags+=(-t "${image_base}:${TAG_SUFFIX}")
  fi

  if $DRY_RUN; then
    log "[dry-run] Would build docker image for ${service} with tags ${tags[*]}"
    return
  fi

  log_progress "Building ${service} (${version})"
  
  if retry_command 2 docker buildx build --platform linux/amd64,linux/arm64 \
      "${tags[@]}" \
      -f "${service}/Dockerfile" . --push; then
    log_progress_done
    log_success "Built and pushed ${service}:${version}"
  else
    log_progress_fail
    err "Failed to build/push ${service} after retries"
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

  if [[ -n "$APP_VERSION" ]] && ! $UPDATE_MANIFESTS; then
    err "--app-version requires --update-manifests (or --sync-to-umbrel)"
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

  # Check git branch - must not be on main for beta releases
  check_git_branch
  
  # Check that branch is aligned with main
  check_branch_aligned_with_main
  
  # Check that local branch is aligned with remote (all commits pushed)
  check_local_branch_aligned_with_remote
  
  # Warn about uncommitted files
  if ! $DRY_RUN; then
    check_uncommitted_files
  else
    log "[dry-run] Would check for uncommitted files"
  fi
  
  # Check CI status before proceeding
  if ! $DRY_RUN; then
    check_ci_status
  else
    log "[dry-run] Would check CI status"
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

  local target_services=()
  if [[ ${#CUSTOM_SERVICES[@]} -gt 0 ]]; then
    target_services=("${CUSTOM_SERVICES[@]}")
  else
    # mapfile/readarray are not available in macOS' default Bash (3.2).
    # Read services line-by-line instead for portability.
    while IFS= read -r service; do
      [[ -n "$service" ]] && target_services+=("$service")
    done < <(detect_changed_services)
  fi

  if [[ ${#target_services[@]} -eq 0 ]]; then
    err "No services detected. Use --services to override or ensure your branch differs from ${DIFF_BASE}."
  fi

  log "Target services: ${target_services[*]}"

  # macOS ships Bash 3.2 by default which does not support associative arrays.
  # Keep service->version mapping by index to remain portable.
  local service_versions=()
  local service_current_versions=()

  for i in "${!target_services[@]}"; do
    local service="${target_services[$i]}"
    ensure_service_valid "$service"
    local current_version
    current_version=$(get_package_version "$service")
    service_current_versions[$i]="$current_version"

    local version
    if $BUMP_VERSION; then
      # Automatically bump version to beta based on semantic versioning rules,
      # inferred from git log for this service between DIFF_BASE and HEAD.
      local bump_level
      bump_level=$(determine_bump_level_for_service "$service" "$DIFF_BASE")
      if [[ "$bump_level" == "none" ]]; then
        # No commits touching this service – in practice this should not happen
        # for services in target_services, but fall back to patch if it does.
        bump_level="patch"
      fi
      version=$(bump_package_version "$service" "$bump_level")
    else
      # Use existing version (must already be a prerelease)
      version="$current_version"
      ensure_prerelease "$version"
    fi
    service_versions[$i]="$version"
  done

  for i in "${!target_services[@]}"; do
    local service="${target_services[$i]}"
    local version="${service_versions[$i]}"
    local current_version="${service_current_versions[$i]}"
    
    # Skip build if version hasn't changed
    if [[ "$version" == "$current_version" ]]; then
      local image_tag="${DOCKER_REGISTRY}/pluto-${service}:${version}"
      if image_exists "$image_tag"; then
        log "Skipping Docker build for $service as the version has not changed ($current_version) and image already exists in registry."
        if $DRY_RUN; then
          log "[dry-run] Would skip build for $service (version unchanged: $current_version, image exists)"
        fi
        continue
      else
        log "Version unchanged ($current_version) but image not found in registry. Building $service..."
      fi
    fi
    
    build_and_push_service "$service" "$version"
  done

  log "Beta images built and pushed for services: ${target_services[*]}"

  # Update docker-compose.next.local.yml with new image references
  log "Updating docker-compose.next.local.yml..."
  for i in "${!target_services[@]}"; do
    local service="${target_services[$i]}"
    local version="${service_versions[$i]}"
    local image_tag="${DOCKER_REGISTRY}/pluto-${service}:${version}"
    
    if $DRY_RUN; then
      log "[dry-run] Would update docker-compose.next.local.yml for $service with ${image_tag}@sha256:dry-run-sha"
    else
      local sha
      # Get SHA for the image (either newly built or existing)
      if ! sha=$(get_image_sha_safe "$image_tag"); then
        log "Warning: Could not retrieve SHA for ${image_tag}. Image may not exist in registry. Skipping compose file update for $service."
        continue
      fi
      update_local_compose "$service" "$version" "$sha" "$DOCKER_REGISTRY"
      log "Updated docker-compose.next.local.yml for $service"
    fi
  done

  # Update manifests if requested
  if $UPDATE_MANIFESTS || $SYNC_TO_UMBREL; then
    if [[ ${#target_services[@]} -eq 0 ]]; then
      err "Cannot update manifests: no services were built"
    fi

    log "Updating pluto-next manifests..."

    # Build image refs string for bump-umbrel-app-version.sh
    local images_arg=()
    for i in "${!target_services[@]}"; do
      local service="${target_services[$i]}"
      local version="${service_versions[$i]}"
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
      if [[ -n "$APP_VERSION" ]]; then
        log "[dry-run] Would call bump-umbrel-app-version.sh with --app-version ${APP_VERSION}: ${images_string}"
      else
        log "[dry-run] Would call bump-umbrel-app-version.sh with: ${images_string}"
      fi
    else
      bump_args=(
        --app pluto-next
        --channel beta
        --manifest "${SCRIPT_ROOT}/umbrel-apps/pluto-next/umbrel-app.yml"
        --compose "${SCRIPT_ROOT}/umbrel-apps/pluto-next/docker-compose.yml"
        --images "$images_string"
      )

      if [[ -n "$APP_VERSION" ]]; then
        bump_args+=(--app-version "$APP_VERSION")
      fi

      "${SCRIPT_ROOT}/scripts/bump-umbrel-app-version.sh" "${bump_args[@]}" || {
        # If manifest update fails, it might be because bundle is unchanged
        log "Manifest update completed (bundle may be unchanged)"
      }
    fi

    # Sync to Umbrel if requested
    if $SYNC_TO_UMBREL; then
      if $DRY_RUN; then
        log "[dry-run] Would sync manifests to Umbrel device"
      else
        log "Syncing manifests to Umbrel device..."
        APPS_TO_SYNC=pluto-next "${SCRIPT_ROOT}/scripts/sync-umbrel-apps.sh"
      fi
    fi
  fi

  # Note: Changelog generation is skipped for beta releases to avoid duplicates.
  # Changelog is only generated on stable releases (main branch) after PR merge.

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
