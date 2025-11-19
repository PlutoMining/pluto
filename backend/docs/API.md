# API Reference

Complete documentation of all API endpoints in the Pluto Backend.

## Base URL

All endpoints are relative to the server base URL (default: `http://localhost:3000`).

## Authentication

Currently, the API does not require authentication. Consider adding authentication middleware for production use.

## Response Format

All responses are JSON. Error responses follow this format:

```json
{
  "error": "Error message"
}
```

Success responses typically include:

```json
{
  "message": "Success message",
  "data": { ... }
}
```

## Endpoints

### Metrics

#### GET /metrics

Exposes Prometheus metrics in Prometheus format.

**Response:**
- Content-Type: `text/plain; version=0.0.4; charset=utf-8`
- Body: Prometheus metrics text format

**Example:**
```bash
curl http://localhost:3000/metrics
```

**Metrics Exposed:**
- Device-specific metrics (prefixed with hostname)
- Overview metrics (aggregated across all devices)

---

### Devices

#### GET /devices/discover

Discovers devices via the discovery service.

**Query Parameters:**
- `ip` (optional): Filter by IP address
- `mac` (optional): Filter by MAC address

**Response:**
```json
[
  {
    "mac": "aa:bb:cc:dd:ee:ff",
    "ip": "192.168.1.100",
    "hostname": "bitaxe-001",
    "info": { ... }
  }
]
```

**Example:**
```bash
curl "http://localhost:3000/devices/discover?ip=192.168.1.100"
```

#### GET /devices/discovered

Looks up multiple devices from the discovery service.

**Query Parameters:**
- `macs` (optional): Comma-separated list of MAC addresses
- `ips` (optional): Comma-separated list of IP addresses
- `hostnames` (optional): Comma-separated list of hostnames
- `partialMacs` (optional): `"left" | "right" | "both" | "none"` (default: `"both"`)
- `partialIps` (optional): `"left" | "right" | "both" | "none"` (default: `"both"`)
- `partialHostnames` (optional): `"left" | "right" | "both" | "none"` (default: `"both"`)

**Response:**
```json
[
  {
    "mac": "aa:bb:cc:dd:ee:ff",
    "ip": "192.168.1.100",
    "hostname": "bitaxe-001",
    "info": { ... }
  }
]
```

**Example:**
```bash
curl "http://localhost:3000/devices/discovered?macs=aa:bb:cc:dd:ee:ff,11:22:33:44:55:66"
```

#### PUT /devices/imprint

Imprints (registers) multiple devices.

**Request Body:**
```json
{
  "macs": ["aa:bb:cc:dd:ee:ff", "11:22:33:44:55:66"]
}
```

**Response:**
```json
{
  "message": "Devices imprint successful",
  "data": [
    {
      "mac": "aa:bb:cc:dd:ee:ff",
      "ip": "192.168.1.100",
      "info": { ... }
    }
  ]
}
```

**Status Codes:**
- `200`: Success
- `404`: No devices found
- `500`: Server error

**Example:**
```bash
curl -X PUT http://localhost:3000/devices/imprint \
  -H "Content-Type: application/json" \
  -d '{"macs": ["aa:bb:cc:dd:ee:ff"]}'
```

#### PATCH /devices/imprint

Imprints a single device (adds to existing imprinted devices).

**Request Body:**
```json
{
  "mac": "aa:bb:cc:dd:ee:ff"
}
```

**Response:**
```json
{
  "message": "Devices imprint successful",
  "data": [
    {
      "mac": "aa:bb:cc:dd:ee:ff",
      "ip": "192.168.1.100",
      "info": { ... }
    }
  ]
}
```

**Example:**
```bash
curl -X PATCH http://localhost:3000/devices/imprint \
  -H "Content-Type: application/json" \
  -d '{"mac": "aa:bb:cc:dd:ee:ff"}'
```

#### GET /devices/imprint

Retrieves all imprinted devices.

**Query Parameters:**
- `q` (optional): Search query (searches IP addresses with partial matching)

**Response:**
```json
{
  "message": "Devices retrieved successfully",
  "data": [
    {
      "mac": "aa:bb:cc:dd:ee:ff",
      "ip": "192.168.1.100",
      "info": {
        "hostname": "bitaxe-001",
        "frequencyOptions": [...],
        "coreVoltageOptions": [...],
        ...
      }
    }
  ]
}
```

**Example:**
```bash
curl "http://localhost:3000/devices/imprint?q=192.168.1"
```

#### GET /devices/imprint/:id

Retrieves a single imprinted device by MAC address.

**Path Parameters:**
- `id`: Device MAC address

**Response:**
```json
{
  "message": "Device retrieved successfully",
  "data": {
    "mac": "aa:bb:cc:dd:ee:ff",
    "ip": "192.168.1.100",
    "info": { ... }
  }
}
```

**Status Codes:**
- `200`: Success
- `500`: Server error

**Example:**
```bash
curl http://localhost:3000/devices/imprint/aa:bb:cc:dd:ee:ff
```

#### PATCH /devices/imprint/:id

Updates an imprinted device.

**Path Parameters:**
- `id`: Device MAC address

**Request Body:**
```json
{
  "device": {
    "mac": "aa:bb:cc:dd:ee:ff",
    "ip": "192.168.1.100",
    "presetUuid": "preset-uuid-here",
    "info": {
      "hostname": "bitaxe-001",
      "frequency": 800,
      ...
    }
  }
}
```

**Response:**
```json
{
  "message": "Device updated successfully",
  "data": {
    "mac": "aa:bb:cc:dd:ee:ff",
    "ip": "192.168.1.100",
    "info": { ... }
  }
}
```

**Status Codes:**
- `200`: Success
- `404`: Device not found
- `500`: Server error

**Example:**
```bash
curl -X PATCH http://localhost:3000/devices/imprint/aa:bb:cc:dd:ee:ff \
  -H "Content-Type: application/json" \
  -d '{"device": {"mac": "aa:bb:cc:dd:ee:ff", "info": {"hostname": "new-hostname"}}}'
```

#### DELETE /devices/imprint/:id

Deletes an imprinted device.

**Path Parameters:**
- `id`: Device MAC address

**Response:**
```json
{
  "message": "Device deleted successfully",
  "data": {
    "mac": "aa:bb:cc:dd:ee:ff",
    "ip": "192.168.1.100",
    "info": { ... }
  }
}
```

**Status Codes:**
- `200`: Success
- `404`: Device not found
- `500`: Server error

**Example:**
```bash
curl -X DELETE http://localhost:3000/devices/imprint/aa:bb:cc:dd:ee:ff
```

#### GET /devices/presets/:presetId

Retrieves all devices associated with a preset.

**Path Parameters:**
- `presetId`: Preset UUID

**Response:**
```json
{
  "message": "Devices by preset retrieved successfully",
  "data": [
    {
      "mac": "aa:bb:cc:dd:ee:ff",
      "ip": "192.168.1.100",
      "presetUuid": "preset-uuid-here",
      "info": { ... }
    }
  ]
}
```

**Example:**
```bash
curl http://localhost:3000/devices/presets/preset-uuid-here
```

#### PUT /devices/listen

Starts monitoring specific devices.

**Request Body:**
```json
{
  "macs": ["aa:bb:cc:dd:ee:ff"],
  "traceLogs": true
}
```

**Response:**
```json
{
  "message": "Devices listeners set successfully",
  "data": [
    {
      "mac": "aa:bb:cc:dd:ee:ff",
      "ip": "192.168.1.100",
      "info": { ... }
    }
  ]
}
```

**Parameters:**
- `macs`: Array of MAC addresses to monitor
- `traceLogs` (optional): Enable WebSocket log streaming

**Example:**
```bash
curl -X PUT http://localhost:3000/devices/listen \
  -H "Content-Type: application/json" \
  -d '{"macs": ["aa:bb:cc:dd:ee:ff"], "traceLogs": true}'
```

#### POST /devices/:id/system/restart

Restarts a device.

**Path Parameters:**
- `id`: Device MAC address

**Response:**
```json
{
  "message": "Device restarted successfully",
  "data": { ... }
}
```

**Status Codes:**
- `200`: Success
- `400`: Device IP not available
- `404`: Device not found
- `500`: Server error or device communication error

**Example:**
```bash
curl -X POST http://localhost:3000/devices/aa:bb:cc:dd:ee:ff/system/restart
```

#### PATCH /devices/:id/system

Updates device system information.

**Path Parameters:**
- `id`: Device MAC address

**Request Body:**
```json
{
  "presetUuid": "preset-uuid-here",
  "info": {
    "hostname": "bitaxe-001",
    "frequency": 800,
    "coreVoltage": 850,
    "stratumURL": "stratum+tcp://pool.example.com",
    "stratumPort": 3333,
    "stratumPassword": "password",
    ...
  }
}
```

**Note:** If `presetUuid` is provided, the preset configuration will be merged into `info`.

**Response:**
```json
{
  "message": "Device system info updated successfully",
  "data": {
    "presetUuid": "preset-uuid-here",
    "info": { ... }
  }
}
```

**Status Codes:**
- `200`: Success
- `400`: Device IP not available or preset not found
- `404`: Device not found
- `500`: Server error or device communication error

**Example:**
```bash
curl -X PATCH http://localhost:3000/devices/aa:bb:cc:dd:ee:ff/system \
  -H "Content-Type: application/json" \
  -d '{"info": {"hostname": "new-hostname", "frequency": 800}}'
```

---

### Presets

#### GET /presets

Retrieves all presets.

**Response:**
```json
{
  "message": "Presets retrieved successfully",
  "data": [
    {
      "uuid": "preset-uuid-here",
      "name": "My Preset",
      "configuration": {
        "stratumURL": "stratum+tcp://pool.example.com",
        "stratumPort": 3333,
        "stratumPassword": "password",
        ...
      }
    }
  ]
}
```

**Example:**
```bash
curl http://localhost:3000/presets
```

#### GET /presets/:id

Retrieves a single preset by UUID.

**Path Parameters:**
- `id`: Preset UUID

**Response:**
```json
{
  "message": "Preset retrieved successfully",
  "data": {
    "uuid": "preset-uuid-here",
    "name": "My Preset",
    "configuration": { ... }
  }
}
```

**Status Codes:**
- `200`: Success
- `404`: Preset not found
- `500`: Server error

**Example:**
```bash
curl http://localhost:3000/presets/preset-uuid-here
```

#### POST /presets

Creates a new preset.

**Request Body:**
```json
{
  "name": "My Preset",
  "configuration": {
    "stratumURL": "stratum+tcp://pool.example.com",
    "stratumPort": 3333,
    "stratumPassword": "password",
    ...
  }
}
```

**Note:** UUID is auto-generated.

**Response:**
```json
{
  "message": "Preset created successfully",
  "data": {
    "uuid": "preset-uuid-here",
    "name": "My Preset",
    "configuration": { ... }
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/presets \
  -H "Content-Type: application/json" \
  -d '{"name": "My Preset", "configuration": {...}}'
```

#### DELETE /presets/:id

Deletes a preset.

**Path Parameters:**
- `id`: Preset UUID

**Response:**
```json
{
  "message": "Preset deleted successfully",
  "data": {
    "uuid": "preset-uuid-here",
    "name": "My Preset",
    "configuration": { ... }
  }
}
```

**Status Codes:**
- `200`: Success
- `404`: Preset not found
- `500`: Server error

**Example:**
```bash
curl -X DELETE http://localhost:3000/presets/preset-uuid-here
```

---

### Dashboards

#### GET /dashboards

Retrieves all Grafana dashboards with enriched data.

**Response:**
```json
[
  {
    "name": "bitaxe-001",
    "uid": "dashboard-uid-here",
    "grafanaData": {
      "uid": "public-dashboard-uid",
      "dashboardUid": "dashboard-uid-here",
      "accessToken": "access-token-here",
      "isEnabled": true,
      "timeSelectionEnabled": true,
      ...
    },
    "publicUrl": "/grafana/public-dashboards/access-token-here?orgId=1"
  }
]
```

**Example:**
```bash
curl http://localhost:3000/dashboards
```

---

### Socket.IO

#### GET /socket/io

Initializes the Socket.IO handler (if not already initialized).

**Response:**
```json
{
  "message": "Socket started listening to devices"
}
```

**Note:** This endpoint initializes the Socket.IO server. Actual Socket.IO communication happens via WebSocket connection to `/socket/io`.

**Example:**
```bash
curl http://localhost:3000/socket/io
```

## Socket.IO Events

### Client → Server Events

#### `enableLogsListening`
Enables log streaming from devices.

#### `disableLogsListening`
Disables log streaming from devices.

#### `checkLogsListening`
Checks if log listening is enabled.

### Server → Client Events

#### `stat_update`
Emitted when device status is updated (every 5 seconds per device).

**Payload:**
```json
{
  "mac": "aa:bb:cc:dd:ee:ff",
  "ip": "192.168.1.100",
  "tracing": true,
  "info": {
    "hostname": "bitaxe-001",
    "power": 150,
    "hashRate": 1000,
    ...
  }
}
```

#### `logs_update`
Emitted when a device log message is received (only if log listening is enabled).

**Payload:**
```json
{
  "mac": "aa:bb:cc:dd:ee:ff",
  "ip": "192.168.1.100",
  "info": "Log message from device"
}
```

#### `device_removed`
Emitted when a device is removed from monitoring.

**Payload:**
```json
{
  "ipRemoved": "192.168.1.100",
  "remainingIps": ["192.168.1.101", "192.168.1.102"]
}
```

#### `error`
Emitted when an error occurs during device polling.

**Payload:**
```json
{
  "mac": "aa:bb:cc:dd:ee:ff",
  "ip": "192.168.1.100",
  "tracing": false,
  "error": "Error message"
}
```

#### `logsListeningStatus`
Emitted when log listening status changes or when requested.

**Payload:**
```json
true  // or false
```

## Error Handling

All endpoints return appropriate HTTP status codes:

- `200 OK`: Success
- `400 Bad Request`: Invalid request parameters
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

Error responses include an `error` field with a descriptive message.

## Security Notes

1. **Secret Removal**: The `removeSecretsMiddleware` automatically removes `stratumPassword` and `wifiPassword` from all responses.

2. **No Authentication**: The API currently does not require authentication. Consider adding authentication for production use.

3. **Input Validation**: Currently relies on TypeScript types. Consider adding validation middleware (e.g., express-validator) for production use.

## Rate Limiting

Currently, there is no rate limiting. Consider adding rate limiting middleware for production use.

