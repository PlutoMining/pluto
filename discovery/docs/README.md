# Pluto Discovery Service Documentation

## Overview

The Pluto Discovery Service is a Node.js/TypeScript microservice responsible for discovering Bitcoin mining devices (specifically Bitaxe miners) on the local network. It uses ARP scanning to find devices and then validates them by checking for specific device characteristics.

## Table of Contents

- [Architecture](./ARCHITECTURE.md) - System architecture, structure, and design paradigms
- [Services](./SERVICES.md) - Detailed documentation of all services
- [API Reference](./API.md) - Complete API endpoint documentation
- [Development Guide](./DEVELOPMENT.md) - How to run, debug, and develop
- [Flows](./FLOWS.md) - Detailed flow documentation

## Quick Start

### Prerequisites

- Node.js 24+
- npm or yarn
- **arp-scan** tool (installed automatically in Docker, must be installed manually for local development)
- Network access to scan local network interfaces

### Environment Variables

The discovery service requires the following environment variables:

```bash
PORT=4000                                    # Server port (default: 3000)
DETECT_MOCK_DEVICES=false                    # Enable mock device detection
MOCK_DISCOVERY_HOST=http://localhost:5000    # Mock discovery service URL (if enabled)
```

### Installation

```bash
cd discovery
npm install
```

**Note:** For local development, you may need to install `arp-scan` manually:

**Linux (Debian/Ubuntu):**
```bash
sudo apt-get install arp-scan
```

**macOS:**
```bash
brew install arp-scan
```

**Alpine Linux (Docker):**
```bash
apk add arp-scan libcap
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
docker build -f Dockerfile -t pluto-discovery .
docker run -p 4000:4000 --cap-add=NET_RAW --cap-add=NET_ADMIN pluto-discovery
```

**Note:** Docker requires `--cap-add=NET_RAW --cap-add=NET_ADMIN` capabilities for ARP scanning.

**Development:**
```bash
docker build -f Dockerfile.development -t pluto-discovery-dev .
docker run -p 4000:4000 --cap-add=NET_RAW --cap-add=NET_ADMIN -v $(pwd):/home/node/app pluto-discovery-dev
```

## Key Features

1. **Network Discovery**
   - ARP scanning on all active network interfaces
   - Automatic interface detection (excludes Docker interfaces)
   - Parallel scanning across multiple interfaces

2. **Device Validation**
   - HTTP requests to device endpoints (`/api/system/info`)
   - Validates devices by checking for `ASICModel` field
   - Timeout handling (1 second per device)

3. **Flexible Matching**
   - Exact matching
   - Partial matching (left, right, both)
   - Search by MAC address, IP address, or hostname

4. **Mock Device Support**
   - Optional integration with mock discovery service
   - Useful for development and testing

5. **Persistent Storage**
   - Stores discovered devices in LevelDB
   - Automatic updates for existing devices
   - Fast lookup by MAC address

## Technology Stack

- **Runtime:** Node.js 24
- **Language:** TypeScript 5.5+
- **Framework:** Express.js 4.19+
- **Database:** LevelDB (via @pluto/db)
- **Network Scanning:** arp-scan (system tool)
- **HTTP Client:** Axios 1.7+

## Project Structure

```
discovery/
├── src/
│   ├── config/          # Configuration management
│   ├── controllers/     # Request handlers
│   ├── routes/         # Route definitions
│   ├── services/       # Business logic
│   │   ├── discovery.service.ts    # Main discovery logic
│   │   └── arpScanWrapper.ts       # ARP scan wrapper
│   └── index.ts        # Application entry point
├── docs/               # Documentation (this directory)
├── Dockerfile          # Production Docker image
├── Dockerfile.development  # Development Docker image
├── package.json        # Dependencies and scripts
└── tsconfig.json       # TypeScript configuration
```

## Common Packages

The discovery service uses internal packages from the `common/` directory:

- `@pluto/db` - LevelDB database wrapper
- `@pluto/interfaces` - TypeScript interfaces and types
- `@pluto/logger` - Logging utilities

## How It Works

1. **Network Scanning**
   - Detects active network interfaces
   - Runs `arp-scan` on each interface
   - Collects IP and MAC addresses

2. **Device Validation**
   - For each discovered IP, makes HTTP request to `/api/system/info`
   - Checks for `ASICModel` field in response
   - Only devices with `ASICModel` are considered valid

3. **Storage**
   - Stores valid devices in LevelDB
   - Key: MAC address
   - Value: Complete device object

4. **Lookup**
   - Fast lookup by MAC address
   - Flexible matching for multiple devices
   - Supports partial matching

## Next Steps

- Read the [Architecture Documentation](./ARCHITECTURE.md) to understand the system design
- Check the [Services Documentation](./SERVICES.md) for detailed service descriptions
- Review the [API Reference](./API.md) for endpoint documentation
- Follow the [Development Guide](./DEVELOPMENT.md) for development workflows
- Understand the [Flows](./FLOWS.md) for process documentation

