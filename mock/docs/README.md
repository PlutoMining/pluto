# Pluto Mock Service Documentation

## Overview

The Pluto Mock Service is a Node.js/TypeScript service that simulates Bitcoin mining devices (Bitaxe miners) for development and testing purposes. It creates multiple mock device servers using worker threads, each running on a different port and simulating device behavior with realistic data.

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

### Environment Variables

The mock service requires the following environment variables:

```bash
LISTING_PORT=5000                    # Port for the listing server
PORTS=8001,8002,8003,8004,8005       # Comma-separated list of ports for mock devices
LOGS_PUB_ENABLED=true                # Enable WebSocket log streaming
```

### Installation

```bash
cd mock
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

### Docker

**Production:**
```bash
docker build -f Dockerfile -t pluto-mock .
docker run -p 5000:5000 -p 8001-8005:8001-8005 -e LISTING_PORT=5000 -e PORTS=8001,8002,8003,8004,8005 pluto-mock
```

**Development:**
```bash
docker build -f Dockerfile.development -t pluto-mock-dev .
docker run -p 5000:5000 -p 8001-8005:8001-8005 -v $(pwd):/home/node/app pluto-mock-dev
```

## Key Features

1. **Multiple Mock Devices**
   - Creates multiple mock device servers using worker threads
   - Each device runs on a separate port
   - Devices named `mockaxe1`, `mockaxe2`, etc.

2. **API Version Support**
   - Supports both Legacy and New device API versions
   - Alternates between versions for different devices
   - Realistic device information generation

3. **Realistic Data Generation**
   - Random but realistic device metrics
   - Firmware version distribution based on real-world percentages
   - Dynamic uptime calculation
   - Configurable device parameters

4. **WebSocket Support**
   - Optional WebSocket log streaming
   - Broadcasts fake log messages to connected clients
   - 5-second interval between log broadcasts

5. **Device Operations**
   - System info retrieval
   - System configuration updates
   - System restart simulation

6. **Listing Server**
   - Provides list of all active mock devices
   - Used by discovery service for mock device detection

## Technology Stack

- **Runtime:** Node.js 24
- **Language:** TypeScript 5.5+
- **Framework:** Express.js 4.19+
- **WebSockets:** ws 8.18+
- **Worker Threads:** Node.js built-in `worker_threads`

## Project Structure

```
mock/
├── src/
│   ├── config/          # Configuration management
│   ├── controllers/     # Request handlers
│   ├── middlewares/     # Express middleware
│   ├── routes/         # Route definitions
│   ├── services/       # Business logic
│   ├── mockWorker.ts  # Worker thread implementation
│   └── index.ts       # Application entry point
├── docs/               # Documentation (this directory)
├── Dockerfile          # Production Docker image
├── Dockerfile.development  # Development Docker image
├── package.json        # Dependencies and scripts
└── tsconfig.json       # TypeScript configuration
```

## Common Packages

The mock service uses internal packages from the `common/` directory:

- `@pluto/logger` - Logging utilities
- `@pluto/interfaces` - TypeScript interfaces and types

## How It Works

1. **Worker Thread Creation**
   - Main process creates a worker thread for each port
   - Each worker runs an independent Express server
   - Workers communicate with main process via messages

2. **Mock Device Servers**
   - Each worker creates HTTP and WebSocket servers
   - Simulates device behavior with realistic data
   - Supports device API operations

3. **Listing Server**
   - Main process runs a separate Express server
   - Provides list of all active mock devices
   - Used for discovery service integration

4. **Data Generation**
   - Generates random but realistic device metrics
   - Distributes firmware versions based on real-world percentages
   - Calculates uptime dynamically
   - Supports configuration updates

## Next Steps

- Read the [Architecture Documentation](./ARCHITECTURE.md) to understand the system design
- Check the [Services Documentation](./SERVICES.md) for detailed service descriptions
- Review the [API Reference](./API.md) for endpoint documentation
- Follow the [Development Guide](./DEVELOPMENT.md) for development workflows
- Understand the [Flows](./FLOWS.md) for process documentation

