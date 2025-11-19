# API Reference

Complete documentation of all API endpoints in the Pluto Mock Service.

## Base URL

Each mock device runs on its own port. The base URL depends on the configured ports (default: `http://localhost:8001`, `http://localhost:8002`, etc.).

The listing server runs on a separate port (default: `http://localhost:5000`).

## Authentication

Currently, the API does not require authentication. This is a mock service for development/testing only.

## Response Format

All responses are JSON unless otherwise specified. Error responses follow this format:

```json
{
  "error": "Error message"
}
```

## Mock Device Endpoints

Each mock device server exposes the following endpoints:

### GET /api/system/info

Retrieves current device system information.

**Response:**
```json
{
  "power": 15.234567,
  "voltage": 5500,
  "current": 2500.5,
  "fanSpeedRpm": 5000,
  "temp": 45,
  "hashRate": 750.123456789,
  "bestDiff": "3.45M",
  "bestSessionDiff": "25.3k",
  "freeHeap": 150000,
  "coreVoltage": 1200,
  "coreVoltageActual": 1200,
  "frequency": 500,
  "ssid": "WiFi-SSID",
  "hostname": "mockaxe1",
  "wifiStatus": "Connected!",
  "sharesAccepted": 5,
  "sharesRejected": 2,
  "uptimeSeconds": 3600,
  "ASICModel": "BM1368",
  "stratumURL": "solo.ckpool.org",
  "stratumPort": 3333,
  "stratumUser": "bc1asdasdasdasdasasdasdasdasdasdasd.mockaxe1",
  "version": "v2.1.10",
  "boardVersion": "401",
  "runningPartition": "factory",
  "flipscreen": 0,
  "invertscreen": 1,
  "invertfanpolarity": 0,
  "autofanspeed": 1,
  "fanspeed": 50
}
```

**For New API Version:**
```json
{
  "power": 50.123,
  "maxPower": 70,
  "minPower": 30,
  "voltage": 12000.45,
  "maxVoltage": 13,
  "minVoltage": 11,
  "current": 6500.5,
  "temp": 55,
  "vrTemp": 70.5,
  "hashRateTimestamp": 1705312345678,
  "hashRate_10m": 3000.123,
  "hashRate_1h": 3050.456,
  "hashRate_1d": 3100.789,
  "jobInterval": 1200,
  "bestDiff": "450.5M",
  "bestSessionDiff": "150.2M",
  "freeHeap": 5500000,
  "coreVoltage": 1350,
  "coreVoltageActual": 1350,
  "frequency": 525,
  "ssid": "EMN_Guest",
  "hostname": "mockaxe2",
  "wifiStatus": "Connected!",
  "sharesAccepted": 15000,
  "sharesRejected": 25,
  "uptimeSeconds": 7200,
  "asicCount": 4,
  "smallCoreCount": 1250,
  "ASICModel": "BM1368",
  "deviceModel": "NerdQAxe+",
  "stratumURL": "solo.ckpool.org",
  "stratumPort": 3333,
  "stratumUser": "bc1asdasdasdasdasasdasdasdasdasdasd.mockaxe2",
  "version": "v2.2.2",
  "runningPartition": "ota_1",
  "flipscreen": 0,
  "overheat_temp": 75,
  "invertscreen": 1,
  "autoscreenoff": 1,
  "invertfanpolarity": 0,
  "autofanspeed": 1,
  "fanspeed": 75,
  "fanrpm": 2500,
  "lastResetReason": "Power on reset",
  "history": {
    "hashrate_10m": [295000, 300000, 305000, 310000],
    "hashrate_1h": [300000, 305000, 310000, 315000],
    "hashrate_1d": [310000, 315000, 320000, 325000],
    "timestamps": [3000, 4000, 4500, 5000],
    "timestampBase": 1705312345678
  }
}
```

**Status Codes:**
- `200`: Success
- `503`: Service unavailable (during restart)

**Notes:**
- Values are randomly generated on each request
- Uptime is calculated dynamically based on server start time
- Firmware version is deterministic per device
- Custom configuration (from PATCH) overrides random values

**Example:**
```bash
curl http://localhost:8001/api/system/info
```

---

### PATCH /api/system

Updates device system configuration.

**Request Body:**
```json
{
  "power": 20,
  "frequency": 550,
  "coreVoltage": 1250,
  "stratumURL": "stratum+tcp://pool.example.com",
  "stratumPort": 3333,
  "stratumPassword": "password"
}
```

**Response:**
```json
{
  "message": "System info updated successfully"
}
```

**Status Codes:**
- `200`: Success
- `503`: Service unavailable (during restart)

**Notes:**
- Updates are stored in `app.locals.systemInfo`
- Subsequent `GET /api/system/info` requests will use updated values
- Only provided fields are updated (partial update)
- Updates persist for the lifetime of the worker

**Example:**
```bash
curl -X PATCH http://localhost:8001/api/system \
  -H "Content-Type: application/json" \
  -d '{"power": 20, "frequency": 550}'
```

---

### POST /api/system/restart

Simulates a device restart.

**Response:**
```html
<html><body><h1>System will restart shortly.</h1></body></html>
```

**Status Codes:**
- `200`: Restart initiated
- `503`: Service unavailable (during restart)

**Flow:**
1. Sets `isRestarting` flag to `true`
2. Returns HTML response immediately
3. After 5 seconds, sets `isRestarting` to `false`
4. During restart, all requests return 503

**Notes:**
- Restart simulation lasts 5 seconds
- During restart, middleware blocks all requests
- After restart, device continues with same configuration

**Example:**
```bash
curl -X POST http://localhost:8001/api/system/restart
```

---

## Listing Server Endpoints

The listing server runs on a separate port and provides information about all active mock devices.

### GET /servers

Retrieves list of all active mock device servers.

**Response:**
```json
{
  "message": "Available servers from listing-server:5000",
  "servers": [
    {
      "port": 8001,
      "hostname": "mockaxe1",
      "startTime": "2024-01-15T10:30:45.123Z"
    },
    {
      "port": 8002,
      "hostname": "mockaxe2",
      "startTime": "2024-01-15T10:30:45.456Z"
    }
  ]
}
```

**Status Codes:**
- `200`: Success

**Notes:**
- Returns all active servers except the listing server itself
- Used by discovery service for mock device detection
- Servers are tracked by main process

**Example:**
```bash
curl http://localhost:5000/servers
```

---

## WebSocket Endpoints

### WebSocket Connection

Each mock device (if `LOGS_PUB_ENABLED=true`) exposes a WebSocket endpoint for log streaming.

**Connection:**
```
ws://localhost:8001/api/ws
```

**Message Format:**
```json
{
  "log": "System started"
}
```

**Behavior:**
- Server broadcasts fake log messages every 5 seconds
- All connected clients receive the same log
- Log messages are randomly selected from a predefined list

**Available Log Messages:**
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

**Example:**
```javascript
const ws = new WebSocket('ws://localhost:8001/api/ws');

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('Log:', message.log);
});
```

---

## Error Handling

### Service Unavailable (503)

Returned when device is restarting:

```html
<html><body><h1>Server is temporarily unavailable. Please try again later.</h1></body></html>
```

**When:**
- Device is in restart state (5 seconds after POST /api/system/restart)

### Internal Server Error (500)

Returned for unexpected errors:

```json
{
  "error": "Failed to retrieve system info"
}
```

**When:**
- Unexpected errors in request handling
- Data generation failures

## Device Identification

### Hostname Format
- Format: `mockaxe{N}`
- Examples: `mockaxe1`, `mockaxe2`, `mockaxe42`
- Numeric part determines device index

### Port Mapping
- Ports are configured via `PORTS` environment variable
- Each device gets one port
- Port order determines device index

### API Version Distribution
- Even indices (0, 2, 4, ...): Legacy API
- Odd indices (1, 3, 5, ...): New API

## Integration with Discovery Service

The discovery service can detect mock devices if `DETECT_MOCK_DEVICES=true`:

1. **Discovery Service** calls `GET {MOCK_DISCOVERY_HOST}/servers`
2. **Listing Server** returns list of active mock devices
3. **Discovery Service** adds mock devices to ARP table
4. **Discovery Service** validates mock devices like real devices

**Example Configuration:**
```bash
# Discovery Service
DETECT_MOCK_DEVICES=true
MOCK_DISCOVERY_HOST=http://localhost:5000

# Mock Service
LISTING_PORT=5000
PORTS=8001,8002,8003,8004,8005
```

## Best Practices

1. **Use Listing Server**: Query `/servers` to discover all mock devices
2. **Handle Restart State**: Check for 503 responses during restart
3. **WebSocket Reconnection**: Implement reconnection logic for WebSocket clients
4. **Configuration Updates**: Use PATCH to set specific values for testing
5. **Port Management**: Ensure port ranges don't conflict with other services

