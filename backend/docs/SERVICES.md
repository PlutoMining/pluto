# Services Documentation

This document provides detailed documentation for all services in the Pluto Backend.

## Table of Contents

- [Device Service](#device-service)
- [Grafana Service](#grafana-service)
- [Metrics Service](#metrics-service)
- [Presets Service](#presets-service)
- [Tracing Service](#tracing-service)

---

## Device Service

**File:** `src/services/device.service.ts`

### Purpose
Manages device discovery, imprinting (registration), and CRUD operations for devices.

### Key Functions

#### `discoverDevices(options?)`
Discovers devices via the external discovery service.

**Parameters:**
- `options.ip?: string` - Filter by IP address
- `options.mac?: string` - Filter by MAC address

**Returns:** `Promise<Device[]>`

**Flow:**
1. Makes HTTP GET request to `${DISCOVERY_SERVICE_HOST}/discover`
2. Returns discovered devices

#### `lookupMultipleDiscoveredDevices(options)`
Looks up multiple devices from the discovery service with flexible matching.

**Parameters:**
- `options.macs?: string[]` - Array of MAC addresses
- `options.ips?: string[]` - Array of IP addresses
- `options.hostnames?: string[]` - Array of hostnames
- `options.partialMatch?: object` - Partial matching options:
  - `macs: "left" | "right" | "both" | "none"`
  - `ips: "left" | "right" | "both" | "none"`
  - `hostnames: "left" | "right" | "both" | "none"`

**Returns:** `Promise<Device[]>`

**Flow:**
1. Builds query parameters from options
2. Makes HTTP GET request to `${DISCOVERY_SERVICE_HOST}/discovered`
3. Returns matching devices

#### `imprintDevices(macs)`
Registers devices by storing them in the database.

**Parameters:**
- `macs: string[]` - Array of MAC addresses to imprint

**Returns:** `Promise<Device[]>`

**Flow:**
1. Looks up devices via `lookupMultipleDiscoveredDevices`
2. For each device:
   - Cleans device info (removes secrets)
   - Attempts to insert into LevelDB (`pluto_core:devices:imprinted`)
   - If device exists, updates instead
3. Returns imprinted devices

#### `getImprintedDevices(options?)`
Retrieves all imprinted devices from the database.

**Parameters:**
- `options.ip?: string` - Filter by IP (optional)
- `options.partialMatch?: boolean` - Enable partial IP matching

**Returns:** `Promise<Device[]>`

#### `getImprintedDevice(mac)`
Retrieves a single device by MAC address.

**Parameters:**
- `mac: string` - MAC address

**Returns:** `Promise<Device | null>`

#### `getDevicesByPresetId(presetId)`
Retrieves all devices associated with a preset.

**Parameters:**
- `presetId: string` - Preset UUID

**Returns:** `Promise<Device[]>`

#### `patchImprintedDevice(id, device)`
Updates a device in the database.

**Parameters:**
- `id: string` - Device MAC address
- `device: Device` - Updated device object

**Returns:** `Promise<Device | null>`

#### `deleteImprintedDevice(id)`
Deletes a device from the database.

**Parameters:**
- `id: string` - Device MAC address

**Returns:** `Promise<Device | null>`

#### `listenToDevices(devices?, traceLogs?)`
Starts monitoring devices (delegates to tracing service).

**Parameters:**
- `devices?: Device[]` - Devices to monitor (if not provided, monitors all)
- `traceLogs?: boolean` - Enable WebSocket log streaming

**Returns:** `Promise<Device[]>`

---

## Grafana Service

**File:** `src/services/grafana.service.ts`

### Purpose
Manages Grafana dashboard creation, publishing, and deletion.

### Key Functions

#### `createGrafanaDeviceDashboard(device)`
Creates a Grafana dashboard for a specific device.

**Parameters:**
- `device: Device` - Device to create dashboard for

**Flow:**
1. Sanitizes device hostname
2. Checks if dashboard already exists
3. Reads template from `grafana_templates/bitaxe_dashboard_template.json`
4. Replaces `@@hostname@@` placeholders with sanitized hostname
5. Generates unique UID (14-character alphanumeric)
6. Writes dashboard JSON to `/home/node/app/grafana/dashboards/{hostname}.json`
7. Waits 2 seconds
8. Publishes dashboard via `publishDashboard`

#### `createGrafanaOverviewDashboard()`
Creates the overview dashboard for all devices.

**Flow:**
1. Checks if overview dashboard exists
2. Reads template from `grafana_templates/bitaxe_overview_dashboard_template.json`
3. Generates unique UID
4. Writes dashboard JSON to `/home/node/app/grafana/dashboards/overview.json`
5. Waits 2 seconds
6. Publishes dashboard

#### `deleteGrafanaDashboard(hostname)`
Deletes a device dashboard.

**Parameters:**
- `hostname: string` - Device hostname

**Flow:**
1. Sanitizes hostname
2. Reads dashboard JSON file
3. Unpublishes dashboard via `unpublishDashboard`
4. Deletes dashboard JSON file

#### `publishDashboard(dashboardUid)`
Publishes a dashboard as a public dashboard in Grafana.

**Parameters:**
- `dashboardUid: string` - Dashboard UID

**Returns:** `Promise<DashboardResponse>`

**Flow:**
1. GET request to check if dashboard is already published
2. If not published:
   - POST request to create public dashboard
   - PATCH request to configure public dashboard (enable time selection, etc.)
3. Returns dashboard response with `accessToken`

**Grafana API Endpoints Used:**
- `GET /grafana/api/dashboards/uid/{uid}/public-dashboards`
- `POST /grafana/api/dashboards/uid/{uid}/public-dashboards`
- `PATCH /grafana/api/dashboards/uid/{uid}/public-dashboards/{publicUid}`

#### `unpublishDashboard(dashboardUid)`
Unpublishes a public dashboard.

**Parameters:**
- `dashboardUid: string` - Dashboard UID

**Flow:**
1. GET request to check if dashboard is published
2. If published, DELETE request to unpublish

#### `getDashboardFiles()`
Reads all dashboard files and enriches with Grafana API data.

**Returns:** `Promise<Dashboard[]>`

**Flow:**
1. Reads all JSON files from `/home/node/app/grafana/dashboards/`
2. For each file:
   - Parses JSON
   - Calls `publishDashboard` to get Grafana data
   - Returns enriched dashboard object with public URL

---

## Metrics Service

**File:** `src/services/metrics.service.ts`

### Purpose
Manages Prometheus metrics collection and aggregation.

### Key Functions

#### `createMetricsForDevice(hostname)`
Creates Prometheus metrics for a specific device.

**Parameters:**
- `hostname: string` - Device hostname (used as metric prefix)

**Returns:** Object with:
- `updatePrometheusMetrics(data: DeviceInfo)` - Function to update metrics
- `register` - Prometheus registry

**Metrics Created:**
- `{hostname}_power_watts` - Power consumption
- `{hostname}_voltage_volts` - Voltage
- `{hostname}_current_amps` - Current
- `{hostname}_fanspeed_rpm` - Fan speed
- `{hostname}_temperature_celsius` - Temperature
- `{hostname}_hashrate_ghs` - Hash rate
- `{hostname}_shares_accepted` - Accepted shares
- `{hostname}_shares_rejected` - Rejected shares
- `{hostname}_uptime_seconds` - Uptime
- `{hostname}_free_heap_bytes` - Free heap memory
- `{hostname}_core_voltage_volts` - Core voltage
- `{hostname}_core_voltage_actual_volts` - Actual core voltage
- `{hostname}_frequency_mhz` - Frequency
- `{hostname}_efficiency` - Efficiency (J/TH)

**Data Transformations:**
- Voltage: divided by 1000 (millivolts → volts)
- Current: divided by 1000 (milliamps → amps)
- Efficiency: `power / (hashrate / 1000)`

#### `deleteMetricsForDevice(hostname)`
Removes all metrics for a device.

**Parameters:**
- `hostname: string` - Device hostname

**Flow:**
1. Finds all metrics with prefix `{hostname}_`
2. Removes each metric from the global registry

#### `updateOverviewMetrics(devicesData)`
Updates aggregated metrics for all devices.

**Parameters:**
- `devicesData: ExtendedDeviceInfo[]` - Array of device data

**Metrics Updated:**
- `total_hardware` - Total number of devices
- `hardware_online` - Number of online devices
- `hardware_offline` - Number of offline devices
- `total_hashrate` - Sum of all device hash rates
- `average_hashrate` - Average hash rate
- `total_power_watts` - Sum of all device power
- `firmware_version_distribution{version}` - Device count per firmware version
- `shares_by_pool_accepted{pool}` - Accepted shares per pool
- `shares_by_pool_rejected{pool}` - Rejected shares per pool
- `total_efficiency` - Overall efficiency

**Pool Mapping:**
- `mine.ocean.xyz:3334` → "Ocean Main"
- `solo.ckpool.org:3333` → "CKPool Main"
- `solo.ckpool.org:4334` → "CKPool High Diff"
- `umbrel.local:2018` → "Public Pool Local"

#### `register`
Exports the global Prometheus registry for metrics exposure.

---

## Presets Service

**File:** `src/services/presets.service.ts`

### Purpose
Manages device configuration presets.

### Key Functions

#### `getPresets()`
Retrieves all presets from the database.

**Returns:** `Promise<Preset[]>`

**Database Collection:** `pluto_core:presets`

#### `getPreset(id)`
Retrieves a single preset by UUID.

**Parameters:**
- `id: string` - Preset UUID

**Returns:** `Promise<Preset | null>`

#### `createPreset(payload)`
Creates a new preset.

**Parameters:**
- `payload: Preset` - Preset object (UUID is auto-generated)

**Returns:** `Promise<Preset>`

**Flow:**
1. Generates UUID v7
2. Inserts into LevelDB
3. Returns created preset

#### `deletePreset(id)`
Deletes a preset.

**Parameters:**
- `id: string` - Preset UUID

**Returns:** `Promise<Preset | null>`

---

## Tracing Service

**File:** `src/services/tracing.service.ts`

### Purpose
Manages real-time device monitoring via HTTP polling and WebSocket connections.

### Key State

- **ipMap**: Maps device IPs to monitoring state:
  ```typescript
  {
    [ip: string]: {
      ws?: WebSocket,           // WebSocket connection
      timeout?: NodeJS.Timeout,  // Polling timeout ID
      info?: DeviceInfo,         // Last known device info
      tracing?: boolean          // Online/offline status
    }
  }
  ```
- **ioInstance**: Socket.IO server instance (singleton)
- **isListeningLogs**: Boolean flag for log streaming

### Key Functions

#### `startIoHandler(server)`
Initializes Socket.IO server for client communication.

**Parameters:**
- `server: http.Server` - HTTP server instance

**Flow:**
1. Creates Socket.IO server with path `/socket/io`
2. Sets up event handlers:
   - `enableLogsListening` - Enable log streaming
   - `disableLogsListening` - Disable log streaming
   - `checkLogsListening` - Check current status
3. Emits `logsListeningStatus` events

**Socket.IO Events Emitted:**
- `stat_update` - Device status update
- `logs_update` - Device log message
- `device_removed` - Device removed
- `error` - Error occurred
- `logsListeningStatus` - Log listening status

#### `updateOriginalIpsListeners(newDevices, traceLogs?)`
Updates the list of monitored devices.

**Parameters:**
- `newDevices: Device[]` - Devices to monitor
- `traceLogs?: boolean` - Enable WebSocket log streaming

**Flow:**
1. **Removes devices** no longer in the list:
   - Stops polling (clears timeout)
   - Closes WebSocket connection
   - Emits `device_removed` event
   - If `DELETE_DATA_ON_DEVICE_REMOVE=true`:
     - Deletes Grafana dashboard
     - Deletes Prometheus metrics
   - Removes from ipMap

2. **Adds new devices**:
   - Calls `startDeviceMonitoring` for each new device

#### `startDeviceMonitoring(device, traceLogs?)`
Starts monitoring a single device.

**Parameters:**
- `device: Device` - Device to monitor
- `traceLogs?: boolean` - Enable WebSocket log streaming

**Flow:**

1. **Creates Prometheus metrics** for the device

2. **HTTP Polling** (every 5 seconds):
   - GET `http://{device.ip}/api/system/info`
   - On success:
     - Updates LevelDB with device info
     - Updates Prometheus metrics
     - Emits Socket.IO `stat_update` event
     - Creates/updates Grafana dashboard
     - Updates ipMap
   - On error:
     - Marks device as offline (`tracing: false`)
     - Emits Socket.IO `error` event
   - After each poll:
     - Updates overview metrics with all device data

3. **WebSocket Connection** (if `traceLogs` is true):
   - Connects to `ws://{device.ip}/api/ws`
   - On message:
     - Logs message via custom logger
     - If `isListeningLogs` is true, emits Socket.IO `logs_update` event
   - Auto-reconnect with exponential backoff (max 5 attempts)

**Reconnection Logic:**
- Retry attempts: 0-5
- Delay: `min(5000, retryAttempts * 1000)` milliseconds
- After 5 failed attempts, stops trying

#### `getIoInstance()`
Returns the Socket.IO server instance.

**Returns:** `ServerIO | undefined`

---

## Service Interactions

### Device Lifecycle

1. **Discovery** → `device.service.discoverDevices()`
2. **Imprinting** → `device.service.imprintDevices()`
3. **Monitoring Start** → `device.service.listenToDevices()` → `tracing.service.updateOriginalIpsListeners()`
4. **Polling** → `tracing.service.startDeviceMonitoring()` → HTTP polling + WebSocket
5. **Metrics Update** → `metrics.service.updatePrometheusMetrics()` + `metrics.service.updateOverviewMetrics()`
6. **Dashboard Creation** → `grafana.service.createGrafanaDeviceDashboard()`
7. **Removal** → `device.service.deleteImprintedDevice()` → `tracing.service` removes from monitoring

### Data Flow

```
Device → HTTP Polling → Device Info
                    ↓
            Update LevelDB
                    ↓
            Update Prometheus Metrics
                    ↓
            Emit Socket.IO Event
                    ↓
            Create/Update Grafana Dashboard
```

```
Device → WebSocket → Log Messages
                ↓
        Custom Logger
                ↓
        Socket.IO Event (if enabled)
```

