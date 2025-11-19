# System Flows Documentation

This document describes the key flows and processes in the Pluto Discovery Service.

## Table of Contents

- [Device Discovery Flow](#device-discovery-flow)
- [Direct IP Discovery Flow](#direct-ip-discovery-flow)
- [Device Lookup Flow](#device-lookup-flow)
- [ARP Scanning Flow](#arp-scanning-flow)
- [Device Validation Flow](#device-validation-flow)
- [Mock Device Integration Flow](#mock-device-integration-flow)

---

## Device Discovery Flow

**Purpose:** Discover devices on the network using ARP scanning and validate them.

**Trigger:** `GET /discover` (without specific IP or with partialMatch)

**Flow Diagram:**
```
Client Request
    ↓
Controller (discoverDevices)
    ↓
Service (discovery.service.discoverDevices)
    ↓
Get Active Network Interfaces
    ↓
ARP Scan (Parallel on All Interfaces)
    ├─→ Interface 1: arpScan()
    ├─→ Interface 2: arpScan()
    └─→ Interface N: arpScan()
    ↓
Aggregate ARP Results
    ↓
Optional: Add Mock Devices
    ↓
Filter by IP (if partialMatch)
    ↓
For Each Device (Sequential):
    ├─→ HTTP GET /api/system/info
    ├─→ Check for ASICModel
    ├─→ Create Device Object
    └─→ Store in LevelDB
    ↓
Return Discovered Devices
```

**Steps:**

1. **Client Request**
   - Endpoint: `GET /discover`
   - Query parameters: `ip` (optional, with partialMatch), `mac` (optional)

2. **Controller Processing**
   - Extracts query parameters
   - Calls `discovery.service.discoverDevices()`
   - Sets `partialMatch: false` by default

3. **Network Interface Detection**
   - Calls `getActiveNetworkInterfaces()`
   - Executes: `ip -o addr show | awk '{print $2}' | grep -Ev '^(docker|br-|veth|lo|dind|.orbmirror)' | sort -u`
   - Returns array of active interface names

4. **ARP Scanning** (Parallel)
   - For each interface, calls `arpScan(interface)`
   - Uses `Promise.allSettled` to handle failures gracefully
   - Executes: `arp-scan --interface={interface} --localnet`
   - Parses output to extract IP, MAC, and vendor
   - Aggregates results from all interfaces

5. **Mock Device Integration** (Optional)
   - If `DETECT_MOCK_DEVICES=true`:
     - HTTP GET to `${MOCK_DISCOVERY_HOST}/servers`
     - Maps servers to mock devices with fake MAC addresses
     - Adds to ARP table

6. **IP Filtering** (If `ip` provided with `partialMatch=true`)
   - Filters ARP table to devices matching IP pattern
   - Uses `device.ip.includes(options.ip)`

7. **Device Validation** (Sequential)
   - For each device in ARP table:
     - HTTP GET to `http://{device.ip}/api/system/info` (1 second timeout)
     - Checks response for `ASICModel` field
     - If valid:
       - Creates Device object
       - Stores in LevelDB (`pluto_discovery:devices:discovered`)
       - If device exists, updates instead of inserting

8. **Response**
   - Returns array of valid devices
   - Empty array if no devices found

**Error Handling:**
- ARP scan errors: Logged, interface skipped, other interfaces continue
- HTTP timeouts: Logged, device skipped, discovery continues
- HTTP errors: Logged, device skipped, discovery continues
- Database errors: Logged, rethrown

**Performance:**
- ARP scanning: Parallel (fast)
- Device validation: Sequential (slow, could be parallelized)
- Typical duration: 5-30 seconds depending on network size

---

## Direct IP Discovery Flow

**Purpose:** Quickly discover a single device by directly connecting to its IP address.

**Trigger:** `GET /discover?ip={ip}` (without partialMatch)

**Flow Diagram:**
```
Client Request (with specific IP)
    ↓
Controller (discoverDevices)
    ↓
Service (discovery.service.discoverDevices)
    ↓
Bypass ARP Scan
    ↓
Direct HTTP GET to Device
    ↓
Check for ASICModel
    ↓
Create Device Object
    ↓
Store in LevelDB
    ↓
Return Device
```

**Steps:**

1. **Client Request**
   - Endpoint: `GET /discover?ip=192.168.1.100`
   - No `partialMatch` parameter (defaults to false)

2. **Controller Processing**
   - Extracts `ip` parameter
   - Calls `discovery.service.discoverDevices({ ip, partialMatch: false })`

3. **Bypass ARP Scan**
   - Service detects `ip` provided without `partialMatch`
   - Skips network interface detection and ARP scanning

4. **Direct Connection**
   - HTTP GET to `http://{ip}/api/system/info`
   - Timeout: 1 second

5. **Validation**
   - Checks response for `ASICModel` field
   - If not found, returns empty array

6. **Storage**
   - Creates Device object with:
     - `ip`: Provided IP
     - `mac`: From response or "unknown"
     - `info`: Full response data
   - Stores in LevelDB

7. **Response**
   - Returns single device or empty array

**Advantages:**
- Much faster than full network scan
- No network scanning overhead
- Direct connection to known device

**Use Cases:**
- Discovering a specific device
- Quick validation of device accessibility
- Testing device connectivity

---

## Device Lookup Flow

**Purpose:** Look up previously discovered devices from the database with flexible matching.

**Trigger:** `GET /discovered` with query parameters

**Flow Diagram:**
```
Client Request (with filters)
    ↓
Controller (getDiscoveredDevices)
    ↓
Parse Query Parameters
    ├─→ macs (comma-separated)
    ├─→ ips (comma-separated)
    ├─→ hostnames (comma-separated)
    └─→ partialMatch options
    ↓
Service (lookupMultipleDiscoveredDevices)
    ↓
Query LevelDB (All Devices)
    ↓
Apply Filters (For Each Device):
    ├─→ MAC Matching (if macs provided)
    ├─→ IP Matching (if ips provided)
    └─→ Hostname Matching (if hostnames provided)
    ↓
Apply Partial Matching Logic
    ↓
Return Filtered Devices
```

**Steps:**

1. **Client Request**
   - Endpoint: `GET /discovered`
   - Query parameters:
     - `macs`: Comma-separated MAC addresses
     - `ips`: Comma-separated IP addresses
     - `hostnames`: Comma-separated hostnames
     - `partialMacs`, `partialIps`, `partialHostnames`: Matching options

2. **Controller Processing**
   - Parses comma-separated values into arrays
   - Extracts partial matching options (defaults to "both")
   - Calls `discovery.service.lookupMultipleDiscoveredDevices()`

3. **Database Query**
   - Queries all devices from `pluto_discovery:devices:discovered`
   - Uses filter function for matching

4. **Filtering Logic** (For each device)
   - **MAC Matching** (if `macs` provided):
     - Uses `matchWithPartial(device.mac, macs, partialMatch.macs)`
     - If no match, device excluded
   - **IP Matching** (if `ips` provided):
     - Uses `matchWithPartial(device.ip, ips, partialMatch.ips)`
     - If no match, device excluded
   - **Hostname Matching** (if `hostnames` provided):
     - Uses `matchWithPartial(device.info.hostname, hostnames, partialMatch.hostnames)`
     - If no match, device excluded
   - **All Filters**: Device must match ALL provided filters

5. **Partial Matching Helper**
   - `"none"`: Exact match (`value === item`)
   - `"left"`: Suffix match (`value.endsWith(item)`)
   - `"right"`: Prefix match (`value.startsWith(item)`)
   - `"both"`: Substring match (`value.includes(item)`)

6. **Response**
   - Returns array of matching devices
   - Empty array if no matches

**Example Flows:**

**Exact MAC Match:**
```
Request: ?macs=aa:bb:cc:dd:ee:ff&partialMacs=none
→ Query all devices
→ Filter: device.mac === "aa:bb:cc:dd:ee:ff"
→ Return matching device
```

**Prefix MAC Match:**
```
Request: ?macs=aa:bb&partialMacs=right
→ Query all devices
→ Filter: device.mac.startsWith("aa:bb")
→ Return all devices with MAC starting with "aa:bb"
```

**Multiple Filters:**
```
Request: ?macs=aa:bb&ips=192.168.1&partialMacs=right&partialIps=both
→ Query all devices
→ Filter: device.mac.startsWith("aa:bb") AND device.ip.includes("192.168.1")
→ Return devices matching both criteria
```

---

## ARP Scanning Flow

**Purpose:** Scan network interfaces to discover devices on the local network.

**Trigger:** Part of device discovery flow

**Flow Diagram:**
```
Get Active Network Interfaces
    ↓
For Each Interface (Parallel):
    ├─→ Execute arp-scan
    ├─→ Parse Output
    └─→ Return Results
    ↓
Aggregate Results
    ↓
Return ARP Table
```

**Steps:**

1. **Interface Detection**
   - Executes: `ip -o addr show | awk '{print $2}' | grep -Ev '^(docker|br-|veth|lo|dind|.orbmirror)' | sort -u`
   - Parses output to get interface names
   - Filters out Docker and virtual interfaces

2. **Parallel Scanning**
   - For each interface:
     - Executes: `arp-scan --interface={interface} --localnet`
     - Uses `Promise.allSettled` to handle failures

3. **Output Parsing**
   - Parses each line: `IP_ADDRESS    MAC_ADDRESS    VENDOR`
   - Uses regex: `/^(\d+\.\d+\.\d+\.\d+)\s+([\w:]+)\s+(.+)$/`
   - Creates `ArpScanResult` objects:
     ```typescript
     {
       ip: "192.168.1.100",
       mac: "aa:bb:cc:dd:ee:ff",
       type: "Vendor Name"
     }
     ```

4. **Error Handling**
   - Individual interface failures don't stop scanning
   - Errors logged, interface skipped
   - Results from successful interfaces aggregated

5. **Result Aggregation**
   - Flattens results from all interfaces
   - Returns single array of all discovered devices

**Error Scenarios:**
- **Permission denied**: Requires `NET_RAW` and `NET_ADMIN` capabilities
- **Interface not found**: Logged, interface skipped
- **No devices found**: Returns empty array, warning logged

---

## Device Validation Flow

**Purpose:** Validate discovered devices by checking for device-specific characteristics.

**Trigger:** Part of device discovery flow (for each device in ARP table)

**Flow Diagram:**
```
For Each Device in ARP Table:
    ↓
HTTP GET /api/system/info
    ├─→ Success: Check ASICModel
    │   ├─→ Found: Create Device, Store in DB
    │   └─→ Not Found: Skip Device
    └─→ Error: Skip Device
    ↓
Continue to Next Device
```

**Steps:**

1. **HTTP Request**
   - URL: `http://{device.ip}/api/system/info`
   - Method: GET
   - Timeout: 1 second
   - Uses Axios

2. **Response Handling**

   **Success:**
   - Checks response data for `ASICModel` field
   - If found:
     - Creates Device object:
       ```typescript
       {
         ip: device.ip,
         mac: device.mac,
         type: device.type,
         info: response.data
       }
       ```
     - Stores in LevelDB:
       - Collection: `pluto_discovery:devices:discovered`
       - Key: Device MAC address
       - Value: Device object
     - If device exists, updates instead of inserting

   **Error:**
   - Timeout: Logged, device skipped
   - Connection refused: Logged, device skipped
   - Other errors: Logged, device skipped

3. **Validation Criteria**
   - Device must respond to HTTP request
   - Response must contain `ASICModel` field
   - Only devices meeting criteria are stored

**Error Handling:**
- All errors are logged but don't stop discovery
- Device is simply skipped and discovery continues
- No retry logic (device can be rediscovered later)

**Performance:**
- Sequential validation (could be parallelized)
- 1 second timeout per device
- Typical: 1-2 seconds per device

---

## Mock Device Integration Flow

**Purpose:** Add mock devices from a mock discovery service for development and testing.

**Trigger:** Part of device discovery flow (if `DETECT_MOCK_DEVICES=true`)

**Flow Diagram:**
```
Discovery Flow
    ↓
Check DETECT_MOCK_DEVICES
    ├─→ false: Skip
    └─→ true: Continue
    ↓
HTTP GET to Mock Service
    ↓
Parse Server List
    ↓
Map to Mock Devices
    ↓
Add to ARP Table
    ↓
Continue Discovery
```

**Steps:**

1. **Configuration Check**
   - Checks `config.detectMockDevices` (from `DETECT_MOCK_DEVICES` env var)
   - If `false`, skips mock device integration

2. **Fetch Mock Servers**
   - HTTP GET to `${MOCK_DISCOVERY_HOST}/servers`
   - Expected response:
     ```json
     {
       "servers": [
         { "port": 8001 },
         { "port": 8002 },
         ...
       ]
     }
     ```

3. **Map to Mock Devices**
   - For each server:
     - Extracts port from server object
     - Creates mock device:
       ```typescript
       {
         ip: "{MOCK_DISCOVERY_HOST_IP}:{port}",
         mac: "ff:ff:ff:ff:ff:{index}",
         type: "unknown"
       }
       ```
     - MAC address format: `ff:ff:ff:ff:ff:XX` where XX is hex index

4. **Add to ARP Table**
   - Concatenates mock devices to ARP scan results
   - Mock devices go through same validation as real devices

5. **Validation**
   - Mock devices are validated like real devices
   - Must respond to HTTP request and have `ASICModel`

**Use Cases:**
- Development without physical devices
- Testing discovery logic
- Load testing with multiple devices

**Configuration:**
```bash
DETECT_MOCK_DEVICES=true
MOCK_DISCOVERY_HOST=http://localhost:5000
```

---

## Flow Interactions

### Complete Discovery Workflow

1. **Client Request** → `GET /discover`
2. **Network Scanning** → ARP scan all interfaces
3. **Mock Integration** → Add mock devices (if enabled)
4. **Device Validation** → Validate each device
5. **Storage** → Store valid devices in LevelDB
6. **Response** → Return discovered devices

### Lookup Workflow

1. **Client Request** → `GET /discovered?macs=...`
2. **Database Query** → Get all devices
3. **Filtering** → Apply matching logic
4. **Response** → Return filtered devices

### Integration with Backend

1. **Backend Request** → `GET /discover` (discovers devices)
2. **Backend Request** → `GET /discovered?macs=...` (gets device details)
3. **Backend Processing** → Imprints devices based on discovered devices

---

## Error Flows

### ARP Scan Failure

1. Interface scan fails
2. Error logged
3. Interface skipped
4. Other interfaces continue scanning
5. Discovery continues with available results

### Device Validation Failure

1. HTTP request fails or times out
2. Error logged
3. Device skipped
4. Discovery continues with next device
5. No retry (device can be rediscovered later)

### Database Error

1. Insert fails (device exists)
2. Automatically updates instead
3. If other error, logged and rethrown
4. Discovery may continue or fail depending on error

### Mock Service Failure

1. HTTP request to mock service fails
2. Error logged
3. Mock device integration skipped
4. Discovery continues with real devices only

---

## Performance Considerations

### Discovery Flow

- **ARP Scanning**: Parallel (fast, ~1-5 seconds)
- **Device Validation**: Sequential (slow, ~1-2 seconds per device)
- **Total Time**: 5-30 seconds depending on network size

### Optimization Opportunities

1. **Parallel Validation**: Change sequential to parallel using `Promise.all()`
2. **Timeout Reduction**: Reduce timeout from 1 second (may miss slow devices)
3. **Caching**: Cache validation results (devices may not change frequently)
4. **Batch Processing**: Process devices in batches

### Lookup Flow

- **Database Query**: Fast (< 100ms)
- **Filtering**: In-memory (very fast)
- **Total Time**: < 200ms typically

