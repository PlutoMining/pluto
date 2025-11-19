# System Flows Documentation

This document describes the key flows and processes in the Pluto Backend system.

## Table of Contents

- [Device Discovery Flow](#device-discovery-flow)
- [Device Imprinting Flow](#device-imprinting-flow)
- [Device Monitoring Flow](#device-monitoring-flow)
- [Metrics Collection Flow](#metrics-collection-flow)
- [Dashboard Creation Flow](#dashboard-creation-flow)
- [Preset Application Flow](#preset-application-flow)
- [Device Removal Flow](#device-removal-flow)
- [Log Streaming Flow](#log-streaming-flow)
- [Device Configuration Update Flow](#device-configuration-update-flow)

---

## Device Discovery Flow

**Purpose:** Discover devices on the network via the discovery service.

**Trigger:** `GET /devices/discover` or `GET /devices/discovered`

**Flow Diagram:**
```
Client Request
    ↓
Controller (discoverDevices / getDiscoveredDevices)
    ↓
Service (device.service.discoverDevices / lookupMultipleDiscoveredDevices)
    ↓
HTTP GET to Discovery Service
    ↓
Discovery Service Response
    ↓
Return Devices to Client
```

**Steps:**

1. **Client Request**
   - Query parameters: `ip`, `mac`, `macs`, `ips`, `hostnames`, `partialMatch`

2. **Controller Processing**
   - Extracts query parameters
   - Calls appropriate service function

3. **Service Processing**
   - Builds HTTP request to discovery service
   - Sends request with query parameters
   - Handles errors

4. **Response**
   - Returns array of discovered devices
   - Each device includes: `mac`, `ip`, `hostname`, `info`

**Error Handling:**
- Discovery service unavailable → 500 error
- Network errors → logged and rethrown

---

## Device Imprinting Flow

**Purpose:** Register devices in the system database.

**Trigger:** `PUT /devices/imprint` or `PATCH /devices/imprint`

**Flow Diagram:**
```
Client Request (MAC addresses)
    ↓
Controller (imprintDevices / imprintDevice)
    ↓
Service (device.service.imprintDevices)
    ↓
Lookup Devices in Discovery Service
    ↓
For Each Device:
    ├─→ Clean Device Info (remove secrets)
    ├─→ Insert into LevelDB
    │   ├─→ Success: Device imprinted
    │   └─→ Already Exists: Update device
    └─→ Return Imprinted Devices
```

**Steps:**

1. **Client Request**
   - Body: `{ "macs": ["aa:bb:cc:dd:ee:ff"] }` or `{ "mac": "aa:bb:cc:dd:ee:ff" }`

2. **Controller Processing**
   - Extracts MAC addresses
   - For `PATCH /devices/imprint`, merges with existing imprinted devices

3. **Service Processing**
   - Calls `lookupMultipleDiscoveredDevices()` to get device details
   - For each device:
     - Cleans device info (removes `stratumPassword`, `wifiPassword`)
     - Attempts to insert into LevelDB (`pluto_core:devices:imprinted`)
     - If device exists, updates instead

4. **Response**
   - Returns array of imprinted devices
   - Status: 200 (success) or 404 (no devices found)

**Database Operation:**
- Collection: `pluto_core:devices:imprinted`
- Key: Device MAC address
- Value: Device object

---

## Device Monitoring Flow

**Purpose:** Start real-time monitoring of devices.

**Trigger:** 
- `PUT /devices/listen` (manual)
- Server startup if `AUTO_LISTEN=true` (automatic)

**Flow Diagram:**
```
Start Monitoring Request
    ↓
Controller (putListenDevices)
    ↓
Service (device.service.listenToDevices)
    ↓
Get Devices (from request or all imprinted)
    ↓
Tracing Service (updateOriginalIpsListeners)
    ↓
For Each Device:
    ├─→ Start HTTP Polling (every 5 seconds)
    │   └─→ GET /api/system/info
    │       ├─→ Update LevelDB
    │       ├─→ Update Prometheus Metrics
    │       ├─→ Emit Socket.IO Event
    │       └─→ Create/Update Grafana Dashboard
    │
    └─→ Start WebSocket Connection (if traceLogs enabled)
        └─→ ws://device.ip/api/ws
            └─→ Stream logs to Socket.IO
```

**Steps:**

1. **Initialization**
   - If `AUTO_LISTEN=true`, starts on server startup
   - Otherwise, triggered by `PUT /devices/listen`

2. **Device Selection**
   - If MAC addresses provided, filters devices
   - Otherwise, monitors all imprinted devices

3. **Monitoring Setup** (per device)
   - Creates Prometheus metrics via `createMetricsForDevice()`
   - Starts HTTP polling loop (5-second interval)
   - Optionally starts WebSocket connection for logs

4. **HTTP Polling Loop**
   - Every 5 seconds: `GET http://{device.ip}/api/system/info`
   - On success:
     - Updates LevelDB with latest device info
     - Updates Prometheus metrics
     - Emits Socket.IO `stat_update` event
     - Creates/updates Grafana dashboard
     - Updates `ipMap` state
   - On error:
     - Marks device as offline (`tracing: false`)
     - Emits Socket.IO `error` event
   - After each poll:
     - Updates overview metrics with all device data

5. **WebSocket Connection** (if enabled)
   - Connects to `ws://{device.ip}/api/ws`
   - On message:
     - Logs via custom logger
     - If `isListeningLogs` is true, emits Socket.IO `logs_update` event
   - Auto-reconnects on disconnect (max 5 attempts)

**State Management:**
- `ipMap`: Tracks monitoring state per device IP
- Contains: WebSocket instance, polling timeout, device info, tracing status

---

## Metrics Collection Flow

**Purpose:** Collect and expose Prometheus metrics.

**Trigger:** Automatic (during device polling) and `GET /metrics`

**Flow Diagram:**
```
Device Polling (every 5 seconds)
    ↓
Update Device-Specific Metrics
    ├─→ power_watts
    ├─→ voltage_volts
    ├─→ current_amps
    ├─→ temperature_celsius
    ├─→ hashrate_ghs
    ├─→ shares_accepted
    ├─→ shares_rejected
    └─→ ... (all device metrics)
    ↓
Update Overview Metrics
    ├─→ total_hardware
    ├─→ hardware_online
    ├─→ total_hashrate
    ├─→ average_hashrate
    ├─→ total_power_watts
    ├─→ firmware_version_distribution
    ├─→ shares_by_pool_accepted
    └─→ ... (all overview metrics)
    ↓
Expose via GET /metrics
```

**Steps:**

1. **Device Polling**
   - Every 5 seconds, device info is fetched
   - Device info includes: power, voltage, current, temperature, hash rate, etc.

2. **Device-Specific Metrics Update**
   - For each device, metrics are updated via `updatePrometheusMetrics()`
   - Metrics are prefixed with sanitized hostname
   - Data transformations:
     - Voltage: `millivolts / 1000` → volts
     - Current: `milliamps / 1000` → amps
     - Efficiency: `power / (hashrate / 1000)`

3. **Overview Metrics Update**
   - After each device poll, `updateOverviewMetrics()` is called
   - Aggregates data from all devices:
     - Counts total/online/offline devices
     - Sums hash rates and power
     - Calculates averages
     - Groups by firmware version
     - Groups shares by pool

4. **Metrics Exposure**
   - `GET /metrics` endpoint returns Prometheus format
   - Content-Type: `text/plain; version=0.0.4; charset=utf-8`
   - All metrics from global registry are included

**Metrics Registry:**
- Global Prometheus registry (`globalRegister`)
- All metrics registered to this registry
- Exposed via `/metrics` endpoint

---

## Dashboard Creation Flow

**Purpose:** Create and publish Grafana dashboards for devices.

**Trigger:** Automatic (during device monitoring)

**Flow Diagram:**
```
Device Polling Success
    ↓
Check if Dashboard Exists
    ├─→ Exists: Skip
    └─→ Not Exists: Create
        ↓
Read Dashboard Template
    ↓
Replace Placeholders (@@hostname@@)
    ↓
Generate Unique UID
    ↓
Write Dashboard JSON File
    ↓
Wait 2 seconds
    ↓
Publish Dashboard to Grafana
    ├─→ GET: Check if published
    ├─→ POST: Create public dashboard
    └─→ PATCH: Configure public dashboard
    ↓
Dashboard Available
```

**Steps:**

1. **Trigger**
   - During device polling, after successful info fetch
   - Called via `createGrafanaDeviceDashboard(device)`

2. **Existence Check**
   - Checks if dashboard file exists: `/home/node/app/grafana/dashboards/{hostname}.json`
   - If exists, skips creation

3. **Template Processing**
   - Reads template: `grafana_templates/bitaxe_dashboard_template.json`
   - Finds all `@@hostname@@` placeholders
   - Replaces with sanitized hostname
   - Generates unique 14-character UID

4. **File Creation**
   - Writes dashboard JSON to file system
   - Sets dashboard title to hostname

5. **Publishing**
   - Waits 2 seconds (for Grafana to detect file)
   - Calls `publishDashboard(uid)`:
     - GET: Checks if already published
     - If not published:
       - POST: Creates public dashboard
       - PATCH: Configures public dashboard (enables time selection, etc.)
     - Returns `accessToken` for public URL

6. **Public URL**
   - Format: `/grafana/public-dashboards/{accessToken}?orgId=1`
   - Accessible via Grafana web interface

**Overview Dashboard:**
- Created on server startup if `AUTO_LISTEN=true`
- Uses template: `grafana_templates/bitaxe_overview_dashboard_template.json`
- Same publishing flow as device dashboards

---

## Preset Application Flow

**Purpose:** Apply a preset configuration to a device.

**Trigger:** `PATCH /devices/:id/system` with `presetUuid` in body

**Flow Diagram:**
```
Client Request (device update with presetUuid)
    ↓
Controller (patchDeviceSystemInfo)
    ↓
Get Device from Database
    ↓
If presetUuid provided:
    ├─→ Get Preset from Database
    ├─→ Merge Preset Configuration
    │   ├─→ stratumPort
    │   ├─→ stratumURL
    │   └─→ stratumPassword
    └─→ Continue with device update
    ↓
PATCH Device System Info
    ↓
HTTP PATCH to Device
    ↓
Return Updated Device
```

**Steps:**

1. **Client Request**
   - Endpoint: `PATCH /devices/:id/system`
   - Body includes `presetUuid` and `info` object

2. **Device Lookup**
   - Gets device from database by MAC address
   - Verifies device exists and has IP address

3. **Preset Resolution** (if `presetUuid` provided)
   - Gets preset from database via `presetsService.getPreset()`
   - Merges preset configuration into device info:
     - `stratumPort` from preset
     - `stratumURL` from preset
     - `stratumPassword` from preset
   - Note: `stratumUser` is not merged (commented out in code)

4. **Device Update**
   - Sends HTTP PATCH to device: `http://{device.ip}/api/system`
   - Body: Updated device info
   - Device applies configuration

5. **Response**
   - Returns updated device object
   - Device configuration is now applied

**Error Handling:**
- Preset not found → 400 error
- Device not found → 404 error
- Device communication error → 500 error with details

---

## Device Removal Flow

**Purpose:** Remove a device from monitoring and optionally delete associated data.

**Trigger:** `DELETE /devices/imprint/:id` or device removed from monitoring list

**Flow Diagram:**
```
Device Removal Request
    ↓
Controller (deleteImprintedDevice)
    ↓
Service (device.service.deleteImprintedDevice)
    ↓
Delete from LevelDB
    ↓
If Monitoring Active:
    ├─→ Stop HTTP Polling (clear timeout)
    ├─→ Close WebSocket Connection
    ├─→ Remove from ipMap
    └─→ Emit Socket.IO Event (device_removed)
    ↓
If DELETE_DATA_ON_DEVICE_REMOVE=true:
    ├─→ Delete Grafana Dashboard
    │   ├─→ Unpublish Dashboard
    │   └─→ Delete Dashboard File
    └─→ Delete Prometheus Metrics
    ↓
Device Removed
```

**Steps:**

1. **Deletion Request**
   - `DELETE /devices/imprint/:id` endpoint
   - Or device removed from monitoring list

2. **Database Deletion**
   - Deletes device from LevelDB (`pluto_core:devices:imprinted`)
   - Key: Device MAC address

3. **Monitoring Cleanup** (if device was being monitored)
   - Stops HTTP polling (clears timeout)
   - Closes WebSocket connection
   - Removes from `ipMap`
   - Emits Socket.IO `device_removed` event

4. **Data Cleanup** (if `DELETE_DATA_ON_DEVICE_REMOVE=true`)
   - **Grafana Dashboard:**
     - Unpublishes dashboard via Grafana API
     - Deletes dashboard JSON file
   - **Prometheus Metrics:**
     - Removes all metrics with device hostname prefix
     - Removes from global registry

5. **Response**
   - Returns deleted device object
   - Status: 200 (success) or 404 (not found)

**Configuration:**
- `DELETE_DATA_ON_DEVICE_REMOVE`: Environment variable
- Default: `false`
- When `true`, all associated data is deleted

---

## Log Streaming Flow

**Purpose:** Stream device logs to clients via Socket.IO.

**Trigger:** WebSocket message from device + log listening enabled

**Flow Diagram:**
```
Device WebSocket Connection
    ↓
Device Sends Log Message
    ↓
WebSocket on('message')
    ↓
Custom Logger (device-specific)
    ↓
Check isListeningLogs Flag
    ├─→ false: Skip Socket.IO emission
    └─→ true: Emit Socket.IO Event
        ↓
Socket.IO Client Receives Event
```

**Steps:**

1. **WebSocket Connection**
   - Established during device monitoring (if `traceLogs=true`)
   - Connection: `ws://{device.ip}/api/ws`
   - Auto-reconnects on disconnect

2. **Log Message Reception**
   - Device sends log message via WebSocket
   - Received in `ws.on('message')` handler

3. **Logging**
   - Creates custom logger with device hostname
   - Logs message via `createCustomLogger(hostname).info(message)`

4. **Socket.IO Emission** (conditional)
   - Checks `isListeningLogs` flag
   - If `true`, emits Socket.IO `logs_update` event:
     ```json
     {
       "mac": "aa:bb:cc:dd:ee:ff",
       "ip": "192.168.1.100",
       "info": "Log message content"
     }
     ```

5. **Client Reception**
   - Clients connected to Socket.IO receive `logs_update` events
   - Can display logs in real-time

**Control:**
- **Enable:** Client sends `enableLogsListening` event
- **Disable:** Client sends `disableLogsListening` event
- **Check Status:** Client sends `checkLogsListening` event
- **Status Response:** Server emits `logsListeningStatus` event

---

## Device Configuration Update Flow

**Purpose:** Update device system configuration remotely.

**Trigger:** `PATCH /devices/:id/system`

**Flow Diagram:**
```
Client Request (device configuration)
    ↓
Controller (patchDeviceSystemInfo)
    ↓
Get Device from Database
    ↓
If presetUuid provided:
    └─→ Get and Merge Preset
    ↓
Build Device Info Payload
    ↓
HTTP PATCH to Device
    ↓
Device Applies Configuration
    ↓
Return Updated Device
```

**Steps:**

1. **Client Request**
   - Endpoint: `PATCH /devices/:id/system`
   - Body: Device object with `info` and optional `presetUuid`

2. **Device Lookup**
   - Gets device from database
   - Verifies device exists and has IP

3. **Preset Merging** (if `presetUuid` provided)
   - Gets preset from database
   - Merges preset configuration (see [Preset Application Flow](#preset-application-flow))

4. **Device Update Request**
   - Sends HTTP PATCH to: `http://{device.ip}/api/system`
   - Body: Device info object
   - Device receives and applies configuration

5. **Response**
   - Returns updated device object
   - Status: 200 (success) or error status

**Device Configuration Fields:**
- `hostname`
- `frequency`
- `coreVoltage`
- `stratumURL`
- `stratumPort`
- `stratumPassword`
- And other device-specific settings

**Error Handling:**
- Device not found → 404
- Device IP unavailable → 400
- Device communication error → 500 with error details

---

## Flow Interactions

### Startup Flow

1. Server starts
2. If `AUTO_LISTEN=true`:
   - Calls `listenToDevices()` (no filter, no trace logs)
   - Creates Grafana overview dashboard
3. Routes registered
4. Server listening on configured port

### Complete Device Lifecycle

1. **Discovery** → Discover devices on network
2. **Imprinting** → Register devices in database
3. **Monitoring** → Start HTTP polling and WebSocket
4. **Metrics** → Collect and expose Prometheus metrics
5. **Dashboards** → Create Grafana dashboards
6. **Configuration** → Update device settings (optionally via presets)
7. **Removal** → Remove device and cleanup data

### Real-Time Updates

- **HTTP Polling** (5-second interval):
  - Device status → LevelDB → Prometheus → Socket.IO → Client
- **WebSocket** (real-time):
  - Device logs → Custom Logger → Socket.IO → Client (if enabled)

---

## Error Flows

### Device Polling Failure

1. HTTP request fails
2. Device marked as offline (`tracing: false`)
3. Socket.IO `error` event emitted
4. Polling continues (will retry on next interval)

### WebSocket Connection Failure

1. Connection error or close
2. Reconnection attempted (exponential backoff)
3. Max 5 attempts
4. If all fail, connection stopped (polling continues)

### Grafana API Failure

1. Dashboard creation/publishing fails
2. Error logged
3. Process continues (device monitoring unaffected)
4. Dashboard creation retried on next poll

### Discovery Service Failure

1. HTTP request fails
2. Error logged
3. 500 error returned to client
4. No devices returned

