# Local Testing and Deployment

This guide covers testing releases locally and deploying directly to Umbrel devices for internal testing.

## Local Testing with Production Images

After running the release scripts, you can test the exact production images locally using the updated compose files.

### Stable Releases

```bash
# Start stable release services locally
make up-stable

# View logs (optionally specify SERVICE=<name>)
make logs-stable SERVICE=backend

# Stop services
make down-stable
```

Or using Docker Compose directly:
```bash
docker compose -f docker-compose.release.local.yml up -d
docker compose -f docker-compose.release.local.yml logs -f
docker compose -f docker-compose.release.local.yml down
```

### Beta Releases

```bash
# Start beta release services locally
make up-beta

# View logs (optionally specify SERVICE=<name>)
make logs-beta SERVICE=backend

# Stop services
make down-beta
```

Or using Docker Compose directly:
```bash
docker compose -f docker-compose.next.local.yml up -d
docker compose -f docker-compose.next.local.yml logs -f
docker compose -f docker-compose.next.local.yml down
```

### Compose Files

These commands use:
- `docker-compose.release.local.yml` (stable) - automatically updated by `scripts/release.sh`
- `docker-compose.next.local.yml` (beta) - automatically updated by `scripts/beta-release.sh`

The release scripts automatically update these files with the latest image references, allowing you to test the exact same images that will be deployed to Umbrel, but run locally for faster iteration and debugging.

## Direct Deployment to Umbrel Device

For internal/dev testing on a specific Umbrel box, you can deploy directly from the Pluto repo. This flow automatically updates local Umbrel app manifests and optionally syncs them to your device.

### Automated Deployment

The release scripts support direct deployment with the `--sync-to-umbrel` flag.

#### Stable Release

**Fully automated (recommended):**
```bash
# Build/push images, bump versions, update manifests, and sync to device in one command
scripts/release.sh --bump-version --update-manifests --sync-to-umbrel

# For CI/CD (skip interactive login):
scripts/release.sh --skip-login --bump-version --update-manifests --sync-to-umbrel
```

This single command will:
- Automatically bump `package.json` versions (patch increment)
- Build and push Docker images
- Update `pluto` manifests with new image references
- Sync manifests to your Umbrel device and reinstall the app

**Two-step process:**
```bash
# Build/push images first (with optional version bumping)
scripts/release.sh --bump-version

# Update local manifests and sync to Umbrel device
scripts/local-publish.sh --channel stable --sync-to-umbrel
```

Use the two-step process if you want more control over the process or prefer interactive version prompts.

#### Beta Release

**Fully automated (recommended for testing):**
```bash
# Build/push images, bump versions, update manifests, and sync to device in one command
# Note: Requires GITHUB_TOKEN env var for CI checks, or will prompt for it
GITHUB_TOKEN=your_token scripts/beta-release.sh --services backend --bump-version --update-manifests --sync-to-umbrel

# For CI/CD (skip interactive login, CI check still runs):
GITHUB_TOKEN=your_token scripts/beta-release.sh --skip-login --services backend --bump-version --update-manifests --sync-to-umbrel

# Auto-detect changed services:
GITHUB_TOKEN=your_token scripts/beta-release.sh --bump-version --update-manifests --sync-to-umbrel
```

This single command will:
- Run pre-release checks (branch alignment, commits pushed, CI passing)
- Automatically bump `package.json` versions to beta
- Build and push Docker images
- Update `pluto-next` manifests with new image references
- Sync manifests to your Umbrel device and reinstall the app

**Two-step process:**
```bash
# Build/push images first (with optional version bumping)
scripts/beta-release.sh --services backend --bump-version

# Update local manifests and sync to Umbrel device
scripts/local-publish.sh --channel beta --sync-to-umbrel
```

Use the two-step process if you want more control or are updating multiple services.

### Manual Sync

You can also sync manifests manually after updating them:

```bash
# Sync both stable and beta (default)
scripts/sync-umbrel-apps.sh

# Sync only stable
APPS_TO_SYNC=pluto scripts/sync-umbrel-apps.sh

# Sync only beta
APPS_TO_SYNC=pluto-next scripts/sync-umbrel-apps.sh
```

### Sync Script Configuration

The `sync-umbrel-apps.sh` script requires environment variables:

```bash
# Required
REMOTE_PATH=/path/to/remote/umbrel/apps
UMBEL_HOST=your-umbrel-host
UMBEL_PASSWORD=your-umbrel-password

# Optional (defaults shown)
UMBEL_USER=umbrel
APPS_TO_SYNC=pluto,pluto-next
```

You can set these in a `.env` file or export them before running the script.

### What Sync Does

1. **Rsyncs manifests**: Copies `umbrel-apps/` directory to the Umbrel device
2. **Uninstalls apps**: Removes existing app installations
3. **Reinstalls apps**: Installs apps from the updated manifests

This ensures your Umbrel device is running the exact same images as defined in the manifests.

## Local Publish Script

The `local-publish.sh` script is a wrapper that simplifies updating local Umbrel manifests.

### Usage

```bash
scripts/local-publish.sh --channel stable|beta [--sync-to-umbrel]
```

### What It Does

1. **Infers parameters** from the `--channel` flag:
   - App name (`pluto` for stable, `pluto-next` for beta)
   - Manifest and compose file paths

2. **Reads service versions** from each service's `package.json`:
   - `backend`, `discovery`, `frontend`, `grafana`, `prometheus`

3. **Resolves image digests** automatically:
   - Builds image tags: `ghcr.io/plutomining/pluto-<service>:<version>`
   - Uses `docker buildx imagetools inspect` to get SHA256 digests

4. **Updates manifests** using the same version-bump logic as the community store:
   - Calls `scripts/bump-umbrel-app-version.sh` internally
   - Bumps app version in `umbrel-app.yml` if the image bundle changed
   - Updates `docker-compose.yml` with new image refs pinned to digests

5. **Optionally syncs to device** (if `--sync-to-umbrel` is passed):
   - Runs `scripts/sync-umbrel-apps.sh` to rsync manifests and reinstall apps

Without `--sync-to-umbrel`, the script only updates local manifests. You can then manually run `scripts/sync-umbrel-apps.sh` later if needed.

This gives you a fast, automated inner loop for testing new builds before pushing anything to the community store.
