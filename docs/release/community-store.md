# Publishing to Umbrel Community App Store

After building and pushing Docker images from the main Pluto repository, the final step is to publish the updated app to the Umbrel community app store so users can install or update Pluto.

## Overview

The Umbrel app manifests for public users live in a separate repository:

- **Repository**: `PlutoMining/umbrel-community-app-store`
- **Purpose**: Hosts `umbrel-app.yml` and `docker-compose.yml` for the Umbrel app store

This separation ensures that:
1. The main Pluto repo remains focused on development
2. App store manifests can be updated independently
3. Users get stable, verified releases through the official app store

## Publishing Workflow

### 1. Build and Push Images (Main Repo)

First, build and push images from the main Pluto repository:

**Stable release:**
```bash
scripts/release.sh --bump-version --update-manifests
```

**Beta release:**
```bash
GITHUB_TOKEN=your_token scripts/beta-release.sh --bump-version --update-manifests
```

### 2. Update Community Store Manifests

After images are pushed to the registry, update the community store:

```bash
# Clone the community store repository
git clone https://github.com/PlutoMining/umbrel-community-app-store.git
cd umbrel-community-app-store

# Update stable release
scripts/update-pluto-from-registry.sh --channel stable

# Or update beta release
scripts/update-pluto-from-registry.sh --channel beta
```

### 3. Script Options

The `update-pluto-from-registry.sh` script supports several options:

```bash
scripts/update-pluto-from-registry.sh \
  --channel stable|beta \
  [--no-commit] \
  [--dry-run] \
  [--list-versions]
```

**Options:**
- `--channel stable|beta` - Target release channel
- `--no-commit` - Update files without committing
- `--dry-run` - Preview changes without making them
- `--list-versions` - List available versions in the registry

### 4. What the Script Does

1. **Resolves image digests** - Fetches SHA256 digests for the requested version
2. **Computes bundle fingerprint** - Determines if the image bundle has changed
3. **Updates manifests** - Modifies `umbrel-app.yml` and `docker-compose.yml`
4. **Commits and pushes** - Commits changes (unless `--no-commit` is specified)

## GitHub Action Workflow

For maintainers, there's also a GitHub Action workflow that can be triggered manually:

- **Workflow**: `.github/workflows/update-pluto.yml`
- **Location**: Community store repository

This allows updating the app store directly from the GitHub UI without cloning the repository locally.

## Version Synchronization

The community store scripts automatically:
- Pin images to specific SHA256 digests for reproducibility
- Bump app version based on service version changes
- Maintain consistency between stable (`pluto`) and beta (`pluto-next`) apps

## After Publishing

Once changes are pushed to the community store repository:
1. Umbrel users will see the update available in their app store
2. Users can update to the new version through the Umbrel UI
3. The app store shows the updated version number and changelog

## Troubleshooting

### Update script fails to find images

Ensure images were pushed to the registry:
```bash
# Check if image exists
docker manifest inspect ghcr.io/plutomining/pluto-backend:1.2.3
```

### Version mismatch

If the app version doesn't match expectations:
1. Check the service versions in `package.json` files
2. Verify the bundle fingerprint calculation
3. Use `--dry-run` to preview changes before applying

### Authentication issues

The script may require GitHub authentication:
```bash
# Set token for private registry access
export GITHUB_TOKEN=your_token
```

## Related Documentation

- [Stable Releases](./stable-releases.md) - Building stable releases
- [Beta Releases](./beta-releases.md) - Building beta releases
- [Scripts Reference](./scripts.md) - Detailed script documentation
