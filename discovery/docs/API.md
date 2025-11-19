# API Reference

Complete documentation of all API endpoints in the Pluto Discovery Service.

## Base URL

All endpoints are relative to the server base URL (default: `http://localhost:4000`).

## Authentication

Currently, the API does not require authentication. Consider adding authentication middleware for production use.

## Response Format

All responses are JSON. Error responses follow this format:

```json
{
  "error": "Error message"
}
```

Success responses return arrays of devices:

```json
[
  {
    "mac": "aa:bb:cc:dd:ee:ff",
    "ip": "192.168.1.100",
    "type": "unknown",
    "info": {
      "ASICModel": "BM1366",
      "hostname": "bitaxe-001",
      ...
    }
  }
]
```

## Endpoints

### GET /discover

Discovers devices on the network using ARP scanning.

**Query Parameters:**
- `ip` (optional): Specific IP address to discover. If provided without partial matching, bypasses ARP scan and directly connects to the device.
- `mac` (optional): Filter by MAC address (not currently used in filtering, but passed to service)

**Response:**
```json
[
  {
    "mac": "aa:bb:cc:dd:ee:ff",
    "ip": "192.168.1.100",
    "type": "unknown",
    "info": {
      "ASICModel": "BM1366",
      "hostname": "bitaxe-001",
      "version": "1.0.0",
      "power": 150,
      "hashRate": 1000,
      ...
    }
  }
]
```

**Status Codes:**
- `200`: Success (may return empty array if no devices found)
- `500`: Server error

**Flow:**
1. If `ip` provided without partial matching:
   - Directly connects to device
   - Validates by checking for `ASICModel`
   - Returns single device or empty array
2. Otherwise:
   - Scans all active network interfaces
   - Validates each discovered device
   - Returns array of valid devices

**Example:**
```bash
# Discover all devices
curl "http://localhost:4000/discover"

# Discover specific device (fast path)
curl "http://localhost:4000/discover?ip=192.168.1.100"

# Discover with MAC filter (not used in filtering, but passed through)
curl "http://localhost:4000/discover?mac=aa:bb:cc:dd:ee:ff"
```

**Notes:**
- Discovery may take several seconds depending on network size
- Only devices with `ASICModel` in their `/api/system/info` response are returned
- Devices are automatically stored in LevelDB

---

### GET /discovered

Looks up previously discovered devices from the database with flexible matching.

**Query Parameters:**
- `macs` (optional): Comma-separated list of MAC addresses
- `ips` (optional): Comma-separated list of IP addresses
- `hostnames` (optional): Comma-separated list of hostnames
- `partialMacs` (optional): Partial matching for MAC addresses
  - `"left"` - Match from the end (suffix)
  - `"right"` - Match from the start (prefix)
  - `"both"` - Match anywhere (substring, default)
  - `"none"` - Exact match only
- `partialIps` (optional): Partial matching for IP addresses (same options as `partialMacs`)
- `partialHostnames` (optional): Partial matching for hostnames (same options as `partialMacs`)

**Response:**
```json
[
  {
    "mac": "aa:bb:cc:dd:ee:ff",
    "ip": "192.168.1.100",
    "type": "unknown",
    "info": {
      "ASICModel": "BM1366",
      "hostname": "bitaxe-001",
      ...
    }
  }
]
```

**Status Codes:**
- `200`: Success (may return empty array if no devices match)
- `500`: Server error

**Matching Logic:**
- If multiple filters provided (macs, ips, hostnames), device must match ALL filters
- Partial matching applies to each filter independently
- Default partial matching is `"both"` (substring match)

**Examples:**

```bash
# Find devices by exact MAC address
curl "http://localhost:4000/discovered?macs=aa:bb:cc:dd:ee:ff&partialMacs=none"

# Find devices with MAC starting with "aa:bb"
curl "http://localhost:4000/discovered?macs=aa:bb&partialMacs=right"

# Find devices with IP containing "192.168"
curl "http://localhost:4000/discovered?ips=192.168&partialIps=both"

# Find devices by hostname
curl "http://localhost:4000/discovered?hostnames=bitaxe-001"

# Find devices matching multiple criteria
curl "http://localhost:4000/discovered?macs=aa:bb&ips=192.168.1"

# Find devices with MAC ending in ":ff"
curl "http://localhost:4000/discovered?macs=:ff&partialMacs=left"
```

**Partial Matching Examples:**

| Value | Match Type | Matches | Doesn't Match |
|-------|-----------|---------|---------------|
| `"aa:bb"` | `"none"` | `"aa:bb"` | `"aa:bb:cc"`, `"cc:aa:bb"` |
| `"aa:bb"` | `"left"` | `"cc:aa:bb"`, `"aa:bb"` | `"aa:bb:cc"` |
| `"aa:bb"` | `"right"` | `"aa:bb:cc"`, `"aa:bb"` | `"cc:aa:bb"` |
| `"aa:bb"` | `"both"` | `"aa:bb"`, `"cc:aa:bb"`, `"aa:bb:cc"` | `"cc:dd"` |

**Notes:**
- This endpoint queries the database, not the network
- Devices must have been previously discovered via `/discover`
- Fast lookup (no network scanning)

---

## Error Handling

All endpoints return appropriate HTTP status codes:

- `200 OK`: Success (may return empty array)
- `500 Internal Server Error`: Server error

Error responses include an `error` field with a descriptive message:

```json
{
  "error": "Failed to discover devices"
}
```

## Common Error Scenarios

### Network Scanning Errors
- **ARP scan fails**: Individual interface errors are logged, other interfaces continue scanning
- **No interfaces found**: Returns empty array with warning log
- **Permission denied**: Requires `NET_RAW` and `NET_ADMIN` capabilities

### Device Validation Errors
- **Timeout**: Device doesn't respond within 1 second, skipped
- **Connection refused**: Device not accessible, skipped
- **No ASICModel**: Device doesn't have required field, skipped

### Database Errors
- **Insert error**: If device exists, automatically updates instead
- **Query error**: Logged and returned as 500 error

## Rate Limiting

Currently, there is no rate limiting. Consider adding rate limiting middleware for production use, especially for the `/discover` endpoint which performs network scanning.

## Security Notes

1. **No Authentication**: The API currently does not require authentication. Consider adding authentication for production use.

2. **Network Capabilities**: ARP scanning requires elevated network privileges:
   - In Docker: `--cap-add=NET_RAW --cap-add=NET_ADMIN`
   - On host: `setcap cap_net_raw,cap_net_admin=eip /usr/bin/arp-scan`

3. **Input Validation**: Currently relies on TypeScript types. Consider adding validation middleware (e.g., express-validator) for production use.

4. **Network Exposure**: The service scans the local network. Ensure proper network isolation in production.

## Performance Considerations

### Discovery Endpoint (`/discover`)
- **Time Complexity**: O(n) where n is number of devices on network
- **Typical Duration**: 5-30 seconds depending on network size
- **Bottlenecks**:
  - ARP scanning (parallel across interfaces)
  - Device validation (sequential, 1 second timeout each)

### Lookup Endpoint (`/discovered`)
- **Time Complexity**: O(n) where n is number of stored devices
- **Typical Duration**: < 100ms
- **Bottlenecks**: Database query (LevelDB is fast)

## Best Practices

1. **Use `/discover` sparingly**: Performs network scanning, can be slow
2. **Use `/discovered` for lookups**: Fast database queries
3. **Use specific IP for single device**: Faster than full network scan
4. **Cache results**: Devices are stored in database, no need to rediscover frequently

## Integration with Backend

The backend service typically:
1. Calls `/discover` to find new devices
2. Calls `/discovered` with MAC addresses to get device details
3. Imprints devices based on discovered devices

Example backend flow:
```bash
# 1. Discover devices
curl "http://discovery:4000/discover"

# 2. Get specific devices by MAC
curl "http://discovery:4000/discovered?macs=aa:bb:cc:dd:ee:ff,11:22:33:44:55:66"

# 3. Backend imprints devices
curl -X PUT "http://backend:3000/devices/imprint" \
  -H "Content-Type: application/json" \
  -d '{"macs": ["aa:bb:cc:dd:ee:ff"]}'
```

