# Pluto Project

## Overview

Pluto is an open-source control platform designed for managing and monitoring open-source bitcoin mining devices such as Bitaxe, NerdAxe, and other similar miners. The platform provides a comprehensive interface for controlling multiple miners, collecting performance metrics, and visualizing data in real-time. Pluto leverages microservices architecture and Docker for modularity, ease of development, and deployment. It provides a comprehensive system for backend processing, frontend visualization, and monitoring. The project is intended to run on Umbrel or similar environments with service dependencies such as `Prometheus` and `Grafana` for monitoring.

This README provides information on both the **development** and **release** configurations of the Pluto project.

## Prerequisites

- Docker and Docker Compose installed on your system.
- Access to Docker Hub for pulling the necessary images.
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

### Build and Start

```bash
docker-compose -f docker-compose.development.yml up --build
```

### Stop Services

```bash
docker-compose -f docker-compose.development.yml down
```

### Service Ports

- **Mock Service**: [http://localhost:7770](http://localhost:7770)
- **Backend**: [http://localhost:7776](http://localhost:7776)
- **Frontend**: [http://localhost:7777](http://localhost:7777)
- **Prometheus**: [http://localhost:9090](http://localhost:9090)
- **Grafana**: [http://localhost:3000](http://localhost:3000)

## Release Environment

### Configuration

The release environment uses pre-built Docker images hosted on Docker Hub, which are defined in the `docker-compose.yml` file. The service configurations, such as environment variables and volume mounts, are tailored for deployment in production environments like Umbrel.

### Setup and Start

1. Clone the repository:

   ```bash
   git clone https://your-repo-url.git
   cd your-repo-directory
   ```

2. Start the services with Docker Compose:
   ```bash
   docker-compose up -d
   ```

### Stop Services

```bash
docker-compose down
```

### Service Images

- `whirmill/pluto-mock:0.4.0`
- `whirmill/pluto-discovery:0.4.0`
- `whirmill/pluto-backend:0.4.0`
- `whirmill/pluto-frontend:0.4.3`
- `prom/prometheus:v2.53.1`
- `grafana/grafana:11.1.2`
- `whirmill/pluto-init:0.0.1`

### Service Ports

- **Mock Service**: `7770` (Main mock service port)
- **Backend**: `7776`
- **Frontend**: `7777`
- **Prometheus**: `9090` (If exposed)
- **Grafana**: `3000` (If exposed)

### Volume Mapping

The release configuration uses external directories for persistent data storage:

- Prometheus: `/home/umbrel/umbrel/app-data/plutomining-pluto/data/prometheus`
- Grafana: `/home/umbrel/umbrel/app-data/plutomining-pluto/data/grafana`
- Backend Data: `/home/umbrel/umbrel/app-data/plutomining-pluto/data/leveldb`

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
  - `NEXT_PUBLIC_WS_ROOT`: WebSocket root URL for frontend communication.

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
   ```bash
   docker-compose logs <service_name>
   ```
2. Ensure the necessary environment variables are correctly set, either in the `.env` files or directly in `docker-compose.yml`.

3. If services fail to start, verify that the required Docker volumes have correct permissions:
   ```bash
   sudo chown -R <user>:<group> /path/to/volume
   ```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.
