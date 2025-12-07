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
SCRIPT_NAME="generate-changelog"
# shellcheck source=scripts/lib/common.sh
source "${SCRIPT_ROOT}/scripts/lib/common.sh"

DRY_RUN=false
SKIP_COMMIT=false

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Generate changelog from conventional commits using semantic-release.

This script analyzes commits since the last release tag and generates
a CHANGELOG.md file based on conventional commit messages.

Options:
  --dry-run              Run semantic-release in dry-run mode (no changes)
  --skip-commit          Generate changelog but don't commit it
  -h, --help             Show this help

Examples:
  # Generate changelog (dry-run to preview)
  scripts/generate-changelog.sh --dry-run

  # Generate and commit changelog
  scripts/generate-changelog.sh

  # Generate changelog without committing
  scripts/generate-changelog.sh --skip-commit
EOF
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --dry-run)
        DRY_RUN=true
        shift
        ;;
      --skip-commit)
        SKIP_COMMIT=true
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

main() {
  parse_args "$@"

  # Load .env file if present
  load_env_file "$SCRIPT_ROOT"

  command_exists npm || err "npm is required"
  command_exists git || err "git is required"

  # Check if semantic-release is installed
  if [[ ! -d "node_modules/semantic-release" ]]; then
    log "Installing dependencies..."
    npm install
  fi

  log "Generating changelog from conventional commits..."

  # Get current branch
  local current_branch
  current_branch=$(git rev-parse --abbrev-ref HEAD)
  
  # Prepare semantic-release command
  local semantic_release_cmd=("npx" "semantic-release")
  local temp_config=""
  local original_config_backup=""
  
  if $DRY_RUN; then
    semantic_release_cmd+=("--dry-run")
    log "Running in dry-run mode (no changes will be made)"
    
    # For dry-run, allow testing on any branch by temporarily replacing the config
    if [[ "$current_branch" != "main" ]]; then
      log "Note: Not on main branch. Using temporary config to allow testing on '$current_branch'"
      
      # Backup original config if it exists
      if [[ -f ".releaserc.json" ]]; then
        original_config_backup=$(mktemp)
        cp ".releaserc.json" "$original_config_backup"
      fi
      
      # Create temporary config with current branch
      temp_config=$(mktemp --suffix=.json)
      cat > "$temp_config" <<'EOF'
{
  "branches": [
    "BRANCH_PLACEHOLDER"
  ],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    [
      "@semantic-release/changelog",
      {
        "changelogFile": "CHANGELOG.md"
      }
    ],
    [
      "@semantic-release/git",
      {
        "assets": ["CHANGELOG.md"],
        "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
      }
    ],
    [
      "@semantic-release/github",
      {
        "successComment": false,
        "releasedLabels": false
      }
    ]
  ],
  "preset": "angular",
  "releaseRules": [
    {
      "type": "feat",
      "release": "minor"
    },
    {
      "type": "fix",
      "release": "patch"
    },
    {
      "type": "perf",
      "release": "patch"
    },
    {
      "breaking": true,
      "release": "major"
    }
  ],
  "tagFormat": "v${version}",
  "dryRun": true
}
EOF
      # Replace the placeholder with the actual branch name
      sed -i "s/BRANCH_PLACEHOLDER/$current_branch/g" "$temp_config"
      
      # Temporarily replace .releaserc.json
      cp "$temp_config" ".releaserc.json"
    fi
  else
    # For actual runs, check if we're on main
    if [[ "$current_branch" != "main" ]]; then
      err "Changelog generation only works on 'main' branch for stable releases. Current branch: $current_branch"
    fi
  fi

  # Set environment variables for semantic-release
  export GITHUB_TOKEN="${GITHUB_TOKEN:-}"
  
  if [[ -z "$GITHUB_TOKEN" ]] && ! $DRY_RUN; then
    log "Warning: GITHUB_TOKEN not set. GitHub releases will not be created."
    log "Set GITHUB_TOKEN environment variable to enable GitHub releases."
  fi

  # Run semantic-release
  local exit_code=0
  if "${semantic_release_cmd[@]}"; then
    exit_code=0
  else
    exit_code=$?
  fi
  
  # Clean up temp config and restore original if needed
  if [[ -n "$temp_config" && -f "$temp_config" ]]; then
    rm -f "$temp_config"
  fi
  
  # Restore original config if we backed it up
  if [[ -n "$original_config_backup" && -f "$original_config_backup" ]]; then
    cp "$original_config_backup" ".releaserc.json"
    rm -f "$original_config_backup"
  fi
  
  if [[ $exit_code -eq 0 ]]; then
    if $DRY_RUN; then
      log "Dry-run completed. Review the output above."
      log ""
      log "Note: In dry-run mode, you can test on any branch."
      log "For actual changelog generation, you must be on the 'main' branch."
    else
      log "Changelog generated successfully!"
      
      if [[ -f "CHANGELOG.md" ]]; then
        log "CHANGELOG.md has been updated."
        
        if $SKIP_COMMIT; then
          log "Skipping commit as requested. You can commit manually:"
          log "  git add CHANGELOG.md"
          log "  git commit -m 'chore: update changelog'"
        else
          log "Changes have been committed automatically."
        fi
      else
        log "No changes detected - changelog is up to date."
      fi
    fi
  else
    err "Failed to generate changelog"
  fi
}

main "$@"

