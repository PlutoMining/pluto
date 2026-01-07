# Beta Releases

> **This guide is for project maintainers who need to PUBLISH beta releases to the Docker registry.**
>
> Running `beta-release.sh` will **build and push Docker images to the public registry** (`ghcr.io/plutomining`), making them available to beta testers via the `pluto-next` Umbrel app. This is NOT for running the software locally.
>
> **For local development, use `make up` instead.** See the [Development Environment](../../README.md#development-environment).

Beta releases are built from feature branches and published to the `pluto-next` app. They use pre-release versioning (e.g., `1.2.3-beta.0`) and are intended for testing new features before stable release.

## Prerequisites

- Must NOT be on the `main` branch (beta releases come from feature branches)
- Branch must be up-to-date with `origin/main`
- All local commits must be pushed to remote
- CI tests must be passing
- Docker and Docker Compose installed
- Access to GitHub Container Registry (ghcr.io)
- `GITHUB_TOKEN` environment variable (for CI status checks)

## Pre-Release Checks

The script enforces several safety checks before building images:

1. **Branch validation**: Ensures you're not on the `main` branch
2. **Branch alignment**: Verifies your branch is up-to-date with `origin/main`
3. **Local/remote sync**: Ensures all local commits are pushed to remote
4. **Uncommitted files**: Warns if there are uncommitted changes and prompts for confirmation
5. **CI status**: Verifies that all CI tests are passing:
   - Blocks if CI is still running
   - Blocks if CI failed
   - Blocks if CI was cancelled
   - Allows only if CI passed successfully
   - Requires `GITHUB_TOKEN` environment variable

These checks ensure beta releases only happen from branches that are:
- Up-to-date with `main`
- Fully pushed to remote
- Passing all CI tests
- Clean working directory (or explicitly confirmed)

## Basic Usage

### Automated Release (Recommended)

```bash
GITHUB_TOKEN=your_token scripts/beta-release.sh --bump-version --update-manifests --sync-to-umbrel
```

This single command will:
- Run all pre-release checks
- Automatically bump `package.json` versions to beta (e.g., `1.1.2` → `1.1.3-beta.0`)
- Build and push Docker images for changed services
- Update `pluto-next` manifests with new image references
- Sync manifests to your Umbrel device and reinstall the app

### Auto-Detect Changed Services

The script automatically detects which services changed since `origin/main`:

```bash
GITHUB_TOKEN=your_token scripts/beta-release.sh --bump-version --update-manifests
```

### Build Specific Services

You can override auto-detection and specify services manually:

```bash
GITHUB_TOKEN=your_token scripts/beta-release.sh --services "backend,frontend" --bump-version --update-manifests
```

## Options

### Common Options

- `--skip-login` - Skip Docker login prompt (useful for CI/CD)
- `--bump-version` - Automatically bump `package.json` versions to beta:
  - If current version is stable (e.g., `1.1.2`) → bumps to `1.1.3-beta.0`
  - If current version is already beta (e.g., `1.1.3-beta.1`) → increments to `1.1.3-beta.2`
- `--update-manifests` - Update `pluto-next` umbrel-app manifests after building images
- `--sync-to-umbrel` - Sync manifests to Umbrel device (requires `--update-manifests`)
- `--skip-ci-check` - Skip CI status check (not recommended, only use if CI is unavailable)
- `--verbose` - Enable verbose logging with timestamps
- `--quiet` - Minimal output (errors only)
- `--dry-run` - Print actions without building/pushing or editing files

### Beta-Specific Options

- `--services "svc1,svc2"` - Comma-separated list of services to release (override auto-detection)
- `--app-version X.Y.Z-pr` - Explicit pluto-next app version to write into umbrel-app.yml
- `--diff-base <ref>` - Git ref (default: `origin/main`) used to detect changed services
- `--tag-suffix <suffix>` - Secondary tag pushed alongside the explicit version (default: `beta`)

## What It Does

1. **Pre-Release Checks**:
   - Validates branch (must not be `main`)
   - Checks branch alignment with `origin/main`
   - Verifies all commits are pushed
   - Checks CI status (requires `GITHUB_TOKEN`)

2. **Service Detection**:
   - Detects which services changed since `origin/main` (or uses `--services`)
   - Only builds images for changed services

3. **Version Management**:
   - Reads prerelease versions from each service's `package.json` (e.g., `1.5.0-beta.1`)
   - With `--bump-version`: Automatically bumps to beta versions

4. **Image Building**:
   - Builds multi-arch images (linux/amd64, linux/arm64) for selected services
   - Pushes to GitHub Container Registry:
     - `ghcr.io/plutomining/pluto-<service>:<pre-release-version>`
     - `ghcr.io/plutomining/pluto-<service>:<tag-suffix>` (default: `beta`)

5. **Local Files**:
   - Automatically updates `docker-compose.next.local.yml` with new image references

6. **Manifest Updates** (if `--update-manifests` is used):
   - Updates `umbrel-apps/pluto-next/umbrel-app.yml` and `docker-compose.yml`
   - Resolves image digests and pins them
   - Bumps app version based on service version changes

## Examples

**Fully automated (auto-detect services):**
```bash
GITHUB_TOKEN=your_token scripts/beta-release.sh --bump-version --update-manifests --sync-to-umbrel
```

**Build specific services:**
```bash
GITHUB_TOKEN=your_token scripts/beta-release.sh --services "backend,frontend" --bump-version --update-manifests
```

**CI/CD usage:**
```bash
GITHUB_TOKEN=your_token scripts/beta-release.sh --skip-login --services backend --bump-version --update-manifests
```

**Skip CI check (not recommended):**
```bash
scripts/beta-release.sh --skip-ci-check --bump-version --update-manifests
```

**Preview without executing:**
```bash
scripts/beta-release.sh --dry-run
```

## Environment Variables

```bash
# .env file (not committed to git)
GITHUB_USERNAME=your_username
GITHUB_TOKEN=your_personal_access_token
DOCKER_REGISTRY=ghcr.io/plutomining
BETA_DIFF_BASE=origin/main
BETA_TAG_SUFFIX=beta
```

The `GITHUB_TOKEN` is required for CI status checks. It needs the `repo` scope. If not set, the script will prompt for it.

## Version Bumping

When `--bump-version` is used:

- **Stable → Beta**: `1.1.2` → `1.1.3-beta.0`
- **Beta → Beta**: `1.1.3-beta.0` → `1.1.3-beta.1`

The script automatically increments the beta number for subsequent releases.

## Changelog

Changelog generation is **skipped for beta releases** to prevent duplicate entries when the branch is later merged to `main` and a stable release is made. The changelog is only generated on stable releases (on `main` branch) after PR merge.

## Next Steps

After building and pushing images:

1. **Test locally** (see [Local Testing](./local-testing.md))
2. **Publish to community store** (see [Community Store](./community-store.md))
