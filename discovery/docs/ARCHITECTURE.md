# Architecture Documentation

## System Architecture

The Pluto Discovery Service follows a **layered architecture** pattern with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│                    Client Layer                         │
│  (HTTP REST API)                                        │
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
│  (Business logic, network scanning, device validation)  │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┴─────────────────┐
        ▼                                   ▼
┌──────────────────┐              ┌──────────────────┐
│   Database       │              │  System Tools    |
│   (LevelDB)      │              │  (arp-scan)      │
│                  │              │  (ip command)    │
└──────────────────┘              └──────────────────┘
```

## Design Paradigms

### 1. **Separation of Concerns**
- **Routes**: Define URL patterns and HTTP methods
- **Controllers**: Handle HTTP request/response, extract parameters
- **Services**: Contain business logic, network operations, database operations
- **Wrappers**: Abstract system tool interactions

### 2. **Dependency Injection**
- Services are imported and used in controllers
- Database operations abstracted through `@pluto/db`
- Configuration injected via environment variables

### 3. **Command Execution Pattern**
- System tools (`arp-scan`, `ip`) executed via `child_process.exec`
- Promisified for async/await usage
- Error handling for command failures

### 4. **Parallel Processing**
- ARP scans run in parallel across multiple network interfaces
- `Promise.allSettled` ensures one failure doesn't stop others
- Results aggregated and flattened

### 5. **Caching Pattern**
- Discovered devices stored in LevelDB
- Fast lookup by MAC address
- Automatic updates for existing devices

## Directory Structure

```
src/
├── config/
│   └── environment.ts          # Environment configuration
│
├── controllers/                 # Request handlers
│   └── discover.controller.ts
│
├── routes/                      # Route definitions
│   └── discover.routes.ts
│
├── services/                    # Business logic
│   ├── discovery.service.ts    # Main discovery logic
│   └── arpScanWrapper.ts      # ARP scan wrapper
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
3. Service (discovery.service.discoverDevices)
   ↓
4. Get Active Network Interfaces
   ↓
5. ARP Scan (parallel on all interfaces)
   ↓
6. Filter and Validate Devices
   ├─→ HTTP GET /api/system/info
   ├─→ Check for ASICModel
   └─→ Store in LevelDB
   ↓
7. Return Discovered Devices
```

### Device Lookup Flow

```
1. Client Request (with filters)
   ↓
2. Controller (getDiscoveredDevices)
   ↓
3. Service (lookupMultipleDiscoveredDevices)
   ↓
4. Query LevelDB with Filters
   ├─→ MAC address matching
   ├─→ IP address matching
   └─→ Hostname matching
   ↓
5. Apply Partial Matching Logic
   ↓
6. Return Filtered Devices
```

## State Management

### Persistent State

1. **LevelDB Collection**
   - `pluto_discovery:devices:discovered` - Discovered devices
   - Key: Device MAC address
   - Value: Complete Device object

### In-Memory State

- No significant in-memory state
- All state is persisted in LevelDB
- Stateless service design

## Communication Patterns

### HTTP REST API
- Synchronous request/response
- Used for discovery and lookup operations
- JSON payloads

### System Tool Execution
- `arp-scan`: Network scanning
- `ip`: Network interface detection
- Executed via `child_process.exec`
- Promisified for async/await

## Network Scanning Strategy

### Interface Detection
1. Execute `ip -o addr show`
2. Parse output to get interface names
3. Filter out Docker interfaces (`docker`, `br-`, `veth`, `lo`, `dind`, `.orbmirror`)
4. Return unique active interfaces

### ARP Scanning
1. For each active interface:
   - Execute `arp-scan --interface={interface} --localnet`
   - Parse output to extract IP, MAC, and vendor
2. Run scans in parallel using `Promise.allSettled`
3. Aggregate results from all interfaces
4. Filter out invalid entries

### Device Validation
1. For each discovered IP:
   - HTTP GET to `http://{ip}/api/system/info`
   - Timeout: 1 second
   - Check response for `ASICModel` field
2. Only devices with `ASICModel` are considered valid
3. Store valid devices in LevelDB

## Matching Strategies

### Partial Matching Options

1. **"none"**: Exact match only
   - `value === item`

2. **"left"**: Match from the end (suffix)
   - `value.endsWith(item)`

3. **"right"**: Match from the start (prefix)
   - `value.startsWith(item)`

4. **"both"**: Match anywhere (substring)
   - `value.includes(item)`

### Matching Fields

- **MAC Address**: Exact or partial matching
- **IP Address**: Exact or partial matching
- **Hostname**: Exact or partial matching

## Error Handling

1. **Service Layer**: Catches errors, logs via `@pluto/logger`, returns empty array or throws
2. **Controller Layer**: Catches errors, returns appropriate HTTP status codes
3. **ARP Scan Errors**: Logged, interface skipped, other interfaces continue
4. **Device Validation Errors**: Logged, device skipped, discovery continues
5. **Network Timeouts**: Handled gracefully, device skipped

## Security Considerations

### Network Capabilities

1. **ARP Scanning**: Requires `NET_RAW` and `NET_ADMIN` capabilities
   - In Docker: `--cap-add=NET_RAW --cap-add=NET_ADMIN`
   - In production: `setcap cap_net_raw,cap_net_admin=eip /usr/bin/arp-scan`

2. **No Authentication**: API currently does not require authentication
   - Consider adding authentication for production use

3. **Input Validation**: Currently relies on TypeScript types
   - Consider adding validation middleware (e.g., express-validator)

## Scalability Considerations

1. **Parallel Scanning**: Scans run in parallel across interfaces
2. **Timeout Handling**: 1-second timeout per device prevents hanging
3. **Database**: LevelDB is single-threaded, but lookups are fast
4. **Stateless Design**: Service can be horizontally scaled

## Dependencies

### External Services
- **Mock Discovery Service** (optional): For mock device detection
- **Network Devices**: Devices must expose `/api/system/info` endpoint

### System Tools
- **arp-scan**: Network scanning tool
- **ip**: Network interface detection

### Internal Packages
- `@pluto/db`: Database abstraction
- `@pluto/interfaces`: Type definitions
- `@pluto/logger`: Logging

## Configuration

Configuration is managed through:
1. **Environment Variables** (see `config/environment.ts`)
2. **Docker Environment** (for containerized deployments)

## Monitoring & Observability

1. **Logging**: Structured logging via `@pluto/logger`
   - Info: Discovery progress, device found
   - Error: Network errors, validation failures
   - Debug: Detailed ARP scan results

2. **No Metrics**: Currently no metrics collection
   - Consider adding Prometheus metrics for:
     - Discovery requests count
     - Devices discovered count
     - Scan duration
     - Error rates

## Special Features

### Direct IP Bypass

If a specific IP is provided without partial matching:
- Skips ARP scanning
- Directly attempts HTTP connection
- Faster for single device discovery

### Mock Device Support

If `DETECT_MOCK_DEVICES=true`:
- Fetches mock servers from mock discovery service
- Adds mock devices to ARP table
- Useful for development and testing

