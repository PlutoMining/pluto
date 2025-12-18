# Release Scripts Reference

> **These scripts are for project maintainers who need to PUBLISH releases to the Docker registry.**
>
> The release scripts (`release.sh`, `beta-release.sh`) **push images to the public registry**. They do NOT simply run the software locally.
>
> **For local development, use `make up` instead.** See the [Development Environment](../../README.md#development-environment).

This document provides detailed documentation for all release-related scripts.

## Script Architecture

All release and deployment scripts share a common library (`scripts/lib/common.sh`) that provides:

- **Logging functions**: `log()` and `err()` for consistent output formatting
- **Docker operations**: `get_image_sha()`, `get_image_sha_safe()`, `image_exists()` for image management
- **GitHub integration**: `get_github_repo()` for repository detection
- **Environment management**: `load_env_file()` for loading `.env` files with proper variable precedence
- **Utility functions**: `command_exists()` for dependency checking

This shared library ensures consistency across all scripts and makes maintenance easier. Each script sets a `SCRIPT_NAME` variable before sourcing the library to enable proper logging prefixes.

## Scripts Overview

### `scripts/release.sh`

Builds and pushes stable Docker images for the `pluto` app.

**Location**: Main Pluto repository (`PlutoMining/pluto`)

**Usage**:
```bash
scripts/release.sh [options]
```

**Options**:
- `--skip-login` - Skip Docker login prompt (useful for CI/CD)
- `--bump-version` - Automatically bump `package.json` versions (patch increment)
- `--update-manifests` - Update `pluto` umbrel-app manifests after building images
- `--sync-to-umbrel` - Sync manifests to Umbrel device (requires `--update-manifests`)
- `--skip-changelog` - Skip automatic changelog generation
- `--verbose` - Enable verbose logging with timestamps
- `--quiet` - Minimal output (errors only)
- `--dry-run` - Print actions without building/pushing or editing files

**Requirements**:
- Must be on `main` branch
- Docker and Docker Buildx installed
- QEMU emulation for cross-architecture builds (see [Troubleshooting](./troubleshooting.md#cross-architecture-build-fails-with-exec-format-error))
- Access to GitHub Container Registry

**See**: [Stable Releases Guide](./stable-releases.md)

### `scripts/beta-release.sh`

Builds and pushes beta Docker images for the `pluto-next` app.

**Location**: Main Pluto repository (`PlutoMining/pluto`)

**Usage**:
```bash
scripts/beta-release.sh [options]
```

**Options**:
- `--skip-login` - Skip Docker login prompt (useful for CI/CD)
- `--bump-version` - Automatically bump `package.json` versions to beta
- `--update-manifests` - Update `pluto-next` umbrel-app manifests after building images
- `--sync-to-umbrel` - Sync manifests to Umbrel device (requires `--update-manifests`)
- `--skip-ci-check` - Skip CI status check (not recommended)
- `--verbose` - Enable verbose logging with timestamps
- `--quiet` - Minimal output (errors only)
- `--dry-run` - Print actions without building/pushing or editing files
- `--services "svc1,svc2"` - Comma-separated list of services to release (override auto-detection)
- `--app-version X.Y.Z-pr` - Explicit pluto-next app version to write into umbrel-app.yml
- `--diff-base <ref>` - Git ref (default: `origin/main`) used to detect changed services
- `--tag-suffix <suffix>` - Secondary tag pushed alongside the explicit version (default: `beta`)

**Requirements**:
- Must NOT be on `main` branch
- Branch must be up-to-date with `origin/main`
- All commits pushed to remote
- CI tests passing
- Docker and Docker Buildx installed
- QEMU emulation for cross-architecture builds (see [Troubleshooting](./troubleshooting.md#cross-architecture-build-fails-with-exec-format-error))
- `GITHUB_TOKEN` environment variable (for CI checks)

**See**: [Beta Releases Guide](./beta-releases.md)

### `scripts/bump-umbrel-app-version.sh`

Low-level helper that updates Umbrel app manifests with new image references and bumps app version.

**Location**: Main Pluto repository (`PlutoMining/pluto`)

**Usage**:
```bash
scripts/bump-umbrel-app-version.sh \
  --app pluto|pluto-next \
  --channel stable|beta \
  --manifest PATH \
  --compose PATH \
  --images "svc=image,..."
```

**What it does**:
- Extracts current versions from `docker-compose.yml`
- Compares with new versions from image references
- Determines highest change type (major/minor/patch) across all services
- Bumps app version in `umbrel-app.yml` accordingly
- Updates `docker-compose.yml` with new image references pinned to digests

**Used by**: `release.sh` and `beta-release.sh`

### `scripts/sync-umbrel-apps.sh`

Syncs Umbrel app manifests to a local Umbrel device and reinstalls apps.

**Location**: Main Pluto repository (`PlutoMining/pluto`)

**Usage**:
```bash
REMOTE_PATH=/path/to/remote UMBEL_HOST=host UMBEL_PASSWORD=pass \
  scripts/sync-umbrel-apps.sh
```

**Environment Variables**:
- `REMOTE_PATH` - Path to remote Umbrel apps directory (required)
- `UMBEL_HOST` - Umbrel device hostname or IP (required)
- `UMBEL_PASSWORD` - Umbrel device password (required)
- `UMBEL_USER` - Umbrel user (default: `umbrel`)
- `APPS_TO_SYNC` - Comma-separated list of apps to sync (default: `pluto,pluto-next`)

**What it does**:
- Rsyncs `umbrel-apps/` directory to Umbrel device
- Uninstalls existing app installations
- Reinstalls apps from updated manifests

**See**: [Local Testing Guide](./local-testing.md)

### `scripts/generate-changelog.sh`

Generates changelog from conventional commits using semantic-release.

**Location**: Main Pluto repository (`PlutoMining/pluto`)

**Usage**:
```bash
scripts/generate-changelog.sh [--dry-run] [--skip-commit]
```

**Options**:
- `--dry-run` - Preview what would be generated without making changes
- `--skip-commit` - Generate changelog without committing

**Requirements**:
- Must be on `main` branch (for actual generation)
- `semantic-release` installed (`npm install`)

**See**: [Changelog Generation Guide](./changelog.md)

### `scripts/update-pluto-from-registry.sh`

Pulls latest images for a given app version and updates the community store's manifests.

**Location**: Community store repository (`PlutoMining/umbrel-community-app-store`)

**Usage**:
```bash
scripts/update-pluto-from-registry.sh \
  --channel stable|beta \
  [--no-commit] \
  [--dry-run] \
  [--list-versions]
```

**What it does**:
- Resolves image digests for requested version
- Computes bundle fingerprint
- Updates `umbrel-app.yml` and `docker-compose.yml` if bundle changed
- Commits and pushes changes (unless `--no-commit`)

**See**: [Community Store Guide](./community-store.md)

## Environment Variables

All scripts support configuration via environment variables or `.env` file:

```bash
# .env file (not committed to git)
GITHUB_USERNAME=your_username
GITHUB_TOKEN=your_personal_access_token
DOCKER_REGISTRY=ghcr.io/plutomining
BETA_DIFF_BASE=origin/main
BETA_TAG_SUFFIX=beta
```

Command-line environment variables take precedence over `.env` file values.

## Error Handling

Scripts include:

- **Automatic retries**: Network operations (Docker builds, image pushes) are automatically retried with exponential backoff
- **Better error messages**: Clear, actionable error messages with context
- **Error recovery**: Scripts track progress and provide recovery suggestions on failure
- **Stack traces**: Enable with `--verbose` flag for debugging

## Validation

Pre-flight checks before starting a release:

- **Docker daemon**: Verifies Docker is running
- **Disk space**: Checks available disk space (warns if < 5GB)
- **Git state**: Validates git repository state
- **Version format**: Ensures all versions follow semantic versioning
- **Image existence**: Checks if images already exist in registry (skips rebuild if found)
- **Service versions**: Validates version consistency across services

## Logging

- **Colored output**: Color-coded messages (green for success, yellow for warnings, red for errors)
- **Progress indicators**: Visual progress for long-running operations
- **Structured output**: Clear sections and summaries
- **Verbose mode**: `--verbose` flag for detailed logging with timestamps
- **Quiet mode**: `--quiet` flag for minimal output (errors only)
