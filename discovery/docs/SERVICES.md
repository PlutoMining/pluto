# Services Documentation

This document provides detailed documentation for all services in the Pluto Discovery Service.

## Table of Contents

- [Discovery Service](#discovery-service)
- [ARP Scan Wrapper](#arp-scan-wrapper)

---

## Discovery Service

**File:** `src/services/discovery.service.ts`

### Purpose
Main service responsible for discovering devices on the network, validating them, and storing them in the database.

### Key Functions

#### `discoverDevices(options?)`
Discovers devices on the network using ARP scanning and validates them.

**Parameters:**
- `options.ip?: string` - Optional IP address to discover (bypasses ARP scan if provided without partialMatch)
- `options.mac?: string` - Optional MAC address filter
- `options.partialMatch?: boolean` - Enable partial IP matching (default: false)

**Returns:** `Promise<Device[]>`

**Flow:**

1. **Direct IP Bypass** (if `ip` provided and `partialMatch=false`):
   - Skips ARP scanning
   - Directly attempts HTTP GET to `http://{ip}/api/system/info`
   - If `ASICModel` found, creates device and stores in DB
   - Returns single device or empty array

2. **Network Interface Detection**:
   - Calls `getActiveNetworkInterfaces()` to get active interfaces
   - Filters out Docker-related interfaces

3. **ARP Scanning** (parallel):
   - For each interface, runs `arpScan(interface)`
   - Uses `Promise.allSettled` to handle failures gracefully
   - Aggregates results from all interfaces

4. **Mock Device Integration** (if `DETECT_MOCK_DEVICES=true`):
   - Fetches mock servers from `MOCK_DISCOVERY_HOST/servers`
   - Maps servers to mock devices with fake MAC addresses
   - Adds to ARP table

5. **IP Filtering** (if `ip` provided with `partialMatch=true`):
   - Filters ARP table to devices matching IP pattern

6. **Device Validation** (sequential):
   - For each device in ARP table:
     - HTTP GET to `http://{device.ip}/api/system/info` (1 second timeout)
     - Checks response for `ASICModel` field
     - If valid, creates Device object and stores in LevelDB
     - If exists, updates instead of inserting

7. **Return**: Array of valid devices

**Error Handling:**
- ARP scan errors: Logged, interface skipped
- HTTP timeouts: Logged, device skipped
- HTTP errors: Logged, device skipped
- Database errors: Logged, rethrown

**Database Operations:**
- Collection: `pluto_discovery:devices:discovered`
- Key: Device MAC address
- Value: Device object

#### `lookupDiscoveredDevice(mac)`
Looks up a single device by MAC address.

**Parameters:**
- `mac: string` - MAC address

**Returns:** `Promise<Device | undefined>`

**Flow:**
1. Queries LevelDB for device with matching MAC
2. Returns device if found, undefined otherwise

**Database Operation:**
- `findOne<Device>("pluto_discovery", "devices:discovered", mac)`

#### `lookupMultipleDiscoveredDevices(options)`
Looks up multiple devices with flexible matching options.

**Parameters:**
- `options.macs?: string[]` - Array of MAC addresses
- `options.ips?: string[]` - Array of IP addresses
- `options.hostnames?: string[]` - Array of hostnames
- `options.partialMatch?: object` - Partial matching configuration:
  - `macs: "left" | "right" | "both" | "none"` (default: "both")
  - `ips: "left" | "right" | "both" | "none"` (default: "both")
  - `hostnames: "left" | "right" | "both" | "none"` (default: "both")

**Returns:** `Promise<Device[]>`

**Flow:**

1. **Query Database**:
   - Gets all devices from `pluto_discovery:devices:discovered`
   - Uses filter function for matching

2. **Matching Logic** (for each device):
   - **MAC Matching**: If `macs` provided, matches device MAC against list
   - **IP Matching**: If `ips` provided, matches device IP against list
   - **Hostname Matching**: If `hostnames` provided, matches device hostname against list
   - Uses `matchWithPartial` helper for flexible matching

3. **Partial Matching Helper**:
   - `"none"`: Exact match (`value === item`)
   - `"left"`: Suffix match (`value.endsWith(item)`)
   - `"right"`: Prefix match (`value.startsWith(item)`)
   - `"both"`: Substring match (`value.includes(item)`)

4. **Return**: Filtered array of matching devices

**Example:**
```typescript
// Find devices with MAC starting with "aa:bb"
lookupMultipleDiscoveredDevices({
  macs: ["aa:bb"],
  partialMatch: { macs: "right" }
})

// Find devices with IP containing "192.168"
lookupMultipleDiscoveredDevices({
  ips: ["192.168"],
  partialMatch: { ips: "both" }
})
```

---

## ARP Scan Wrapper

**File:** `src/services/arpScanWrapper.ts`

### Purpose
Wraps system tools (`arp-scan` and `ip`) for network scanning and interface detection.

### Key Functions

#### `arpScan(networkInterface)`
Performs an ARP scan on a specific network interface.

**Parameters:**
- `networkInterface: string` - Network interface name (e.g., "eth0", "wlan0")

**Returns:** `Promise<ArpScanResult[]>`

**Flow:**
1. Executes command: `arp-scan --interface={interface} --localnet`
2. Parses output using `parseArpScanOutput()`
3. Returns array of `ArpScanResult` objects

**Output Format:**
```
192.168.1.100    aa:bb:cc:dd:ee:ff    Vendor Name
192.168.1.101    11:22:33:44:55:66    Another Vendor
```

**Parsed Result:**
```typescript
[
  { ip: "192.168.1.100", mac: "aa:bb:cc:dd:ee:ff", type: "Vendor Name" },
  { ip: "192.168.1.101", mac: "11:22:33:44:55:66", type: "Another Vendor" }
]
```

**Error Handling:**
- Command execution errors: Thrown as Error
- stderr output: Logged and thrown

#### `getActiveNetworkInterfaces()`
Retrieves active network interfaces that have IP addresses assigned.

**Returns:** `Promise<string[]>`

**Flow:**
1. Executes command: `ip -o addr show | awk '{print $2}' | grep -Ev '^(docker|br-|veth|lo|dind|.orbmirror)' | sort -u`
2. Parses output using `parseNetworkInterfacesOutput()`
3. Returns array of interface names

**Filtered Interfaces:**
- Excludes: `docker`, `br-*`, `veth*`, `lo`, `dind`, `.orbmirror*`
- Includes: Only active interfaces with IP addresses

**Example Output:**
```typescript
["eth0", "wlan0", "enp0s3"]
```

**Error Handling:**
- Command execution errors: Thrown as Error
- stderr output: Logged and thrown

### Helper Functions

#### `parseArpScanOutput(output)`
Parses raw ARP scan output into structured results.

**Parameters:**
- `output: string` - Raw output from `arp-scan` command

**Returns:** `ArpScanResult[]`

**Parsing Logic:**
- Splits output by newlines
- Uses regex: `/^(\d+\.\d+\.\d+\.\d+)\s+([\w:]+)\s+(.+)$/`
- Extracts: IP address, MAC address, vendor/type
- Skips lines that don't match

#### `parseNetworkInterfacesOutput(output)`
Parses network interface list from `ip` command output.

**Parameters:**
- `output: string` - Raw output from `ip` command

**Returns:** `string[]`

**Parsing Logic:**
- Splits output by newlines
- Filters out empty lines
- Returns array of interface names

### Interfaces

#### `ArpScanResult`
```typescript
interface ArpScanResult {
  ip: string;      // IP address
  mac: string;     // MAC address
  type: string;    // Vendor/device type
}
```

## Service Interactions

### Discovery Flow

1. **Client Request** → Controller
2. **Controller** → `discovery.service.discoverDevices()`
3. **Discovery Service** → `arpScanWrapper.getActiveNetworkInterfaces()`
4. **Discovery Service** → `arpScanWrapper.arpScan()` (for each interface)
5. **Discovery Service** → HTTP validation (for each device)
6. **Discovery Service** → LevelDB storage
7. **Discovery Service** → Return devices

### Lookup Flow

1. **Client Request** → Controller
2. **Controller** → `discovery.service.lookupMultipleDiscoveredDevices()`
3. **Discovery Service** → LevelDB query with filters
4. **Discovery Service** → Apply matching logic
5. **Discovery Service** → Return filtered devices

## Error Handling Patterns

### ARP Scan Errors
- Individual interface failures don't stop discovery
- Uses `Promise.allSettled` to handle failures gracefully
- Errors logged, interface skipped

### Device Validation Errors
- HTTP timeouts: Device skipped, discovery continues
- HTTP errors: Device skipped, discovery continues
- Only devices with `ASICModel` are considered valid

### Database Errors
- Insert errors: If device exists, updates instead
- Other errors: Logged and rethrown

## Performance Considerations

1. **Parallel Scanning**: ARP scans run in parallel across interfaces
2. **Sequential Validation**: Device validation is sequential (could be parallelized)
3. **Timeout**: 1-second timeout per device prevents hanging
4. **Database**: Fast lookups by MAC address (primary key)

## Dependencies

### System Tools
- **arp-scan**: Must be installed and have network capabilities
- **ip**: Standard Linux tool for interface detection

### Node.js
- **child_process**: For executing system commands
- **util.promisify**: For async/await with exec

### Internal
- `@pluto/db`: Database operations
- `@pluto/interfaces`: Type definitions
- `@pluto/logger`: Logging

