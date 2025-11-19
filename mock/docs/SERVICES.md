# Services Documentation

This document provides detailed documentation for all services in the Pluto Mock Service.

## Table of Contents

- [Mock Service](#mock-service)

---

## Mock Service

**File:** `src/services/mock.service.ts`

### Purpose
Generates realistic mock device data for both Legacy and New API versions, including firmware version distribution and fake log generation.

### Key Functions

#### `generateSystemInfo(hostname, uptimeSeconds, systemInfo?)`
Generates device information for Legacy API version.

**Parameters:**
- `hostname: string` - Device hostname
- `uptimeSeconds: number` - Device uptime in seconds
- `systemInfo?: Partial<DeviceInfoLegacy>` - Optional custom configuration to override defaults

**Returns:** `Partial<DeviceInfoLegacy>`

**Flow:**
1. Extracts numeric part from hostname
2. Gets firmware version based on hostname
3. Generates random values for all device fields
4. Merges with custom `systemInfo` if provided
5. Returns complete device information

**Generated Fields:**
- `power`: 10-20 watts (random float)
- `voltage`: 5000-6000 millivolts (random int)
- `current`: 2000-3000 milliamps (random float)
- `fanSpeedRpm`: 4000-6000 RPM (random int)
- `temp`: 30-70°C (random int)
- `hashRate`: 700-800 GH/s (random float)
- `bestDiff`: 1-5M (random float)
- `bestSessionDiff`: 10-30k (random float)
- `freeHeap`: 100000-200000 bytes (random int)
- `coreVoltage`: 1000-1300 millivolts (random int)
- `coreVoltageActual`: 1000-1300 millivolts (random int)
- `frequency`: 400-600 MHz (random int)
- `ssid`: "WiFi-SSID"
- `hostname`: Provided hostname
- `wifiStatus`: "Connected!"
- `sharesAccepted`: 0-10 (random int)
- `sharesRejected`: 0-10 (random int)
- `uptimeSeconds`: Provided uptime
- `ASICModel`: "BM1368"
- `stratumURL`: "solo.ckpool.org"
- `stratumPort`: 3333
- `stratumUser`: `bc1asdasdasdasdasasdasdasdasdasdasd.{hostname}`
- `version`: Firmware version (from distribution)
- `boardVersion`: "401"
- `runningPartition`: "factory"
- `flipscreen`: 0-1 (random int)
- `invertscreen`: 0-1 (random int)
- `invertfanpolarity`: 0-1 (random int)
- `autofanspeed`: 0-1 (random int)
- `fanspeed`: 0-100 (random int)

**Example:**
```typescript
const deviceInfo = generateSystemInfo("mockaxe1", 3600, {
  power: 15,
  frequency: 500
});
// Returns device info with power=15, frequency=500, and other random values
```

---

#### `generateSystemInfoAlt(hostname, uptimeSeconds, systemInfo?)`
Generates device information for New API version.

**Parameters:**
- `hostname: string` - Device hostname
- `uptimeSeconds: number` - Device uptime in seconds
- `systemInfo?: Partial<DeviceInfoNew>` - Optional custom configuration to override defaults

**Returns:** `Partial<DeviceInfoNew>`

**Flow:**
1. Extracts numeric part from hostname
2. Gets firmware version based on hostname
3. Generates random values for all device fields (including new API fields)
4. Merges with custom `systemInfo` if provided
5. Returns complete device information

**Generated Fields (includes all Legacy fields plus):**
- `maxPower`: 70 watts
- `minPower`: 30 watts
- `maxVoltage`: 13 volts
- `minVoltage`: 11 volts
- `vrTemp`: 60-80°C (random float)
- `hashRateTimestamp`: Current timestamp
- `hashRate_10m`: 2900-3100 GH/s (random float)
- `hashRate_1h`: 2900-3100 GH/s (random float)
- `hashRate_1d`: 2900-3100 GH/s (random float)
- `jobInterval`: 1200
- `asicCount`: 2-6 (random int)
- `smallCoreCount`: 1200-1300 (random int)
- `deviceModel`: "NerdQAxe+"
- `overheat_temp`: 75°C
- `autoscreenoff`: 0-1 (random int)
- `fanrpm`: 2000-3000 RPM (random int)
- `lastResetReason`: "Power on reset"
- `history`: Object with arrays:
  - `hashrate_10m`: 4 random values (290000-310000)
  - `hashrate_1h`: 4 random values (300000-310000)
  - `hashrate_1d`: 4 random values (310000-320000)
  - `timestamps`: 4 random values (2000-5000)
  - `timestampBase`: Current timestamp

**Example:**
```typescript
const deviceInfo = generateSystemInfoAlt("mockaxe2", 7200, {
  hashRate_10m: 3000,
  power: 50
});
// Returns device info with hashRate_10m=3000, power=50, and other random values
```

---

#### `generateFakeLog()`
Generates a random fake log message.

**Returns:** `string`

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

**Usage:**
```typescript
const log = generateFakeLog();
// Returns one of the available log messages randomly
```

**Use Cases:**
- WebSocket log streaming
- Testing log handling
- Simulating device log output

---

### Helper Functions

#### `extractNumericFromHostname(hostname)`
Extracts the numeric part from a hostname.

**Parameters:**
- `hostname: string` - Hostname (e.g., "mockaxe1", "mockaxe42")

**Returns:** `number` - Numeric part or 0 if not found

**Example:**
```typescript
extractNumericFromHostname("mockaxe1");  // Returns: 1
extractNumericFromHostname("mockaxe42"); // Returns: 42
extractNumericFromHostname("mockaxe");   // Returns: 0
```

---

#### `getFirmwareVersion(hostname)`
Gets firmware version for a device based on its hostname.

**Parameters:**
- `hostname: string` - Device hostname

**Returns:** `string` - Firmware version

**Flow:**
1. Extracts numeric part from hostname
2. Maps to port index
3. Gets assigned firmware from distribution
4. Returns firmware version or default "v2.1.8"

**Firmware Distribution:**
Firmware versions are distributed probabilistically:
- Each device gets a random firmware based on percentages
- Distribution happens at startup
- Same hostname always gets same firmware (deterministic based on port)

---

#### `distributeFirmwareProportionally(ports)`
Distributes firmware versions across ports based on real-world percentages.

**Parameters:**
- `ports: number[]` - Array of port numbers

**Returns:** `{ [port: number]: string[] }` - Map of port to firmware versions

**Flow:**
1. Creates cumulative probability list from firmware percentages
2. For each port:
   - Generates random value
   - Selects firmware based on cumulative probability
   - Assigns to port
3. Returns distribution map

**Firmware Percentages:**
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

**Example:**
```typescript
const distribution = distributeFirmwareProportionally([8001, 8002, 8003]);
// Returns: { 8001: ["v2.1.10"], 8002: ["v2.2.2"], 8003: ["v2.1.8"] }
```

---

## Service Interactions

### Data Generation Flow

1. **Request Received** → Controller
2. **Controller** → `generateSystemInfo()` or `generateSystemInfoAlt()`
3. **Service** → Gets firmware version
4. **Service** → Generates random values
5. **Service** → Merges with custom config (if provided)
6. **Service** → Returns device info

### Firmware Distribution Flow

1. **Startup** → `distributeFirmwareProportionally(config.ports)`
2. **Service** → Creates cumulative probability list
3. **Service** → Assigns random firmware to each port
4. **Service** → Stores distribution map
5. **Runtime** → `getFirmwareVersion(hostname)` uses distribution

### Log Generation Flow

1. **WebSocket Broadcast** → `generateFakeLog()`
2. **Service** → Selects random log message
3. **Service** → Returns log string
4. **Worker** → Sends to WebSocket clients

## Data Characteristics

### Randomness
- All numeric values are randomly generated within realistic ranges
- Values change on each request (except custom overrides)
- Uptime is calculated dynamically based on server start time

### Realism
- Ranges based on real device behavior
- Firmware distribution matches real-world percentages
- Device models and ASIC types are realistic

### Determinism
- Firmware version is deterministic per hostname
- Custom configuration overrides persist via `app.locals`
- Uptime calculation is deterministic (based on start time)

## Best Practices

1. **Use Appropriate API Version**
   - Use `generateSystemInfo()` for Legacy devices
   - Use `generateSystemInfoAlt()` for New devices

2. **Custom Configuration**
   - Provide partial `systemInfo` to override defaults
   - Useful for testing specific scenarios
   - Persists via `app.locals.systemInfo`

3. **Firmware Distribution**
   - Distribution happens once at startup
   - Each device gets consistent firmware
   - Distribution matches real-world percentages

4. **Log Generation**
   - Use `generateFakeLog()` for WebSocket streaming
   - Logs are random but realistic
   - Useful for testing log handling

