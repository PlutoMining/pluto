# Architecture Documentation

## System Architecture

The Pluto Mock Service follows a **multi-worker architecture** pattern where the main process spawns worker threads, each running an independent mock device server:

```
┌─────────────────────────────────────────────────────────┐
│                    Main Process                         │
│  (index.ts)                                             │
│  - Creates worker threads                               │
│  - Manages listing server                               │
│  - Tracks active servers                                │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┴─────────────────┐
        ▼                                   ▼
┌──────────────────┐              ┌──────────────────┐
│  Worker Thread 1 │              │  Worker Thread N │
│  (mockWorker.ts) │              │  (mockWorker.ts) │
│                  │              │                  │
│  - Express App   │              │  - Express App   │
│  - HTTP Server   │              │  - HTTP Server   │
│  - WebSocket     │              │  - WebSocket     │
│  - Mock Device   │              │  - Mock Device   │
└──────────────────┘              └──────────────────┘
        │                                   │
        ▼                                   ▼
┌──────────────────┐              ┌──────────────────┐
│  Port 8001       │              │  Port 800N       │
│  mockaxe1        │              │  mockaxeN        │
└──────────────────┘              └──────────────────┘
```

## Design Paradigms

### 1. **Worker Thread Pattern**
- Each mock device runs in a separate worker thread
- Isolated execution contexts
- Communication via message passing
- Parallel execution of multiple devices

### 2. **Separation of Concerns**
- **Main Process**: Worker management, listing server
- **Worker Threads**: Device simulation, HTTP/WebSocket servers
- **Services**: Data generation logic
- **Controllers**: Request handling
- **Middleware**: Request filtering (restart check)

### 3. **Singleton Pattern**
- Each worker has a single Express app instance
- Single HTTP server per worker
- Single WebSocket server per worker (if enabled)

### 4. **Factory Pattern**
- `createMockServerWorker()` creates worker instances
- `generateSystemInfo()` / `generateSystemInfoAlt()` generate device data
- `distributeFirmwareProportionally()` distributes firmware versions

### 5. **State Management**
- Worker-local state via `app.locals`
- Main process tracks active servers
- No shared state between workers

## Directory Structure

```
src/
├── config/
│   └── environment.ts          # Environment configuration
│
├── controllers/                 # Request handlers
│   └── system.controller.ts
│
├── middlewares/
│   └── checkIfRestarting.ts    # Restart state middleware
│
├── routes/                      # Route definitions
│   └── system.routes.ts
│
├── services/                    # Business logic
│   └── mock.service.ts         # Data generation
│
├── mockWorker.ts               # Worker thread implementation
└── index.ts                    # Main process entry point
```

## Data Flow

### Startup Flow

```
1. Main Process Starts
   ↓
2. Read Configuration
   ├─→ LISTING_PORT
   ├─→ PORTS (comma-separated)
   └─→ LOGS_PUB_ENABLED
   ↓
3. Create Worker Threads (Parallel)
   ├─→ Worker 1 (Port 8001, mockaxe1, Legacy)
   ├─→ Worker 2 (Port 8002, mockaxe2, New)
   ├─→ Worker 3 (Port 8003, mockaxe3, Legacy)
   └─→ ... (alternating API versions)
   ↓
4. Each Worker:
   ├─→ Create Express App
   ├─→ Create HTTP Server
   ├─→ Create WebSocket Server (if enabled)
   ├─→ Register Routes
   ├─→ Start Server
   └─→ Send "server_started" message
   ↓
5. Main Process:
   ├─→ Receive worker messages
   ├─→ Track active servers
   └─→ Start Listing Server
```

### Request Flow

```
Client Request
    ↓
HTTP Server (Worker Thread)
    ↓
Express App
    ↓
Middleware (checkIfRestarting)
    ├─→ Restarting: Return 503
    └─→ Not Restarting: Continue
    ↓
Route Handler
    ↓
Controller
    ↓
Service (Data Generation)
    ↓
Response
```

### WebSocket Flow

```
Worker Thread
    ↓
WebSocket Server (if enabled)
    ↓
Broadcast Loop (every 5 seconds)
    ├─→ Generate Fake Log
    ├─→ Send to All Connected Clients
    └─→ Schedule Next Broadcast
```

## State Management

### Main Process State

1. **activeServers**
   - Array of `ServerInfo` objects
   - Tracks all active mock device servers
   - Updated when workers start

### Worker Thread State

1. **app.locals**
   - `hostname`: Device hostname
   - `apiVersion`: Device API version (Legacy/New)
   - `startTime`: Server start time (for uptime calculation)
   - `systemInfo`: Custom device configuration (from PATCH requests)
   - `isRestarting`: Restart state flag

2. **activeServers** (per worker)
   - Local array (not shared with main process)
   - Currently not used in workers

## Communication Patterns

### Main Process ↔ Worker Threads

**Message Passing:**
- Main → Worker: `workerData` (port, hostname, apiVersion)
- Worker → Main: `postMessage({ status: "server_started", port, hostname })`

**Events:**
- `worker.on("message")`: Worker communication
- `worker.on("error")`: Worker errors
- `worker.on("exit")`: Worker termination

### HTTP REST API
- Synchronous request/response
- Used for device operations
- JSON payloads

### WebSocket
- Bidirectional communication
- Used for log streaming (if enabled)
- Broadcasts to all connected clients

## API Version Support

### Legacy API (`DeviceApiVersion.Legacy`)
- Uses `generateSystemInfo()`
- Fields: `hashRate`, `fanSpeedRpm`, etc.
- Simpler device information structure

### New API (`DeviceApiVersion.New`)
- Uses `generateSystemInfoAlt()`
- Fields: `hashRate_10m`, `hashRate_1h`, `hashRate_1d`, `vrTemp`, `history`, etc.
- Extended device information structure

### Distribution
- Devices alternate between Legacy and New
- Even indices: Legacy
- Odd indices: New

## Firmware Version Distribution

Firmware versions are distributed probabilistically based on real-world percentages:

- `v2.2.2`: 5%
- `v2.2.0`: 5%
- `v2.1.10`: 20%
- `v2.1.9`: 2%
- `v2.1.8`: 5%
- `v2.1.7`: 2%
- `v2.1.6`: 2%
- `v2.0.3`: 2%
- `v1.2.0`: 1%
- `v1.1.0`: 1%

Each device gets a random firmware version based on these probabilities.

## Error Handling

1. **Worker Errors**: Logged, worker may terminate
2. **HTTP Errors**: Return appropriate status codes
3. **Restart State**: Returns 503 during restart simulation
4. **WebSocket Errors**: Logged, broadcast continues

## Security Considerations

1. **No Authentication**: Mock service doesn't require authentication
   - Suitable for development/testing only
   - Not for production use

2. **No Input Validation**: Currently relies on TypeScript types
   - Consider adding validation middleware

3. **Worker Isolation**: Workers are isolated
   - Errors in one worker don't affect others
   - No shared memory (except via message passing)

## Scalability Considerations

1. **Worker Threads**: Each device uses one worker thread
   - Limited by available CPU cores
   - Consider process-based approach for very large numbers

2. **Port Management**: Each device needs a unique port
   - Port range must be configured
   - Consider dynamic port allocation

3. **Memory**: Each worker has its own memory space
   - More workers = more memory usage
   - Monitor memory usage with many devices

## Dependencies

### External Services
- None (standalone service)

### Internal Packages
- `@pluto/logger`: Logging
- `@pluto/interfaces`: Type definitions

### Node.js Built-ins
- `worker_threads`: Worker thread management
- `http`: HTTP server creation
- `ws`: WebSocket server

## Configuration

Configuration is managed through:
1. **Environment Variables** (see `config/environment.ts`)
2. **Docker Environment** (for containerized deployments)

## Monitoring & Observability

1. **Logging**: Structured logging via `@pluto/logger`
   - Info: Server startup, worker creation
   - Debug: WebSocket broadcasts, request handling
   - Error: Worker errors, request failures

2. **Listing Server**: Provides active server list
   - Endpoint: `GET /servers`
   - Used by discovery service

3. **No Metrics**: Currently no metrics collection
   - Consider adding Prometheus metrics for:
     - Active workers count
     - Request count per device
     - WebSocket connections count
     - Error rates

