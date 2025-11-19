# System Flows Documentation

This document describes the key flows and processes in the Pluto Mock Service.

## Table of Contents

- [Startup Flow](#startup-flow)
- [Device Info Request Flow](#device-info-request-flow)
- [Device Configuration Update Flow](#device-configuration-update-flow)
- [Device Restart Flow](#device-restart-flow)
- [WebSocket Log Streaming Flow](#websocket-log-streaming-flow)
- [Listing Server Flow](#listing-server-flow)
- [Firmware Distribution Flow](#firmware-distribution-flow)

---

## Startup Flow

**Purpose:** Initialize mock service with multiple device workers and listing server.

**Trigger:** Service startup

**Flow Diagram:**
```
Main Process Starts
    ↓
Read Configuration
    ├─→ LISTING_PORT
    ├─→ PORTS (comma-separated)
    └─→ LOGS_PUB_ENABLED
    ↓
Distribute Firmware Versions
    ├─→ Create Cumulative Probability List
    ├─→ Assign Random Firmware to Each Port
    └─→ Store Distribution Map
    ↓
Create Worker Threads (Parallel)
    ├─→ Worker 1 (Port 8001, mockaxe1, Legacy)
    ├─→ Worker 2 (Port 8002, mockaxe2, New)
    ├─→ Worker 3 (Port 8003, mockaxe3, Legacy)
    └─→ ... (alternating API versions)
    ↓
For Each Worker:
    ├─→ Create Express App
    ├─→ Create HTTP Server
    ├─→ Create WebSocket Server (if enabled)
    ├─→ Set app.locals
    │   ├─→ hostname
    │   ├─→ apiVersion
    │   ├─→ startTime
    │   └─→ systemInfo (empty)
    ├─→ Register Middleware
    ├─→ Register Routes
    ├─→ Start Server
    └─→ Send "server_started" message
    ↓
Main Process:
    ├─→ Receive Worker Messages
    ├─→ Track Active Servers
    └─→ Start Listing Server
    ↓
All Services Running
```

**Steps:**

1. **Configuration Reading**
   - Reads `LISTING_PORT` from environment
   - Parses `PORTS` (comma-separated) into array
   - Reads `LOGS_PUB_ENABLED` flag

2. **Firmware Distribution**
   - Calls `distributeFirmwareProportionally(config.ports)`
   - Creates cumulative probability list from firmware percentages
   - For each port, assigns random firmware based on probabilities
   - Stores distribution map for later use

3. **Worker Thread Creation** (Parallel)
   - For each port in `config.ports`:
     - Creates worker thread with `mockWorker.js`
     - Passes worker data: `{ port, hostname: "mockaxe{N}", apiVersion }`
     - API version alternates: even indices = Legacy, odd indices = New
     - Waits for "server_started" message

4. **Worker Initialization** (Per Worker)
   - Creates Express application
   - Creates HTTP server
   - Creates WebSocket server (if `LOGS_PUB_ENABLED=true`)
   - Sets `app.locals`:
     - `hostname`: Device hostname
     - `apiVersion`: Device API version
     - `startTime`: Current timestamp
     - `systemInfo`: Empty object
   - Registers middleware (`checkIfRestarting`)
   - Registers routes (`systemRoutes`)
   - Starts HTTP server
   - Sends "server_started" message to main process

5. **Main Process Tracking**
   - Receives "server_started" messages from workers
   - Adds server info to `activeServers` array
   - Tracks: port, hostname, startTime

6. **Listing Server Creation**
   - Creates Express app on `LISTING_PORT`
   - Registers `/servers` route
   - Starts HTTP server
   - Returns list of active servers (excluding listing server)

**Error Handling:**
- Worker errors: Logged, worker may terminate
- Port conflicts: Worker fails to start, error logged
- Configuration errors: Service fails to start

---

## Device Info Request Flow

**Purpose:** Handle GET request for device system information.

**Trigger:** `GET /api/system/info`

**Flow Diagram:**
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
Route Handler (getSystemInfo)
    ↓
Calculate Uptime
    ├─→ Get startTime from app.locals
    └─→ Calculate: now - startTime
    ↓
Get Device Info
    ├─→ Get hostname from app.locals
    ├─→ Get apiVersion from app.locals
    ├─→ Get systemInfo from app.locals
    ├─→ If Legacy:
    │   └─→ generateSystemInfo(hostname, uptime, systemInfo)
    └─→ If New:
        └─→ generateSystemInfoAlt(hostname, uptime, systemInfo)
    ↓
Return Device Info
```

**Steps:**

1. **Request Reception**
   - HTTP request arrives at worker's HTTP server
   - Express app handles request

2. **Middleware Check**
   - `checkIfRestarting` middleware checks `app.locals.isRestarting`
   - If `true`, returns 503 with HTML message
   - If `false`, continues to route handler

3. **Uptime Calculation**
   - Gets `startTime` from `app.locals.startTime`
   - Calculates: `Math.floor((now - startTime) / 1000)`
   - Returns uptime in seconds

4. **Device Info Generation**
   - Gets `hostname` from `app.locals.hostname`
   - Gets `apiVersion` from `app.locals.apiVersion`
   - Gets `systemInfo` from `app.locals.systemInfo` (custom config)
   - Based on API version:
     - **Legacy**: Calls `generateSystemInfo(hostname, uptime, systemInfo)`
     - **New**: Calls `generateSystemInfoAlt(hostname, uptime, systemInfo)`

5. **Data Generation** (in service)
   - Gets firmware version based on hostname
   - Generates random values for all fields
   - Merges with custom `systemInfo` (overrides defaults)
   - Returns complete device information

6. **Response**
   - Returns JSON with device information
   - Status: 200

**Data Characteristics:**
- Values are randomly generated (except custom overrides)
- Uptime is calculated dynamically
- Firmware version is deterministic per device
- Custom configuration persists across requests

---

## Device Configuration Update Flow

**Purpose:** Update device configuration via PATCH request.

**Trigger:** `PATCH /api/system`

**Flow Diagram:**
```
Client Request (PATCH /api/system)
    ↓
HTTP Server (Worker Thread)
    ↓
Express App
    ↓
Middleware (checkIfRestarting)
    ├─→ Restarting: Return 503
    └─→ Not Restarting: Continue
    ↓
Route Handler (patchSystemInfo)
    ↓
Parse Request Body
    ↓
Update app.locals.systemInfo
    ├─→ Merge with existing systemInfo
    └─→ Store in app.locals
    ↓
Return Success Response
```

**Steps:**

1. **Request Reception**
   - HTTP PATCH request arrives
   - Express parses JSON body

2. **Middleware Check**
   - Checks restart state
   - Returns 503 if restarting

3. **Configuration Update**
   - Gets existing `systemInfo` from `app.locals.systemInfo` (or empty object)
   - Merges request body with existing `systemInfo`
   - Stores merged object in `app.locals.systemInfo`

4. **Response**
   - Returns success message
   - Status: 200

**Persistence:**
- Configuration persists for lifetime of worker
- Subsequent `GET /api/system/info` uses updated values
- Only provided fields are updated (partial update)

**Example:**
```typescript
// Initial state: app.locals.systemInfo = {}
// PATCH with: { power: 20, frequency: 550 }
// Result: app.locals.systemInfo = { power: 20, frequency: 550 }

// PATCH with: { power: 25 }
// Result: app.locals.systemInfo = { power: 25, frequency: 550 }
```

---

## Device Restart Flow

**Purpose:** Simulate device restart with temporary unavailability.

**Trigger:** `POST /api/system/restart`

**Flow Diagram:**
```
Client Request (POST /api/system/restart)
    ↓
HTTP Server (Worker Thread)
    ↓
Express App
    ↓
Route Handler (restartSystem)
    ↓
Set isRestarting Flag
    ├─→ app.locals.isRestarting = true
    ↓
Return HTML Response Immediately
    ↓
Start 5-Second Timer
    ↓
After 5 Seconds:
    ├─→ Set isRestarting = false
    └─→ Log "System has restarted"
    ↓
Device Available Again
```

**Steps:**

1. **Request Reception**
   - HTTP POST request arrives
   - Express routes to `restartSystem` handler

2. **Set Restart Flag**
   - Sets `app.locals.isRestarting = true`
   - This blocks all subsequent requests via middleware

3. **Immediate Response**
   - Returns HTML response immediately
   - Status: 200
   - Content: "System will restart shortly."

4. **Restart Simulation**
   - Starts 5-second timer
   - During this time, all requests return 503

5. **Restart Complete**
   - After 5 seconds, sets `app.locals.isRestarting = false`
   - Logs "System has restarted and is available again."
   - Device accepts requests again

**Middleware Behavior:**
- `checkIfRestarting` checks `app.locals.isRestarting`
- If `true`, returns 503 with HTML message
- If `false`, allows request to proceed

---

## WebSocket Log Streaming Flow

**Purpose:** Stream fake log messages to WebSocket clients.

**Trigger:** WebSocket connection + `LOGS_PUB_ENABLED=true`

**Flow Diagram:**
```
Worker Initialization
    ↓
Check LOGS_PUB_ENABLED
    ├─→ false: Skip WebSocket
    └─→ true: Continue
    ↓
Create WebSocket Server
    ↓
Start Broadcast Loop
    ↓
Every 5 Seconds:
    ├─→ Generate Fake Log
    ├─→ For Each Connected Client:
    │   ├─→ Check Connection State
    │   └─→ Send Log Message
    ├─→ Calculate Elapsed Time
    ├─→ Calculate Remaining Time
    └─→ Schedule Next Broadcast
    ↓
Continue Loop
```

**Steps:**

1. **WebSocket Server Creation**
   - Created during worker initialization (if `LOGS_PUB_ENABLED=true`)
   - Uses same HTTP server as Express app
   - Listens on `/api/ws` path

2. **Client Connection**
   - Client connects to `ws://localhost:{port}/api/ws`
   - Connection added to `wss.clients` set

3. **Broadcast Loop Start**
   - `broadcastLogs()` function called
   - Runs continuously every ~5 seconds

4. **Log Generation**
   - Calls `generateFakeLog()`
   - Selects random log message from predefined list
   - Returns log string

5. **Broadcast to Clients**
   - Iterates over all connected clients
   - Checks if client connection is open
   - Sends JSON message: `{ log: "..." }`

6. **Timing Calculation**
   - Records start time
   - Calculates elapsed time
   - Calculates remaining time: `max(5000 - elapsed, 0)`
   - Schedules next broadcast after remaining time

7. **Loop Continuation**
   - After timeout, calls `broadcastLogs()` again
   - Process repeats

**Log Messages:**
- "System started"
- "Temperature reading failed"
- "Fan speed increased"
- "Power supply issue detected"
- "System performance optimal"
- "Network connection lost"
- "ASIC failure detected"
- "Overclocking applied successfully"
- "Temperature is stable"
- "Fan is operating within limits"

---

## Listing Server Flow

**Purpose:** Provide list of all active mock device servers.

**Trigger:** `GET /servers`

**Flow Diagram:**
```
Client Request (GET /servers)
    ↓
Listing Server (Main Process)
    ↓
Route Handler
    ↓
Filter Active Servers
    ├─→ Exclude Listing Server Port
    └─→ Return Other Servers
    ↓
Return Server List
```

**Steps:**

1. **Request Reception**
   - HTTP GET request to listing server
   - Main process handles request (not worker thread)

2. **Server Filtering**
   - Gets `activeServers` array from main process
   - Filters out listing server's own port
   - Returns other servers

3. **Response**
   - Returns JSON with:
     - `message`: Descriptive message
     - `servers`: Array of server info objects
   - Status: 200

**Server Info Format:**
```json
{
  "port": 8001,
  "hostname": "mockaxe1",
  "startTime": "2024-01-15T10:30:45.123Z"
}
```

**Use Cases:**
- Discovery service integration
- Service discovery
- Health checking

---

## Firmware Distribution Flow

**Purpose:** Distribute firmware versions across devices based on real-world percentages.

**Trigger:** Service startup

**Flow Diagram:**
```
Service Startup
    ↓
Read Firmware Percentages
    ├─→ v2.2.2: 5%
    ├─→ v2.2.0: 5%
    ├─→ v2.1.10: 20%
    └─→ ... (other versions)
    ↓
Create Cumulative Probability List
    ├─→ v2.2.2: 0.05
    ├─→ v2.2.0: 0.10 (0.05 + 0.05)
    ├─→ v2.1.10: 0.30 (0.10 + 0.20)
    └─→ ... (cumulative)
    ↓
For Each Port:
    ├─→ Generate Random Value (0-1)
    ├─→ Find First Firmware Where random <= cumulativeProbability
    └─→ Assign Firmware to Port
    ↓
Store Distribution Map
    ↓
Use During Runtime
```

**Steps:**

1. **Firmware Percentages**
   - Defined in `firmwareVersionsWithPercentages` array
   - Each entry has `version` and `percentage`
   - Percentages sum to 100%

2. **Cumulative Probability**
   - Creates cumulative probability list
   - Each firmware has cumulative probability up to that point
   - Example: v2.1.10 has 0.30 (5% + 5% + 20%)

3. **Random Assignment**
   - For each port:
     - Generates random value between 0 and 1
     - Finds first firmware where `random <= cumulativeProbability`
     - Assigns that firmware to the port

4. **Storage**
   - Stores distribution in map: `{ [port: number]: string[] }`
   - Used later by `getFirmwareVersion()`

5. **Runtime Usage**
   - When generating device info:
     - Extracts numeric part from hostname
     - Maps to port index
     - Gets firmware from distribution map
     - Uses in device info generation

**Characteristics:**
- Probabilistic distribution (not exact percentages)
- Deterministic per port (same port always gets same firmware)
- Matches real-world firmware distribution

---

## Flow Interactions

### Complete Request Cycle

1. **Client Request** → Worker HTTP Server
2. **Middleware Check** → Restart state
3. **Route Handler** → Controller
4. **Data Generation** → Service
5. **Response** → Client

### WebSocket Lifecycle

1. **Client Connects** → WebSocket Server
2. **Broadcast Loop** → Every 5 seconds
3. **Log Generation** → Service
4. **Message Broadcast** → All Clients
5. **Client Disconnects** → Removed from clients set

### Configuration Update Cycle

1. **PATCH Request** → Update `app.locals.systemInfo`
2. **GET Request** → Use updated `systemInfo` in generation
3. **Response** → Contains updated values

---

## Error Flows

### Worker Creation Failure

1. Worker creation fails
2. Error logged
3. Worker not added to `activeServers`
4. Other workers continue normally

### Restart During Request

1. Request arrives
2. Middleware checks `isRestarting`
3. Returns 503 immediately
4. Request not processed

### WebSocket Broadcast Failure

1. Broadcast loop running
2. Client connection fails
3. Error logged
4. Other clients continue receiving logs
5. Broadcast loop continues

### Listing Server Failure

1. Listing server fails to start
2. Error logged
3. Main process continues
4. Workers continue normally
5. Discovery service cannot discover mock devices

---

## Performance Considerations

### Worker Threads
- Each device uses one worker thread
- Parallel execution
- Isolated memory spaces

### WebSocket Broadcasting
- Sequential iteration over clients
- Non-blocking sends
- 5-second interval prevents overload

### Data Generation
- Random value generation is fast
- Firmware lookup is O(1) (map lookup)
- No external dependencies

### Memory Usage
- Each worker has isolated memory
- More workers = more memory
- Monitor with many devices

