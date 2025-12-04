# Pluto Project

## Overview

Pluto is an open-source control platform designed for managing and monitoring open-source bitcoin mining devices such as Bitaxe, NerdAxe, and other similar miners. The platform provides a comprehensive interface for controlling multiple miners, collecting performance metrics, and visualizing data in real-time. Pluto leverages microservices architecture and Docker for modularity, ease of development, and deployment. It provides a comprehensive system for backend processing, frontend visualization, and monitoring. The project is intended to run on Umbrel or similar environments with service dependencies such as `Prometheus` and `Grafana` for monitoring.

This README provides information on both the **development** and **release** configurations of the Pluto project.

## Prerequisites

- Docker and Docker Compose installed on your system.
- Access to a container registry for pulling the Pluto images (by default **GitHub Container Registry** at `ghcr.io/plutomining`).
- (Optional) Umbrel setup for deploying the application.

## Service Architecture

The project comprises several interdependent services:

1. **app_proxy**: Acts as a reverse proxy for routing frontend traffic.
2. **mock**: Simulates multiple devices and generates test data for development and testing purposes.
3. **discovery**: Discovers devices on the network and interfaces with the mock service for simulating device communication.
4. **backend**: Core processing service that interfaces with the discovery service and handles data management.
5. **frontend**: User interface for interacting with the system.
6. **prometheus**: Metrics collection and monitoring.
7. **grafana**: Visualization and dashboard service for monitoring the system.
8. **prometheus-init, grafana-init, leveldb-init**: Initialization containers that prepare the required volumes for Prometheus, Grafana, and LevelDB, respectively.

## Development Environment

### Configuration

- The development environment uses locally built Docker images with `Dockerfile.development` for each service.
- Configurations are set using environment variables or `.env` files.
- The services run in host mode for ease of debugging and development.
- The development compose file is `docker-compose.dev.local.yml`.
- A Makefile is provided for convenient command shortcuts (see `make help` for all available commands).

### Build and Start

Using Makefile (recommended):
```bash
make up
```

Or using Docker Compose directly:
```bash
docker compose -f docker-compose.dev.local.yml up --build
```

### Stop Services

Using Makefile (recommended):
```bash
make down
```

Or using Docker Compose directly:
```bash
docker compose -f docker-compose.dev.local.yml down
```

### Service Ports

- **Mock Service**: [http://localhost:7770](http://localhost:7770)
- **Backend**: [http://localhost:7776](http://localhost:7776)
- **Frontend**: [http://localhost:7777](http://localhost:7777)
- **Prometheus**: [http://localhost:9090](http://localhost:9090)
- **Grafana**: [http://localhost:3000](http://localhost:3000)

## Release Environment

### Configuration

The release environment uses pre-built Docker images hosted on GitHub Container Registry. The service configurations, such as environment variables and volume mounts, are tailored for deployment in production environments like Umbrel.

The actual release compose files are located in:
- `umbrel-apps/pluto/docker-compose.yml` (stable releases)
- `umbrel-apps/pluto-next/docker-compose.yml` (beta releases)

For local testing of production-like images, use:
- `docker-compose.release.local.yml` (stable releases)
- `docker-compose.next.local.yml` (beta releases)

### Setup and Start

For Umbrel deployment, the compose files in `umbrel-apps/` are used automatically by Umbrel.

For local testing of release images:

**Stable release:**
```bash
make up-stable
# or
docker compose -f docker-compose.release.local.yml up -d
```

**Beta release:**
```bash
make up-beta
# or
docker compose -f docker-compose.next.local.yml up -d
```

### Stop Services

**Stable release:**
```bash
make down-stable
# or
docker compose -f docker-compose.release.local.yml down
```

**Beta release:**
```bash
make down-beta
# or
docker compose -f docker-compose.next.local.yml down
```

### Service Images

In the release setup, Pluto services are pulled from **GitHub Container Registry** under the `ghcr.io/plutomining` namespace. Exact tags (and image digests) are pinned in the Umbrel app manifests (see `umbrel-apps/pluto` and `umbrel-apps/pluto-next`) and may evolve over time with new releases, but they follow the pattern:

- `ghcr.io/plutomining/pluto-mock:<version>`
- `ghcr.io/plutomining/pluto-discovery:<version>`
- `ghcr.io/plutomining/pluto-backend:<version>`
- `ghcr.io/plutomining/pluto-frontend:<version>`
- `ghcr.io/plutomining/pluto-prometheus:<version>`
- `ghcr.io/plutomining/pluto-grafana:<version>`

The monitoring stack still relies on upstream base images:

- `prom/prometheus:v2.53.1`
- `grafana/grafana:11.1.2`

### Service Ports

- **Mock Service**: `7770` (Main mock service port)
- **Backend**: `7776`
- **Frontend**: `7777`
- **Prometheus**: `9090` (If exposed)
- **Grafana**: `3000` (If exposed)

### Volume Mapping

The release configuration uses external directories for persistent data storage:

- Prometheus: `/home/umbrel/umbrel/app-data/pluto/data/prometheus`
- Grafana: `/home/umbrel/umbrel/app-data/pluto/data/grafana`
- Backend Data: `/home/umbrel/umbrel/app-data/pluto/data/leveldb`

### Stable vs Beta (pluto-next) Releases

Both release scripts support full automation with common options:

**Common options (both scripts):**
- `--skip-login` - Skip Docker login prompt (useful for CI/CD)
- `--bump-version` - Automatically bump package.json versions
- `--update-manifests` - Update umbrel-app manifests after building images
- `--sync-to-umbrel` - Sync manifests to Umbrel device (requires `--update-manifests`)
- `--dry-run` - Print actions without executing

**Stable releases (`scripts/release.sh`):**
- Builds and pushes stable images for the `pluto` app
- Requires `main` branch
- Bumps versions with patch increment (e.g., `1.1.2` → `1.1.3`)
- Automatically updates `docker-compose.release.local.yml` with new image references

**Beta releases (`scripts/beta-release.sh`):**
- Builds and pushes beta images for the `pluto-next` app
- Detects changed services relative to `origin/main` (or use `--services`)
- Bumps versions to beta (e.g., `1.1.2` → `1.1.3-beta.0`)
- Automatically updates `docker-compose.next.local.yml` with new image references
- **Enforces pre-release checks**: branch alignment, all commits pushed, CI passing
- Beta-specific options: `--services`, `--app-version`, `--diff-base`, `--tag-suffix`

#### Examples

**Stable release:**
```bash
# Fully automated: build, bump versions, update manifests, sync to device
scripts/release.sh --bump-version --update-manifests --sync-to-umbrel

# For CI/CD (skip interactive login)
scripts/release.sh --skip-login --bump-version --update-manifests --sync-to-umbrel

# Interactive version prompts
scripts/release.sh

# Preview without executing
scripts/release.sh --dry-run
```

**Beta release:**
```bash
# Fully automated: build changed services, bump versions, update manifests, sync to device
# Note: Requires GITHUB_TOKEN env var for CI checks, or will prompt for it
GITHUB_TOKEN=your_token scripts/beta-release.sh --bump-version --update-manifests --sync-to-umbrel

# Build specific services only
scripts/beta-release.sh --services "backend,frontend" --bump-version --update-manifests --sync-to-umbrel

# For CI/CD (skip interactive login, CI check still runs)
GITHUB_TOKEN=your_token scripts/beta-release.sh --skip-login --services backend --bump-version --update-manifests --sync-to-umbrel

# Skip CI check (not recommended, only if CI unavailable)
scripts/beta-release.sh --skip-ci-check --bump-version --update-manifests --sync-to-umbrel

# Preview without executing
scripts/beta-release.sh --dry-run
```

**Environment overrides:**

- `DOCKER_REGISTRY`: default `ghcr.io/plutomining`
- `BETA_DIFF_BASE`: default `origin/main` (beta-release.sh only)
- `BETA_TAG_SUFFIX`: default `beta` (beta-release.sh only)
- `GITHUB_TOKEN`: GitHub Personal Access Token for CI status checks (beta-release.sh only). Token needs `repo` scope. If not set, script will prompt for it.

**Configuration via `.env` file:**

You can create a `.env` file in the project root to avoid interactive prompts:

```bash
# .env file (not committed to git)
GITHUB_USERNAME=your_username
GITHUB_TOKEN=your_personal_access_token
```

The scripts will automatically load these values, with command-line environment variables taking precedence. This is especially useful for CI/CD environments or to avoid repeated prompts during development.

#### Pre-release checks for beta releases

The `beta-release.sh` script enforces several safety checks before building images:

1. **Branch validation**: Must not be on `main` branch (beta releases come from feature branches)
2. **Branch alignment**: Branch must be up-to-date with `origin/main` (prevents releasing from outdated branches)
3. **All commits pushed**: All local commits must be pushed to remote (prevents releasing unpublished code)
4. **Uncommitted files**: Warns if working directory has uncommitted changes (user can confirm to proceed)
5. **CI status**: Verifies all CI tests are passing:
   - Blocks if CI is running, failed, or cancelled
   - Only allows release if CI passed
   - Requires `GITHUB_TOKEN` environment variable (or prompts for it)
   - Can be skipped with `--skip-ci-check` (not recommended)

These checks ensure beta releases only happen from tested, up-to-date branches.

#### Deploying to Umbrel

```bash
# Sync both stable and beta (default)
scripts/sync-umbrel-apps.sh

# Sync only stable
APPS_TO_SYNC=pluto scripts/sync-umbrel-apps.sh

# Sync only beta
APPS_TO_SYNC=pluto-next scripts/sync-umbrel-apps.sh
```

#### Local testing with production-like images

After running the release scripts, you can test the exact production images locally using the updated compose files. The release scripts automatically update these files with the latest image references:

**For stable releases:**
```bash
# Start stable release services locally
make up-stable

# View logs (optionally specify SERVICE=<name>)
make logs-stable SERVICE=backend

# Stop services
make down-stable
```

**For beta releases:**
```bash
# Start beta release services locally
make up-beta

# View logs (optionally specify SERVICE=<name>)
make logs-beta SERVICE=backend

# Stop services
make down-beta
```

These commands use:
- `docker-compose.release.local.yml` (stable) - automatically updated by `scripts/release.sh`
- `docker-compose.next.local.yml` (beta) - automatically updated by `scripts/beta-release.sh`

This allows you to test the exact same images that will be deployed to Umbrel, but run locally for faster iteration and debugging.

#### Script Architecture

All release and deployment scripts share a common library (`scripts/lib/common.sh`) that provides:

- **Logging functions**: `log()` and `err()` for consistent output formatting
- **Docker operations**: `get_image_sha()`, `get_image_sha_safe()`, `image_exists()` for image management
- **GitHub integration**: `get_github_repo()` for repository detection
- **Environment management**: `load_env_file()` for loading `.env` files with proper variable precedence
- **Utility functions**: `command_exists()` for dependency checking

This shared library ensures consistency across all scripts and makes maintenance easier. Each script sets a `SCRIPT_NAME` variable before sourcing the library to enable proper logging prefixes.

#### Installing via the Pluto community app store

In addition to syncing manifests directly to a local Umbrel box, Pluto publishes its Umbrel apps to a dedicated community app store at `https://github.com/PlutoMining/umbrel-community-app-store`.

## Service Details

### app_proxy

- **Role**: Acts as a reverse proxy, routing traffic to the frontend service.
- **Dependencies**: Starts only after the frontend service is ready.

### mock

- **Role**: Simulates multiple devices and provides test data for development and testing.
- **Environment Variables**:
  - `LISTING_PORT`: Port used by the mock service for device listings.
  - `PORTS`: List of ports used by the mock service for device communication.

### discovery

- **Role**: Discovers devices on the network and interfaces with the mock service.
- **Environment Variables**:
  - `PORT`: Discovery service port.
  - `DETECT_MOCK_DEVICES`: Enables mock device detection.
  - `MOCK_DISCOVERY_HOST`: URL for the mock service.
  - `ARP_SCAN_IFACES`: Network interfaces used for ARP scanning.

### backend

- **Role**: Core data processing service.
- **Environment Variables**:
  - `PORT`: Backend service port.
  - `AUTO_LISTEN`: Enables automatic listening for incoming connections.
  - `DISCOVERY_SERVICE_HOST`: URL for the discovery service.

### frontend

- **Role**: User interface for interacting with the system.
- **Environment Variables**:
  - `PORT`: Frontend service port.
  - `BACKEND_DESTINATION_HOST`: URL for the backend service.
  <!-- - `NEXT_PUBLIC_WS_ROOT`: WebSocket root URL for frontend communication. -->

### prometheus

- **Role**: Monitoring and metrics collection service.
- **Volumes**:
  - `/prometheus`: Data storage for Prometheus.

### grafana

- **Role**: Visualization and dashboard service.
- **Environment Variables**:
  - `GF_SECURITY_ADMIN_USER`: Grafana admin username.
  - `GF_SECURITY_ADMIN_PASSWORD`: Grafana admin password.
  - `GF_INSTALL_PLUGINS`: Plugins to be installed in Grafana.
- **Volumes**:
  - `/var/lib/grafana`: Data storage for Grafana.

## Troubleshooting

1. Check logs for any service issues:

   Using Makefile:
   ```bash
   make logs SERVICE=<service_name>
   ```

   Or using Docker Compose directly:
   ```bash
   docker compose -f docker-compose.dev.local.yml logs <service_name>
   ```

2. Ensure the necessary environment variables are correctly set, either in the `.env` files or directly in the compose files.

3. If services fail to start, verify that the required Docker volumes have correct permissions:
   ```bash
   sudo chown -R <user>:<group> /path/to/volume
   ```

4. View service status:
   ```bash
   make status
   # or
   docker compose -f docker-compose.dev.local.yml ps
   ```

## License

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0). See the [LICENSE](LICENSE) file for more details.
