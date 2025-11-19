# Pluto Backend Documentation

## Overview

The Pluto Backend is a Node.js/TypeScript service that manages Bitcoin mining devices (specifically Bitaxe miners). It provides device discovery, monitoring, configuration management, and integration with Grafana for visualization and Prometheus for metrics collection.

## Table of Contents

- [Architecture](./ARCHITECTURE.md) - System architecture, structure, and design paradigms
- [Services](./SERVICES.md) - Detailed documentation of all services
- [API Reference](./API.md) - Complete API endpoint documentation
- [Development Guide](./DEVELOPMENT.md) - How to run, debug, and develop

## Quick Start

### Prerequisites

- Node.js 24+
- npm or yarn
- Access to a discovery service (configured via `DISCOVERY_SERVICE_HOST`)
- Access to Grafana instance (configured via `GF_HOST`)

### Environment Variables

The backend requires the following environment variables:

```bash
PORT=3000                                    # Server port (default: 3000)
AUTO_LISTEN=true                            # Automatically start listening to devices on startup
DISCOVERY_SERVICE_HOST=http://localhost:4000  # Discovery service URL
GF_HOST=http://localhost:3001              # Grafana host URL
DELETE_DATA_ON_DEVICE_REMOVE=false         # Delete Grafana dashboards and metrics when device is removed
```

### Installation

```bash
cd backend
npm install
```

### Running

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm run build
npm start
```

**Debug mode:**
```bash
npm run dev:debug
```

### Docker

**Production:**
```bash
docker build -f Dockerfile -t pluto-backend .
docker run -p 3000:3000 pluto-backend
```

**Development:**
```bash
docker build -f Dockerfile.development -t pluto-backend-dev .
docker run -p 3000:3000 pluto-backend-dev
```

## Key Features

1. **Device Management**
   - Device discovery via external discovery service
   - Device imprinting (registration)
   - Device configuration and monitoring
   - Real-time device status updates

2. **Monitoring & Metrics**
   - Prometheus metrics collection
   - Real-time WebSocket connections to devices
   - HTTP polling for device system information
   - Overview metrics aggregation

3. **Grafana Integration**
   - Automatic dashboard creation for each device
   - Overview dashboard for all devices
   - Public dashboard publishing

4. **Preset Management**
   - Create and manage device configuration presets
   - Apply presets to multiple devices

5. **Real-time Communication**
   - Socket.IO for client-server communication
   - WebSocket connections to devices for log streaming
   - Event emission for device status updates

## Technology Stack

- **Runtime:** Node.js 24
- **Language:** TypeScript 5.5+
- **Framework:** Express.js 4.19+
- **Database:** LevelDB (via @pluto/db)
- **WebSockets:** Socket.IO 4.7+, ws 8.18+
- **Metrics:** Prometheus (prom-client 15.1+)
- **HTTP Client:** Axios 1.7+
- **Utilities:** radash 12.1+, uuid 10.0+

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration management
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Express middleware
│   ├── routes/         # Route definitions
│   ├── services/       # Business logic
│   └── index.ts        # Application entry point
├── docs/               # Documentation (this directory)
├── Dockerfile          # Production Docker image
├── Dockerfile.development  # Development Docker image
├── package.json        # Dependencies and scripts
└── tsconfig.json       # TypeScript configuration
```

## Common Packages

The backend uses several internal packages from the `common/` directory:

- `@pluto/db` - LevelDB database wrapper
- `@pluto/interfaces` - TypeScript interfaces and types
- `@pluto/logger` - Logging utilities
- `@pluto/utils` - Utility functions

## Next Steps

- Read the [Architecture Documentation](./ARCHITECTURE.md) to understand the system design
- Check the [Services Documentation](./SERVICES.md) for detailed service descriptions
- Review the [API Reference](./API.md) for endpoint documentation
- Follow the [Development Guide](./DEVELOPMENT.md) for development workflows

