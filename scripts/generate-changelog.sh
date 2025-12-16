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

  # Fetch tags to ensure semantic-release can find previous releases
  log "Fetching tags from remote..."
  git fetch --tags origin || git fetch --tags || log_warning "Failed to fetch tags, continuing anyway"

  # Get current branch
  local current_branch
  current_branch=$(git rev-parse --abbrev-ref HEAD)
  
  # Prepare semantic-release command
  local semantic_release_cmd=("npx" "semantic-release")
  local temp_config=""
  local original_config_backup=""
  
  # Initialize original_config_backup variable (will be set if we need to backup config)
  
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
    
    # If --skip-commit is used, disable the git plugin to prevent commits
    # We only want to generate the changelog, not commit it
    if $SKIP_COMMIT; then
      log "Skipping commit - will generate changelog but not commit it"
      
      # Backup original config if it exists
      if [[ -f ".releaserc.json" ]]; then
        if [[ -z "$original_config_backup" ]]; then
          original_config_backup=$(mktemp)
          cp ".releaserc.json" "$original_config_backup"
        fi
      fi
      
      # Create temporary config without the git plugin
      temp_config=$(mktemp --suffix=.json)
      # Use jq to remove the git plugin, or fall back to manual removal if jq is not available
      if command_exists jq; then
        # Filter out plugins that are arrays starting with "@semantic-release/git"
        # Use a more explicit check to avoid "Cannot index string with number" error
        jq '.plugins |= [.[] | select((type != "array") or (.[0] != "@semantic-release/git"))]' ".releaserc.json" > "$temp_config" || {
          log_warning "Failed to use jq to remove git plugin, using fallback method"
          # Fallback: manually create config without git plugin
          cat > "$temp_config" <<'EOF'
{
  "branches": [
    "main"
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
  "dryRun": false
}
EOF
        }
      else
        # Fallback: manually create config without git plugin
        # Read the original config and remove the git plugin entry
        cat > "$temp_config" <<'EOF'
{
  "branches": [
    "main"
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
  "dryRun": false
}
EOF
      fi
      
      # Temporarily replace .releaserc.json
      cp "$temp_config" ".releaserc.json"
    fi
  fi

  # Set environment variables for semantic-release
  # Ensure GITHUB_TOKEN is exported so semantic-release can use it
  if [[ -z "${GITHUB_TOKEN:-}" ]]; then
    log_warning "GITHUB_TOKEN not set. GitHub releases will not be created."
    log_warning "Set GITHUB_TOKEN in .env file or environment variable to enable GitHub releases."
  else
    export GITHUB_TOKEN
    log "GITHUB_TOKEN is set (from .env or environment)"
  fi
  
  # If not in script's dry-run mode, tell semantic-release to run for real (not in dry-run)
  # This prevents semantic-release from automatically detecting non-CI and running in dry-run mode
  if ! $DRY_RUN; then
    semantic_release_cmd+=("--no-dry-run")
    semantic_release_cmd+=("--no-ci")
  fi

  # Configure git to use GITHUB_TOKEN for authentication if available
  # This prevents git from prompting for credentials when semantic-release pushes tags
  if [[ -n "$GITHUB_TOKEN" ]]; then
    local remote_url
    remote_url=$(git config --get remote.origin.url 2>/dev/null || echo "")
    
    if [[ -n "$remote_url" ]]; then
      # If remote is HTTPS, configure git to use the token via URL rewrite
      if [[ "$remote_url" =~ ^https:// ]]; then
        # Extract host and path (e.g., github.com/user/repo)
        local host_path
        host_path=$(echo "$remote_url" | sed -E 's|^https://([^/]+)/(.+)$|\1/\2|' | sed 's|\.git$||')
        
        # Configure git to rewrite HTTPS URLs to include the token
        # This makes git operations use the token automatically
        git config --local url."https://${GITHUB_TOKEN}@github.com/".insteadOf "https://github.com/" || true
      elif [[ "$remote_url" =~ ^git@ ]]; then
        # For SSH remotes, GITHUB_TOKEN isn't needed (uses SSH keys)
        log "Using SSH remote, GITHUB_TOKEN not needed for git operations"
      fi
    fi
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
  
  # Clean up git URL rewrite configuration if we added it
  if [[ -n "$GITHUB_TOKEN" ]]; then
    git config --local --unset url."https://${GITHUB_TOKEN}@github.com/".insteadOf 2>/dev/null || true
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

