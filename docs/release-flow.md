# Pluto Release Flow

This document provides an overview of the Pluto release process. For detailed guides, see the [Release Documentation](./release/).

## Overview

Pluto uses a two-stage release process:

1. **Publish Docker images** (source of truth: `PlutoMining/pluto`)
2. **Publish Umbrel apps via the community store** (source of truth: `PlutoMining/umbrel-community-app-store`)

There is also an optional **direct-to-device** flow for internal testing on a local Umbrel box.

## Quick Start

**Stable release:**
```bash
scripts/release.sh --bump-version --update-manifests
```

**Beta release:**
```bash
GITHUB_TOKEN=your_token scripts/beta-release.sh --bump-version --update-manifests
```

## Release Types

### Stable Releases

Stable releases are built from the `main` branch and published to the `pluto` app. They use semantic versioning (e.g., `1.2.3`) and are intended for production use.

See [Stable Releases Guide](./release/stable-releases.md) for detailed instructions.

### Beta Releases

Beta releases are built from feature branches and published to the `pluto-next` app. They use pre-release versioning (e.g., `1.2.3-beta.0`) and are intended for testing new features before stable release.

See [Beta Releases Guide](./release/beta-releases.md) for detailed instructions.

## Documentation

- [Release Overview](./release/overview.md) - High-level overview of the release process
- [Stable Releases](./release/stable-releases.md) - Guide for creating stable releases
- [Beta Releases](./release/beta-releases.md) - Guide for creating beta releases
- [Community Store](./release/community-store.md) - Publishing to Umbrel community app store
- [Local Testing](./release/local-testing.md) - Testing releases locally and deploying to Umbrel devices
- [Scripts Reference](./release/scripts.md) - Detailed documentation of all release scripts
- [Changelog Generation](./release/changelog.md) - Automatic changelog generation from commits
- [Troubleshooting](./release/troubleshooting.md) - Common issues and solutions

## Process Flow

### 1. Publish Docker Images

All image publishing happens from the main Pluto repository using release scripts:

- **Stable**: `scripts/release.sh` - Builds and pushes stable images
- **Beta**: `scripts/beta-release.sh` - Builds and pushes beta images

Images are published to GitHub Container Registry (`ghcr.io/plutomining`).

### 2. Publish to Umbrel Community Store

The Umbrel app manifests for public users live in the community store repository. Updates are made via:

- **Update script**: `scripts/update-pluto-from-registry.sh` (in community store repo)
- **GitHub Action**: `.github/workflows/update-pluto.yml` - Manual workflow for maintainers

The update script resolves image digests, computes bundle fingerprints, and bumps app versions automatically.

### 3. Optional: Direct Device Deployment

For internal testing, you can deploy directly to a local Umbrel device:

- Use `--sync-to-umbrel` flag with release scripts
- Or use `scripts/local-publish.sh` for manual updates
- Or use `scripts/sync-umbrel-apps.sh` to sync manifests

## Scripts Summary

### Pluto Repository Scripts

- `scripts/release.sh` - Build and push stable images
- `scripts/beta-release.sh` - Build and push beta images
- `scripts/local-publish.sh` - Update local manifests and optionally sync to device
- `scripts/bump-umbrel-app-version.sh` - Low-level helper for updating manifests
- `scripts/sync-umbrel-apps.sh` - Sync manifests to Umbrel device
- `scripts/generate-changelog.sh` - Generate changelog from commits
- `scripts/lib/common.sh` - Shared library with common functions

### Community Store Repository Scripts

- `scripts/update-pluto-from-registry.sh` - Update store manifests from registry
- `.github/workflows/update-pluto.yml` - GitHub Action workflow

## Key Features

- **Automatic version bumping** - Scripts automatically bump versions based on changes
- **Bundle fingerprinting** - Detects when image bundles change
- **Multi-arch builds** - Builds for both linux/amd64 and linux/arm64
- **Pre-release checks** - Beta releases enforce branch alignment and CI passing
- **Changelog generation** - Automatic changelog from conventional commits
- **Error handling** - Automatic retries and clear error messages
- **Validation** - Pre-flight checks for Docker, disk space, git state, etc.

For detailed information on any of these topics, see the [Release Documentation](./release/).
