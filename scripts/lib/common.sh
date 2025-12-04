#!/usr/bin/env bash

# Copyright (C) 2024 Alberto Gangarossa.
# Pluto is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License
# as published by the Free Software Foundation, version 3.
# See <https://www.gnu.org/licenses/>.

# Common functions used across multiple release scripts
# 
# Usage: 
#   SCRIPT_NAME="script-name"  # Set this before sourcing
#   source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/scripts/lib/common.sh"

# Color support detection
if [[ -t 1 ]] && command -v tput >/dev/null 2>&1; then
  COLOR_SUPPORT=true
  COLOR_RESET=$(tput sgr0)
  COLOR_RED=$(tput setaf 1)
  COLOR_GREEN=$(tput setaf 2)
  COLOR_YELLOW=$(tput setaf 3)
  COLOR_BLUE=$(tput setaf 4)
  COLOR_MAGENTA=$(tput setaf 5)
  COLOR_CYAN=$(tput setaf 6)
else
  COLOR_SUPPORT=false
  COLOR_RESET=""
  COLOR_RED=""
  COLOR_GREEN=""
  COLOR_YELLOW=""
  COLOR_BLUE=""
  COLOR_MAGENTA=""
  COLOR_CYAN=""
fi

# Logging functions (require SCRIPT_NAME to be set)
log() {
  local script_name="${SCRIPT_NAME:-$(basename "$0")}"
  local timestamp=""
  if [[ "${LOG_TIMESTAMP:-false}" == "true" ]]; then
    timestamp="[$(date '+%Y-%m-%d %H:%M:%S')] "
  fi
  echo "${timestamp}[${script_name}] $*" >&2
}

log_step() {
  local script_name="${SCRIPT_NAME:-$(basename "$0")}"
  local timestamp=""
  if [[ "${LOG_TIMESTAMP:-false}" == "true" ]]; then
    timestamp="[$(date '+%Y-%m-%d %H:%M:%S')] "
  fi
  if $COLOR_SUPPORT; then
    echo "${timestamp}${COLOR_CYAN}[${script_name}][step]${COLOR_RESET} $*" >&2
  else
    echo "${timestamp}[${script_name}][step] $*" >&2
  fi
}

log_success() {
  local script_name="${SCRIPT_NAME:-$(basename "$0")}"
  local timestamp=""
  if [[ "${LOG_TIMESTAMP:-false}" == "true" ]]; then
    timestamp="[$(date '+%Y-%m-%d %H:%M:%S')] "
  fi
  if $COLOR_SUPPORT; then
    echo "${timestamp}${COLOR_GREEN}[${script_name}][success]${COLOR_RESET} $*" >&2
  else
    echo "${timestamp}[${script_name}][success] $*" >&2
  fi
}

log_warning() {
  local script_name="${SCRIPT_NAME:-$(basename "$0")}"
  local timestamp=""
  if [[ "${LOG_TIMESTAMP:-false}" == "true" ]]; then
    timestamp="[$(date '+%Y-%m-%d %H:%M:%S')] "
  fi
  if $COLOR_SUPPORT; then
    echo "${timestamp}${COLOR_YELLOW}[${script_name}][warning]${COLOR_RESET} $*" >&2
  else
    echo "${timestamp}[${script_name}][warning] $*" >&2
  fi
}

log_progress() {
  local message="$1"
  local script_name="${SCRIPT_NAME:-$(basename "$0")}"
  if $COLOR_SUPPORT; then
    echo -n "${COLOR_BLUE}[${script_name}][progress]${COLOR_RESET} ${message}..." >&2
  else
    echo -n "[${script_name}][progress] ${message}..." >&2
  fi
}

log_progress_done() {
  if $COLOR_SUPPORT; then
    echo " ${COLOR_GREEN}✓${COLOR_RESET}" >&2
  else
    echo " [OK]" >&2
  fi
}

log_progress_fail() {
  if $COLOR_SUPPORT; then
    echo " ${COLOR_RED}✗${COLOR_RESET}" >&2
  else
    echo " [FAILED]" >&2
  fi
}

err() {
  local script_name="${SCRIPT_NAME:-$(basename "$0")}"
  local timestamp=""
  if [[ "${LOG_TIMESTAMP:-false}" == "true" ]]; then
    timestamp="[$(date '+%Y-%m-%d %H:%M:%S')] "
  fi
  if $COLOR_SUPPORT; then
    echo "${timestamp}${COLOR_RED}[${script_name}][error]${COLOR_RESET} $*" >&2
  else
    echo "${timestamp}[${script_name}][error] $*" >&2
  fi
  
  # Print stack trace if DEBUG is set
  if [[ "${DEBUG:-false}" == "true" ]]; then
    echo "Stack trace:" >&2
    local frame=0
    while caller $frame; do
      ((frame++))
    done >&2
  fi
  
  exit 1
}

# Check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Get SHA256 digest of a Docker image
get_image_sha() {
  local image=$1
  local manifest_json sha

  if ! manifest_json=$(docker buildx imagetools inspect "$image" --format "{{json .Manifest}}" 2>&1); then
    err "Failed to inspect image $image: $manifest_json"
  fi

  sha=$(echo "$manifest_json" | jq -r '.digest // empty')
  [[ -n "$sha" && "$sha" != "null" ]] || err "Could not extract SHA256 digest from image $image"
  echo "${sha#sha256:}"
}

# Get image SHA without erroring if image doesn't exist (returns empty string)
get_image_sha_safe() {
  local image=$1
  local manifest_json sha

  if ! manifest_json=$(docker buildx imagetools inspect "$image" --format "{{json .Manifest}}" 2>/dev/null); then
    return 1
  fi

  sha=$(echo "$manifest_json" | jq -r '.digest // empty' 2>/dev/null)
  if [[ -z "$sha" || "$sha" == "null" ]]; then
    return 1
  fi
  echo "${sha#sha256:}"
}

# Check if an image exists in the registry
image_exists() {
  local image=$1
  docker buildx imagetools inspect "$image" >/dev/null 2>&1
}

# Get GitHub repository name from git remote
get_github_repo() {
  local remote_url
  remote_url=$(git config --get remote.origin.url 2>/dev/null) || err "Failed to get git remote URL"
  
  # Handle both SSH and HTTPS URLs
  if [[ "$remote_url" =~ git@github\.com:(.+)\.git$ ]]; then
    echo "${BASH_REMATCH[1]}"
  elif [[ "$remote_url" =~ https://github\.com/(.+)\.git$ ]]; then
    echo "${BASH_REMATCH[1]}"
  elif [[ "$remote_url" =~ https://github\.com/(.+)$ ]]; then
    echo "${BASH_REMATCH[1]}"
  else
    err "Could not parse GitHub repository from remote URL: $remote_url"
  fi
}

# Load .env file if present, preserving command-line environment variables
# Usage: load_env_file SCRIPT_ROOT [VAR1 VAR2 ...]
# If additional variable names are provided, they will also be preserved from command-line
load_env_file() {
  local script_root="$1"
  shift
  local preserve_vars=("$@")
  local env_file="${script_root}/.env"
  
  # Save existing values if set (always preserve GITHUB_USERNAME and GITHUB_TOKEN)
  local saved_github_username="${GITHUB_USERNAME:-}"
  local saved_github_token="${GITHUB_TOKEN:-}"
  
  # Save any additional variables that were requested
  declare -A saved_vars
  for var in "${preserve_vars[@]}"; do
    # Use indirect variable reference to check if variable is set
    if [[ -n "${!var:-}" ]]; then
      saved_vars["$var"]="${!var}"
    fi
  done
  
  # Load .env file if it exists
  if [[ -f "${env_file}" ]]; then
    # shellcheck disable=SC1090
    set -a
    source "${env_file}"
    set +a
  fi
  
  # Restore command-line values if they were set (takes precedence over .env)
  if [[ -n "$saved_github_username" ]]; then
    GITHUB_USERNAME="$saved_github_username"
  fi
  if [[ -n "$saved_github_token" ]]; then
    GITHUB_TOKEN="$saved_github_token"
  fi
  
  # Restore additional preserved variables
  for var in "${!saved_vars[@]}"; do
    eval "${var}=\"${saved_vars[$var]}\""
  done
}

# Retry a command with exponential backoff
# Usage: retry_command MAX_ATTEMPTS COMMAND [ARGS...]
retry_command() {
  local max_attempts=$1
  shift
  local attempt=1
  local delay=1
  
  while [[ $attempt -le $max_attempts ]]; do
    if "$@"; then
      return 0
    fi
    
    if [[ $attempt -lt $max_attempts ]]; then
      log_warning "Command failed (attempt $attempt/$max_attempts). Retrying in ${delay}s..."
      sleep "$delay"
      delay=$((delay * 2))  # Exponential backoff
    fi
    
    ((attempt++))
  done
  
  return 1
}

# Validate semantic version format
# Usage: validate_version_format VERSION
validate_version_format() {
  local version=$1
  if [[ ! "$version" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)(-([a-zA-Z0-9.-]+))?(\+([a-zA-Z0-9.-]+))?$ ]]; then
    return 1
  fi
  return 0
}

# Validate Docker image exists and is accessible
# Usage: validate_docker_image IMAGE
validate_docker_image() {
  local image=$1
  if ! docker buildx imagetools inspect "$image" >/dev/null 2>&1; then
    return 1
  fi
  return 0
}

# Validate git state
# Usage: validate_git_state [--allow-uncommitted]
validate_git_state() {
  local allow_uncommitted=false
  if [[ "${1:-}" == "--allow-uncommitted" ]]; then
    allow_uncommitted=true
  fi
  
  command_exists git || err "git is required"
  
  if ! git rev-parse --git-dir >/dev/null 2>&1; then
    err "Not a git repository"
  fi
  
  if ! $allow_uncommitted && ! git diff-index --quiet HEAD -- 2>/dev/null; then
    return 1
  fi
  
  return 0
}

# Validate service versions are consistent
# Usage: validate_service_versions SERVICES_ARRAY
validate_service_versions() {
  local services=("$@")
  local first_version=""
  local first_service=""
  
  for service in "${services[@]}"; do
    if [[ ! -f "$service/package.json" ]]; then
      log_warning "Skipping $service (no package.json)"
      continue
    fi
    
    local version
    version=$(grep '"version":' "$service/package.json" | sed -E 's/.*"version":\s*"([^"]+)".*/\1/' || echo "")
    
    if [[ -z "$version" ]]; then
      log_warning "Could not read version from $service/package.json"
      continue
    fi
    
    if ! validate_version_format "$version"; then
      log_warning "Invalid version format in $service: $version"
      continue
    fi
    
    if [[ -z "$first_version" ]]; then
      first_version="$version"
      first_service="$service"
    elif [[ "$version" != "$first_version" ]]; then
      log_warning "Version mismatch: $first_service=$first_version, $service=$version"
      # Don't fail, just warn
    fi
  done
  
  return 0
}

# Check if Docker daemon is running
check_docker_daemon() {
  if ! docker info >/dev/null 2>&1; then
    return 1
  fi
  return 0
}

# Check disk space (in GB)
# Usage: check_disk_space REQUIRED_GB [PATH]
check_disk_space() {
  local required_gb=$1
  local check_path="${2:-.}"
  
  if [[ "$(uname)" == "Darwin" ]]; then
    local available_gb
    available_gb=$(df -g "$check_path" | awk 'NR==2 {print $4}')
  else
    local available_gb
    available_gb=$(df -BG "$check_path" | awk 'NR==2 {print $4}' | sed 's/G//')
  fi
  
  if [[ -z "$available_gb" ]] || [[ "$available_gb" -lt "$required_gb" ]]; then
    return 1
  fi
  
  return 0
}

# Cleanup on error - can be overridden by scripts
cleanup_on_error() {
  # Default implementation does nothing
  # Scripts can override this function
  :
}

# Set up error trap
setup_error_trap() {
  trap 'cleanup_on_error; exit 1' ERR
}

# Generate summary of what was accomplished
# Usage: print_summary "Service1: v1.0.0" "Service2: v1.0.0"
print_summary() {
  local script_name="${SCRIPT_NAME:-$(basename "$0")}"
  echo ""
  if $COLOR_SUPPORT; then
    echo "${COLOR_CYAN}════════════════════════════════════════${COLOR_RESET}" >&2
    echo "${COLOR_CYAN}Summary${COLOR_RESET}" >&2
    echo "${COLOR_CYAN}════════════════════════════════════════${COLOR_RESET}" >&2
  else
    echo "════════════════════════════════════════" >&2
    echo "Summary" >&2
    echo "════════════════════════════════════════" >&2
  fi
  
  for item in "$@"; do
    log_success "$item"
  done
  
  if $COLOR_SUPPORT; then
    echo "${COLOR_CYAN}════════════════════════════════════════${COLOR_RESET}" >&2
  else
    echo "════════════════════════════════════════" >&2
  fi
  echo ""
}

