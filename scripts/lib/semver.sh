#!/usr/bin/env bash

# Copyright (C) 2024 Alberto Gangarossa.
# Pluto is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License
# as published by the Free Software Foundation, version 3.
# See <https://www.gnu.org/licenses/>.

# SemVer bump level detection based on git log + conventional commits
# 
# This module provides functions to determine semantic versioning bump levels
# (major/minor/patch) by analyzing commit messages following conventional commit
# format. It's used by both beta-release.sh and release.sh to automatically
# determine version bumps based on commit history.
#
# Usage:
#   source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/scripts/lib/semver.sh"
#   bump_level=$(determine_bump_level_for_service "frontend" "${DIFF_BASE}")

###############################################################################
# Determine SemVer bump level for a service based on git log
###############################################################################

# Determine the semantic versioning bump level (major/minor/patch/none) for a
# specific service by analyzing commits that touched that service's directory.
#
# Args:
#   $1: service name (e.g., "frontend", "backend")
#   $2: git diff base (e.g., "origin/main", "HEAD~1")
#
# Returns:
#   "major" - if commits contain breaking changes (BREAKING CHANGE or type!:)
#   "minor" - if commits contain features (feat:)
#   "patch" - if commits contain bug fixes (fix:)
#   "none"  - if no commits touched this service, or only non-versioned types
#
# According to Conventional Commits spec (https://www.conventionalcommits.org/):
# - Only feat: triggers MINOR, fix: triggers PATCH, BREAKING CHANGE triggers MAJOR
# - Other types (docs, build, ci, chore, style, refactor, perf, test, revert)
#   do not trigger version bumps unless they include a BREAKING CHANGE
#
# Examples:
#   determine_bump_level_for_service "frontend" "origin/main"
#   # Returns: "minor" if there's a "feat(frontend): add dashboard" commit
determine_bump_level_for_service() {
  local service="$1"
  local diff_base="${2:-HEAD~1}"

  command_exists git || err "git is required"

  # All commits that touched this service since diff_base.
  # We read:
  #   - one-line summaries (hash + header) for type/scope detection
  #   - full bodies for BREAKING CHANGE detection
  local commits bodies
  commits=$(git log --oneline "${diff_base}..HEAD" -- "${service}/" || true)
  bodies=$(git log --format='%B' "${diff_base}..HEAD" -- "${service}/" || true)

  if [[ -z "$commits" ]]; then
    echo "none"
    return 0
  fi

  # MAJOR bump:
  #  - "BREAKING CHANGE" in commit body, *and* header scope includes this service
  #  - "<type>!:" marker in subject with header scope including this service
  #
  # This avoids attributing a breaking change in one area (e.g. frontend) to
  # every service that merely had lockfiles or config files touched.
  if echo "$bodies" | grep -qiE 'BREAKING CHANGE'; then
    # Require that at least one header has a scope list that mentions this service,
    # e.g. feat(frontend,backend): ... when service is "frontend" or "backend".
    if echo "$commits" | grep -qiE "^[0-9a-f]+ +[^ ]*\\([^)]*\\b${service}\\b[^)]*\\):"; then
      echo "major"
      return 0
    fi
  fi
  # Also treat scoped type! commits as major for that service only.
  if echo "$commits" | grep -qiE "^[0-9a-f]+ +[^ ]*\\([^)]*\\b${service}\\b[^)]*\\)!:"; then
    echo "major"
    return 0
  fi

  # MINOR bump:
  #  - any "feat:" or "feat(scope):" touching this service
  if echo "$commits" | grep -qiE '^[0-9a-f]+ +feat(\(|:)' ; then
    echo "minor"
    return 0
  fi

  # PATCH bump:
  #  - any "fix:" or "fix(scope):" touching this service
  #  According to Conventional Commits spec, only fix: triggers PATCH
  if echo "$commits" | grep -qiE '^[0-9a-f]+ +fix(\(|:)' ; then
    echo "patch"
    return 0
  fi

  # If we have commits but they're not feat/fix/breaking, they don't trigger a version bump
  # (e.g., docs, build, ci, chore, style, refactor, perf, test, revert)
  # According to Conventional Commits spec, these types have no implicit effect
  # on Semantic Versioning unless they include a BREAKING CHANGE.
  echo "none"
}
