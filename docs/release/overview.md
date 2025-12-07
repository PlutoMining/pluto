# Release Process Overview

Pluto uses a two-stage release process:

1. **Publish Docker images** (source of truth: `PlutoMining/pluto`)
2. **Publish Umbrel apps via the community store** (source of truth: `PlutoMining/umbrel-community-app-store`)

There is also an optional **direct-to-device** flow for internal testing on a local Umbrel box.

## Release Types

### Stable Releases

Stable releases are built from the `main` branch and published to the `pluto` app. They use semantic versioning (e.g., `1.2.3`) and are intended for production use.

See [Stable Releases Guide](./stable-releases.md) for detailed instructions.

### Beta Releases

Beta releases are built from feature branches and published to the `pluto-next` app. They use pre-release versioning (e.g., `1.2.3-beta.0`) and are intended for testing new features before stable release.

See [Beta Releases Guide](./beta-releases.md) for detailed instructions.

## Quick Start

**Stable release:**
```bash
scripts/release.sh --bump-version --update-manifests
```

**Beta release:**
```bash
GITHUB_TOKEN=your_token scripts/beta-release.sh --bump-version --update-manifests
```

## Documentation Structure

- [Stable Releases](./stable-releases.md) - Guide for creating stable releases
- [Beta Releases](./beta-releases.md) - Guide for creating beta releases
- [Community Store](./community-store.md) - Publishing to Umbrel community app store
- [Local Testing](./local-testing.md) - Testing releases locally and deploying to Umbrel devices
- [Scripts Reference](./scripts.md) - Detailed documentation of all release scripts
- [Changelog Generation](./changelog.md) - Automatic changelog generation from commits
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions
