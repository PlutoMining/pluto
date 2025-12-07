# Stable Releases

Stable releases are built from the `main` branch and published to the `pluto` app. They use semantic versioning (e.g., `1.2.3`) and are intended for production use.

## Prerequisites

- Must be on the `main` branch
- Docker and Docker Compose installed
- Access to GitHub Container Registry (ghcr.io)
- (Optional) Umbrel setup for local testing

## Basic Usage

### Interactive Release

The simplest way to create a release is to run the script interactively:

```bash
scripts/release.sh
```

This will:
- Prompt for version numbers for each service
- Build and push Docker images
- Update local compose files for testing

### Automated Release

For fully automated releases:

```bash
scripts/release.sh --bump-version --update-manifests --sync-to-umbrel
```

This single command will:
- Automatically bump `package.json` versions (patch increment, e.g., `1.1.2` → `1.1.3`)
- Build and push Docker images
- Update `pluto` manifests with new image references
- Sync manifests to your Umbrel device and reinstall the app

### CI/CD Usage

For automated CI/CD pipelines:

```bash
scripts/release.sh --skip-login --bump-version --update-manifests
```

## Options

### Common Options

- `--skip-login` - Skip Docker login prompt (useful for CI/CD)
- `--bump-version` - Automatically bump `package.json` versions (patch increment)
- `--update-manifests` - Update `pluto` umbrel-app manifests after building images
- `--sync-to-umbrel` - Sync manifests to Umbrel device (requires `--update-manifests`)
- `--skip-changelog` - Skip automatic changelog generation
- `--verbose` - Enable verbose logging with timestamps
- `--quiet` - Minimal output (errors only)
- `--dry-run` - Print actions without building/pushing or editing files

## What It Does

For each service (`backend`, `discovery`, `frontend`, `grafana`, `prometheus`):

1. **Version Management**:
   - Prompts for the version to use (or keeps current if `--bump-version` is not used)
   - With `--bump-version`: Automatically increments patch version (e.g., `1.1.2` → `1.1.3`)

2. **Image Building**:
   - Builds multi-arch images (linux/amd64, linux/arm64) with `docker buildx`
   - Pushes to GitHub Container Registry:
     - `ghcr.io/plutomining/pluto-<service>:<version>`
     - `ghcr.io/plutomining/pluto-<service>:latest`

3. **Local Files**:
   - Automatically updates `docker-compose.release.local.yml` with new image references
   - This allows local testing of the exact production images

4. **Manifest Updates** (if `--update-manifests` is used):
   - Updates `umbrel-apps/pluto/umbrel-app.yml` and `docker-compose.yml`
   - Resolves image digests and pins them
   - Bumps app version based on service version changes

5. **Changelog Generation** (automatic, unless `--skip-changelog`):
   - Generates changelog from conventional commits
   - Creates git tags
   - Updates `CHANGELOG.md`

## Examples

**Fully automated release:**
```bash
scripts/release.sh --bump-version --update-manifests --sync-to-umbrel
```

**CI/CD release:**
```bash
scripts/release.sh --skip-login --bump-version --update-manifests
```

**Preview without executing:**
```bash
scripts/release.sh --dry-run
```

**Interactive version prompts:**
```bash
scripts/release.sh
```

## Environment Variables

You can configure the release process via environment variables or a `.env` file:

```bash
# .env file (not committed to git)
GITHUB_USERNAME=your_username
GITHUB_TOKEN=your_personal_access_token
DOCKER_REGISTRY=ghcr.io/plutomining
```

The scripts automatically load these values, with command-line environment variables taking precedence.

## Next Steps

After building and pushing images:

1. **Test locally** (see [Local Testing](./local-testing.md))
2. **Publish to community store** (see [Community Store](./community-store.md))
