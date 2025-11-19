# Architecture Documentation

## System Architecture

The Pluto Backend follows a **layered architecture** pattern with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│                    Client Layer                         │
│  (HTTP REST API, Socket.IO WebSocket)                   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Route Layer                            │
│  (Route definitions and path matching)                  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                Controller Layer                         │
│  (Request/Response handling, validation)                │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                 Service Layer                           │
│  (Business logic, external integrations)                │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┴─────────────────┐
        ▼                                   ▼
┌──────────────────┐              ┌──────────────────┐
│   Database       │              │  External APIs   │
│   (LevelDB)      │              │  (Grafana,       │
│                  │              │   Discovery)     │
└──────────────────┘              └──────────────────┘
```

## Design Paradigms

### 1. **Separation of Concerns**
- **Routes**: Define URL patterns and HTTP methods
- **Controllers**: Handle HTTP request/response, extract parameters
- **Services**: Contain business logic, database operations, external API calls
- **Middleware**: Cross-cutting concerns (e.g., secret removal)

### 2. **Dependency Injection**
- Services are imported and used in controllers
- Database operations abstracted through `@pluto/db`
- Configuration injected via environment variables

### 3. **Event-Driven Architecture**
- Socket.IO for real-time client communication
- WebSocket connections to devices for log streaming
- Event emission for device status updates

### 4. **Singleton Pattern**
- Database instances are singletons (managed by `@pluto/db`)
- Socket.IO instance is a singleton
- Metrics registry is global

### 5. **Factory Pattern**
- Metrics creation uses factory functions (`createMetricsForDevice`)
- Custom loggers created per device

## Directory Structure

```
src/
├── config/
│   └── environment.ts          # Environment configuration
│
├── controllers/                 # Request handlers
│   ├── dashboards.controller.ts
│   ├── devices.controller.ts
│   ├── metrics.controller.ts
│   ├── presets.controller.ts
│   └── socket.controller.ts
│
├── middleware/
│   └── remove-secrets.middleware.ts  # Security middleware
│
├── routes/                      # Route definitions
│   ├── dashboards.routes.ts
│   ├── devices.routes.ts
│   ├── metrics.routes.ts
│   ├── presets.routes.ts
│   └── socket.routes.ts
│
├── services/                    # Business logic
│   ├── device.service.ts       # Device management
│   ├── grafana.service.ts      # Grafana integration
│   ├── metrics.service.ts      # Prometheus metrics
│   ├── presets.service.ts      # Preset management
│   └── tracing.service.ts      # Device monitoring & WebSocket
│
└── index.ts                     # Application entry point
```

## Data Flow

### Device Discovery Flow

```
1. Client Request
   ↓
2. Controller (discoverDevices)
   ↓
3. Service (device.service.discoverDevices)
   ↓
4. HTTP Request to Discovery Service
   ↓
5. Return discovered devices
```

### Device Imprinting Flow

```
1. Client Request (POST /devices/imprint)
   ↓
2. Controller (imprintDevices)
   ↓
3. Service (device.service.imprintDevices)
   ↓
4. Lookup devices in discovery service
   ↓
5. Store in LevelDB (devices:imprinted collection)
   ↓
6. Return imprinted devices
```

### Device Monitoring Flow

```
1. Service (tracing.service.listenToDevices)
   ↓
2. For each device:
   ├─→ Start HTTP polling (every 5 seconds)
   │   └─→ GET /api/system/info
   │       ├─→ Update LevelDB
   │       ├─→ Update Prometheus metrics
   │       ├─→ Emit Socket.IO event (stat_update)
   │       └─→ Create/update Grafana dashboard
   │
   └─→ Start WebSocket connection (if traceLogs enabled)
       └─→ ws://device.ip/api/ws
           └─→ Emit Socket.IO event (logs_update)
```

### Metrics Collection Flow

```
1. Device polling (every 5 seconds)
   ↓
2. Update device-specific Prometheus metrics
   ├─→ power_watts
   ├─→ voltage_volts
   ├─→ current_amps
   ├─→ temperature_celsius
   ├─→ hashrate_ghs
   └─→ ... (see metrics.service.ts)
   ↓
3. Update overview metrics
   ├─→ total_hardware
   ├─→ hardware_online
   ├─→ total_hashrate
   └─→ ... (aggregated metrics)
   ↓
4. Expose via GET /metrics (Prometheus format)
```

## State Management

### In-Memory State

1. **ipMap** (in `tracing.service.ts`)
   - Maps device IPs to monitoring state
   - Contains: WebSocket instance, polling timeout, device info, tracing status
   - Updated when devices are added/removed

2. **ioInstance** (Socket.IO server)
   - Singleton instance for client communication
   - Initialized on first request to `/socket/io`

3. **isListeningLogs**
   - Boolean flag for log streaming
   - Controlled via Socket.IO events

### Persistent State

1. **LevelDB Collections**
   - `pluto_core:devices:imprinted` - Registered devices
   - `pluto_core:presets` - Device configuration presets

2. **File System**
   - `/home/node/app/grafana/dashboards/` - Grafana dashboard JSON files
   - `/home/node/app/grafana_templates/` - Dashboard templates

## Communication Patterns

### HTTP REST API
- Synchronous request/response
- Used for CRUD operations
- JSON payloads

### Socket.IO
- Bidirectional communication
- Real-time event emission
- Events:
  - `stat_update` - Device status update
  - `logs_update` - Device log message
  - `device_removed` - Device removed from monitoring
  - `error` - Error occurred
  - `logsListeningStatus` - Log listening status change

### WebSocket (to devices)
- Direct connection to device
- Used for log streaming
- Auto-reconnect with exponential backoff

## Error Handling

1. **Service Layer**: Throws errors, logged via `@pluto/logger`
2. **Controller Layer**: Catches errors, returns appropriate HTTP status codes
3. **WebSocket**: Error events logged, reconnection attempted
4. **HTTP Polling**: Errors logged, device marked as offline

## Security Considerations

1. **Secret Removal Middleware**
   - Automatically removes `stratumPassword` and `wifiPassword` from responses
   - Applied to all routes

2. **Grafana Authentication**
   - Uses `X-WEBAUTH-USER` header for authentication
   - Assumes Grafana is behind reverse proxy with web auth

3. **No Input Validation**
   - Currently relies on TypeScript types
   - Consider adding validation middleware (e.g., express-validator)

## Scalability Considerations

1. **In-Memory State**: `ipMap` grows with number of devices
2. **Polling Frequency**: Fixed 5-second interval per device
3. **WebSocket Connections**: One per device (if enabled)
4. **Database**: LevelDB is single-threaded, consider sharding for high write loads

## Dependencies

### External Services
- **Discovery Service**: Device discovery
- **Grafana**: Dashboard management and visualization
- **Devices**: HTTP API and WebSocket endpoints

### Internal Packages
- `@pluto/db`: Database abstraction
- `@pluto/interfaces`: Type definitions
- `@pluto/logger`: Logging
- `@pluto/utils`: Utility functions

## Configuration

Configuration is managed through:
1. **Environment Variables** (see `config/environment.ts`)
2. **Docker Environment** (for containerized deployments)
3. **Runtime Configuration** (some settings via API)

## Monitoring & Observability

1. **Prometheus Metrics**: Exposed at `/metrics`
2. **Logging**: Structured logging via `@pluto/logger`
3. **Socket.IO Events**: Real-time status updates
4. **Grafana Dashboards**: Visualization of device metrics

