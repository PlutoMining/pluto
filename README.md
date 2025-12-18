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

### Initial Setup

Before starting services for the first time, run the setup script to create data directories with correct permissions and initialize environment files:

```bash
make setup
```

This will:
- Create data directories for Prometheus, Grafana, and LevelDB with correct ownership
- Copy `.env.tpl` files to `.env.local` for each service
- Set executable permissions on entrypoint scripts

> **Note**: This step requires `sudo` to set correct directory ownership. If you skip this step, services like Prometheus may fail with "permission denied" errors.

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

## Publishing Releases (Maintainers Only)

> **WARNING: This section is for project maintainers who need to PUBLISH new versions to the Docker registry.**
>
> **If you just want to run Pluto locally, use the [Development Environment](#development-environment) section above.**
>
> The release scripts (`release.sh` and `beta-release.sh`) build Docker images and **push them to the public GitHub Container Registry**. They do NOT simply "run the software on your machine".

### What Release Scripts Do

The release scripts perform the following actions:
1. **Build** multi-architecture Docker images (amd64 + arm64)
2. **Push** images to `ghcr.io/plutomining` (public registry)
3. **Update** version numbers in package.json files
4. **Update** Umbrel app manifests

This is the publishing workflow for making new versions available to all Pluto users.

### Publishing Commands

**Stable release (from `main` branch):**
```bash
scripts/release.sh --bump-version --update-manifests
```

**Beta release (from feature branch):**
```bash
GITHUB_TOKEN=your_token scripts/beta-release.sh --bump-version --update-manifests
```

### Testing Published Images Locally

After publishing, maintainers can test the exact published images locally before they reach users:

**Test stable release images:**
```bash
make up-stable
make logs-stable SERVICE=backend
make down-stable
```

**Test beta release images:**
```bash
make up-beta
make logs-beta SERVICE=backend
make down-beta
```

These commands pull and run the published images from the registry:
- `docker-compose.release.local.yml` (stable) - uses images published by `scripts/release.sh`
- `docker-compose.next.local.yml` (beta) - uses images published by `scripts/beta-release.sh`

> **Note**: These commands require the images to already exist in the registry. For local development without publishing, use `make up` instead.

### Service Images

Pluto services are pulled from **GitHub Container Registry** under the `ghcr.io/plutomining` namespace:

- `ghcr.io/plutomining/pluto-mock:<version>`
- `ghcr.io/plutomining/pluto-discovery:<version>`
- `ghcr.io/plutomining/pluto-backend:<version>`
- `ghcr.io/plutomining/pluto-frontend:<version>`
- `ghcr.io/plutomining/pluto-prometheus:<version>`
- `ghcr.io/plutomining/pluto-grafana:<version>`

The monitoring stack uses upstream base images:
- `prom/prometheus:v2.53.1`
- `grafana/grafana:11.1.2`

### Service Ports

- **Mock Service**: `7770`
- **Backend**: `7776`
- **Frontend**: `7777`
- **Prometheus**: `9090` (if exposed)
- **Grafana**: `3000` (if exposed)

### Volume Mapping

The release configuration uses external directories for persistent data storage:

- Prometheus: `/home/umbrel/umbrel/app-data/pluto/data/prometheus`
- Grafana: `/home/umbrel/umbrel/app-data/pluto/data/grafana`
- Backend Data: `/home/umbrel/umbrel/app-data/pluto/data/leveldb`

### Release Documentation

For detailed information about the release process, see the [Release Flow Documentation](docs/release-flow.md):

- [Release Overview](docs/release/overview.md) - High-level overview
- [Stable Releases](docs/release/stable-releases.md) - Creating stable releases
- [Beta Releases](docs/release/beta-releases.md) - Creating beta releases
- [Community Store](docs/release/community-store.md) - Publishing to Umbrel community app store
- [Local Testing](docs/release/local-testing.md) - Testing and deploying locally
- [Scripts Reference](docs/release/scripts.md) - Detailed script documentation
- [Changelog Generation](docs/release/changelog.md) - Automatic changelog generation
- [Troubleshooting](docs/release/troubleshooting.md) - Common issues and solutions

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

3. If services fail to start with permission errors, run the setup script:
   ```bash
   make setup
   ```
   This creates data directories with correct ownership. If you need to fix permissions manually:
   ```bash
   sudo chown -R 65534:65534 data/prometheus*    # Prometheus
   sudo chown -R 472:472 data/grafana*           # Grafana
   sudo chown -R 1000:1000 data/leveldb*         # Backend/Discovery
   ```

4. View service status:
   ```bash
   make status
   # or
   docker compose -f docker-compose.dev.local.yml ps
   ```

## License

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0). See the [LICENSE](LICENSE) file for more details.
