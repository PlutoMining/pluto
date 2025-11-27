#!/usr/bin/env bash

set -euo pipefail

SCRIPT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_ROOT"

AVAILABLE_SERVICES=(backend discovery frontend grafana prometheus)
DOCKER_REGISTRY="${DOCKER_REGISTRY:-ghcr.io/plutomining}"
DIFF_BASE="${BETA_DIFF_BASE:-origin/main}"
TAG_SUFFIX="${BETA_TAG_SUFFIX:-beta}"
NEXT_MANIFEST="umbrel-apps/pluto-next/umbrel-app.yml"
NEXT_COMPOSE="umbrel-apps/pluto-next/docker-compose.yml"
NEXT_LOCAL_COMPOSE="docker-compose.next.local.yml"

DRY_RUN=false
CUSTOM_SERVICES=()
APP_VERSION=""

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Options:
  --services "svc1,svc2"   Comma-separated list of services to release (override auto-detection)
  --app-version X.Y.Z-pr   Explicit pluto-next app version to write into umbrel-app.yml
  --diff-base <ref>        Git ref (default: ${DIFF_BASE}) used to detect changed services
  --tag-suffix <suffix>    Secondary tag pushed alongside the explicit version (default: ${TAG_SUFFIX})
  --dry-run                Print actions without building/pushing or editing files
  -h, --help               Show this help

Environment variables:
  DOCKER_REGISTRY          Target registry (default: ${DOCKER_REGISTRY})
  BETA_DIFF_BASE           Same as --diff-base
  BETA_TAG_SUFFIX          Same as --tag-suffix
EOF
}

log() {
  echo "[beta-release] $*"
}

err() {
  echo "[beta-release][error] $*" >&2
  exit 1
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
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
      /^(backend|discovery|frontend|grafana|prometheus)\// {print $1}
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
  grep '"version":' "$service/package.json" | sed -E 's/.*"version":\s*"([^"]+)".*/\1/'
}

get_current_app_version() {
  local manifest=$1
  grep 'version:' "$manifest" | sed -E 's/version: "(.*)"/\1/'
}

ensure_prerelease() {
  local version=$1
  [[ "$version" == *-* ]] || err "Version '$version' lacks a prerelease suffix (expected something like 1.4.0-beta.1)"
}

get_image_sha() {
  local image=$1
  local manifest_json sha

  if ! manifest_json=$(docker buildx imagetools inspect "$image" --format "{{json .Manifest}}" 2>&1); then
    err "Failed to inspect image $image: $manifest_json"
  fi

  sha=$(echo "$manifest_json" | jq -r '.digest // empty')
  [[ -n "$sha" && "$sha" != "null" ]] || err "Could not extract SHA256 digest from $image"
  echo "${sha#sha256:}"
}

update_image_refs() {
  local service=$1
  local version=$2
  local sha=$3
  local files=("$@")
  files=("${files[@]:3}")

  local image="${DOCKER_REGISTRY}/pluto-${service}:${version}@sha256:${sha}"
  local patterns=(
    "registry\\.gitlab\\.com/plutomining/pluto/pluto-${service}:[^[:space:]\"']+"
    "ghcr\\.io/plutomining/pluto/pluto-${service}:[^[:space:]\"']+"
    "ghcr\\.io/plutomining/pluto-${service}:[^[:space:]\"']+"
  )

  for file in "${files[@]}"; do
    [[ -f "$file" ]] || { log "Skipping missing file $file"; continue; }
    for pattern in "${patterns[@]}"; do
      if $DRY_RUN; then
        log "[dry-run] Would update $file for ${service} (${pattern} -> ${image})"
      else
        sed -i -E "s|${pattern}|${image}|g" "$file"
      fi
    done
  done
}

update_manifest_version() {
  local manifest=$1
  local version=$2

  if $DRY_RUN; then
    log "[dry-run] Would update ${manifest} to version ${version}"
    return
  fi

  sed -i -E "s/version: \".*\"/version: \"${version}\"/" "$manifest"
  sed -i -E "s/Version .*/Version ${version}/" "$manifest"
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

  log "Building ${service} (${version})..."
  if ! docker buildx build --platform linux/amd64,linux/arm64 \
      "${tags[@]}" \
      -f "${service}/Dockerfile" . --push; then
    err "Failed to build/push ${service}"
  fi
}

main() {
  parse_args "$@"

  command_exists docker || err "docker is required"
  command_exists jq || err "jq is required"
  if ! docker buildx version >/dev/null 2>&1; then
    err "docker buildx is required"
  fi

  local target_services=()
  if [[ ${#CUSTOM_SERVICES[@]} -gt 0 ]]; then
    target_services=("${CUSTOM_SERVICES[@]}")
  else
    mapfile -t target_services < <(detect_changed_services)
  fi

  if [[ ${#target_services[@]} -eq 0 ]]; then
    err "No services detected. Use --services to override or ensure your branch differs from ${DIFF_BASE}."
  fi

  log "Target services: ${target_services[*]}"

  declare -A service_versions

  for service in "${target_services[@]}"; do
    ensure_service_valid "$service"
    local version
    version=$(get_package_version "$service")
    ensure_prerelease "$version"
    service_versions["$service"]="$version"
  done

  if [[ -z "$APP_VERSION" ]]; then
    current_app_version=$(get_current_app_version "$NEXT_MANIFEST")
    prerelease_prefix=$(echo "$current_app_version" | awk -F- '{print $1}')
    prerelease_suffix=$(echo "$current_app_version" | awk -F- 'NF>1 {print $2}')

    if [[ -n "$prerelease_suffix" && "$prerelease_suffix" =~ ^([a-zA-Z]+)\.([0-9]+)$ ]]; then
      prerelease_id="${BASH_REMATCH[1]}"
      prerelease_num="${BASH_REMATCH[2]}"
      APP_VERSION="${prerelease_prefix}-${prerelease_id}.$((prerelease_num + 1))"
    else
      APP_VERSION="${prerelease_prefix}-beta.0"
    fi
  fi

  ensure_prerelease "$APP_VERSION"
  log "pluto-next app version: $APP_VERSION"

  local compose_files=("$NEXT_COMPOSE" "$NEXT_LOCAL_COMPOSE")

  for service in "${target_services[@]}"; do
    local version="${service_versions[$service]}"
    build_and_push_service "$service" "$version"
    if $DRY_RUN; then
      continue
    fi
    local image_sha
    image_sha=$(get_image_sha "${DOCKER_REGISTRY}/pluto-${service}:${version}")
    log "Image digest for ${service}:${version} -> ${image_sha}"
    update_image_refs "$service" "$version" "$image_sha" "${compose_files[@]}"
  done

  update_manifest_version "$NEXT_MANIFEST" "$APP_VERSION"

  log "Beta release steps complete."
  log "Remember to commit the updated manifests/compose files."
}

main "$@"

