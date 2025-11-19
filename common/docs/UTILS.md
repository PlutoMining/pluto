# @pluto/utils Documentation

## Overview

`@pluto/utils` provides reusable utility functions for common operations including array manipulation, promise handling, string processing, and validation.

## Installation

```bash
npm install @pluto/utils
# or as local dependency:
npm install file:../common/utils
```

## Dependencies

None (dev dependencies only for TypeScript compilation)

## Modules

### Arrays

#### `asyncForEach<T>(array, callback)`

Asynchronously iterates over an array, awaiting each callback before proceeding to the next item.

**Parameters:**
- `array: T[]` - Array to iterate over
- `callback: (item: T, index: number, items: T[]) => Promise<void>` - Async callback function

**Returns:** `Promise<void>`

**Usage:**
```typescript
import { asyncForEach } from "@pluto/utils";

const devices = [device1, device2, device3];

await asyncForEach(devices, async (device, index) => {
  await processDevice(device);
  console.log(`Processed device ${index + 1}`);
});
```

**Features:**
- Sequential execution (waits for each item)
- Provides index and full array to callback
- Useful for operations that must complete in order

**Example:**
```typescript
// Process devices sequentially
await asyncForEach(devices, async (device) => {
  await updateDevice(device);
  await createDashboard(device);
});
```

**Note:** For parallel execution, use `Promise.all()`:
```typescript
await Promise.all(devices.map(device => processDevice(device)));
```

---

### Promises

#### `delay(ms)`

Creates a promise that resolves after a specified number of milliseconds.

**Parameters:**
- `ms: number` - Milliseconds to delay

**Returns:** `Promise<unknown>`

**Usage:**
```typescript
import { delay } from "@pluto/utils";

// Wait 1 second
await delay(1000);

// Wait 2.5 seconds
await delay(2500);
```

**Example:**
```typescript
// Retry with delay
async function retryWithDelay(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i < maxRetries - 1) {
        await delay(1000 * (i + 1)); // Exponential backoff
      } else {
        throw error;
      }
    }
  }
}
```

**Use Cases:**
- Rate limiting
- Retry logic with delays
- Polling intervals
- Testing async behavior

---

### Strings

#### `sanitizeHostname(hostname)`

Sanitizes a hostname by replacing invalid characters with double underscores.

**Parameters:**
- `hostname: string` - Hostname to sanitize

**Returns:** `string` - Sanitized hostname

**Usage:**
```typescript
import { sanitizeHostname } from "@pluto/utils";

const sanitized = sanitizeHostname("bitaxe-001");
// Returns: "bitaxe-001"

const sanitized2 = sanitizeHostname("bitaxe.001");
// Returns: "bitaxe__001"

const sanitized3 = sanitizeHostname("bitaxe 001");
// Returns: "bitaxe__001"
```

**Rules:**
- Allows: letters (a-z, A-Z), numbers (0-9), underscores (_), hyphens (-)
- Replaces: all other characters with `__` (double underscore)

**Use Cases:**
- File names (Grafana dashboard files)
- Template variable names
- Safe identifier generation

**Example:**
```typescript
// Create dashboard file name
const hostname = "bitaxe-001.local";
const sanitized = sanitizeHostname(hostname);
const fileName = `${sanitized}.json`;
// Result: "bitaxe-001__local.json"
```

---

### Validators

#### `isValidIp(ip)`

Validates an IPv4 address.

**Parameters:**
- `ip: string` - IP address to validate

**Returns:** `boolean`

**Usage:**
```typescript
import { isValidIp } from "@pluto/utils";

isValidIp("192.168.1.100");  // true
isValidIp("256.1.1.1");      // false
isValidIp("192.168.1");      // false
isValidIp("invalid");        // false
```

**Validation Rules:**
- Must be valid IPv4 format
- Each octet: 0-255
- Format: `xxx.xxx.xxx.xxx`

---

#### `isValidMac(mac)`

Validates a MAC address.

**Parameters:**
- `mac: string` - MAC address to validate

**Returns:** `boolean`

**Usage:**
```typescript
import { isValidMac } from "@pluto/utils";

isValidMac("aa:bb:cc:dd:ee:ff");  // true
isValidMac("AA:BB:CC:DD:EE:FF");  // true
isValidMac("aa-bb-cc-dd-ee-ff");  // true
isValidMac("aa:bb:cc:dd:ee");     // false
isValidMac("invalid");            // false
```

**Validation Rules:**
- Format: `XX:XX:XX:XX:XX:XX` or `XX-XX-XX-XX-XX-XX`
- Hexadecimal characters (0-9, A-F, a-f)
- Case insensitive

---

#### `validateBitcoinAddress(address)`

Validates a Bitcoin address.

**Parameters:**
- `address: string` - Bitcoin address to validate

**Returns:** `boolean`

**Usage:**
```typescript
import { validateBitcoinAddress } from "@pluto/utils";

// Legacy addresses (P2PKH)
validateBitcoinAddress("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa");  // true

// SegWit addresses (P2SH)
validateBitcoinAddress("3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy");  // true

// Bech32 addresses
validateBitcoinAddress("bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4");  // true

// Invalid
validateBitcoinAddress("invalid");  // false
```

**Supported Formats:**
- **P2PKH**: Starts with `1` (legacy)
- **P2SH**: Starts with `3` (SegWit)
- **Bech32**: Starts with `bc1` (native SegWit)

---

#### `validateTCPPort(port)`

Validates a TCP port number.

**Parameters:**
- `port: number` - Port number to validate

**Returns:** `boolean`

**Usage:**
```typescript
import { validateTCPPort } from "@pluto/utils";

validateTCPPort(3000);   // true
validateTCPPort(8080);   // true
validateTCPPort(65535);  // true
validateTCPPort(0);      // true
validateTCPPort(65536);  // false
validateTCPPort(-1);     // false
validateTCPPort(3.14);   // false
```

**Validation Rules:**
- Must be integer
- Range: 0-65535

---

#### `validateDomain(domain, options?)`

Validates a domain name with optional configuration.

**Parameters:**
- `domain: string` - Domain to validate
- `options?: ValidationOptions` - Optional configuration:
  - `allowUnderscore?: boolean` - Allow underscores (default: false)
  - `requireFQDN?: boolean` - Require fully qualified domain name (default: false)
  - `allowIP?: boolean` - Allow IP addresses (default: true)

**Returns:** `boolean`

**Usage:**
```typescript
import { validateDomain } from "@pluto/utils";

// Basic validation
validateDomain("example.com");           // true
validateDomain("sub.example.com");       // true
validateDomain("invalid..com");          // false

// With options
validateDomain("example.com", { 
  requireFQDN: true 
});  // true

validateDomain("example", { 
  requireFQDN: true 
});  // false

// Allow IP addresses
validateDomain("192.168.1.100");         // true
validateDomain("192.168.1.100", { 
  allowIP: false 
});  // false

// Allow underscores
validateDomain("example_com", { 
  allowUnderscore: true 
});  // true
```

**Validation Rules:**
- Domain length: 1-253 characters
- Label length: 1-63 characters
- Labels cannot start or end with hyphen
- If `requireFQDN`: Must contain at least one dot
- If `allowIP`: Also validates IPv4 and IPv6 addresses
- If `allowUnderscore`: Allows underscores in labels

**Supported Formats:**
- Domain names: `example.com`, `sub.example.com`
- IPv4: `192.168.1.100`
- IPv6: `2001:0db8:85a3:0000:0000:8a2e:0370:7334`

---

## Usage Examples

### Sequential Array Processing
```typescript
import { asyncForEach } from "@pluto/utils";

// Process devices one at a time
await asyncForEach(devices, async (device) => {
  await updateDevice(device);
  await createDashboard(device);
  await startMonitoring(device);
});
```

### Retry Logic with Delay
```typescript
import { delay } from "@pluto/utils";

async function fetchWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetch(url);
    } catch (error) {
      if (i < maxRetries - 1) {
        await delay(1000 * (i + 1)); // Exponential backoff
      } else {
        throw error;
      }
    }
  }
}
```

### Hostname Sanitization
```typescript
import { sanitizeHostname } from "@pluto/utils";

// Create safe file names
const hostname = device.info.hostname;
const safeName = sanitizeHostname(hostname);
const dashboardPath = `./dashboards/${safeName}.json`;
```

### Input Validation
```typescript
import { isValidIp, isValidMac, validateDomain } from "@pluto/utils";

function validateDeviceInput(ip: string, mac: string, hostname: string) {
  if (!isValidIp(ip)) {
    throw new Error("Invalid IP address");
  }
  
  if (!isValidMac(mac)) {
    throw new Error("Invalid MAC address");
  }
  
  if (!validateDomain(hostname, { allowIP: false })) {
    throw new Error("Invalid hostname");
  }
}
```

### Combined Usage
```typescript
import { asyncForEach, delay, sanitizeHostname, isValidIp } from "@pluto/utils";

async function processDevices(devices) {
  await asyncForEach(devices, async (device) => {
    // Validate
    if (!isValidIp(device.ip)) {
      console.error(`Invalid IP: ${device.ip}`);
      return;
    }
    
    // Sanitize hostname
    const safeName = sanitizeHostname(device.info.hostname);
    
    // Process with delay
    await processDevice(device);
    await delay(100); // Rate limiting
  });
}
```

## Best Practices

1. **Use `asyncForEach` for Sequential Operations**
   - When order matters
   - When operations depend on previous results
   - When rate limiting is needed

2. **Use `Promise.all()` for Parallel Operations**
   - When order doesn't matter
   - For better performance
   - When operations are independent

3. **Validate Early**
   - Validate inputs at API boundaries
   - Use validators before processing
   - Provide clear error messages

4. **Sanitize for File System**
   - Always sanitize hostnames used in file paths
   - Prevents path traversal issues
   - Ensures cross-platform compatibility

5. **Use Delays Appropriately**
   - For rate limiting
   - For retry logic
   - For polling intervals
   - Avoid unnecessary delays in hot paths

## Performance Considerations

- **`asyncForEach`**: Sequential, slower but safer for dependent operations
- **`Promise.all()`**: Parallel, faster but all operations run simultaneously
- **Validators**: Regex-based, very fast
- **`sanitizeHostname`**: Simple string replacement, very fast
- **`delay`**: Non-blocking, uses `setTimeout`

## Error Handling

Most utilities don't throw errors, but return boolean values or sanitized strings:

```typescript
// Validators return boolean
if (!isValidIp(ip)) {
  // Handle invalid IP
}

// Sanitize always returns a string
const safe = sanitizeHostname(hostname); // Never throws

// asyncForEach and delay are async, handle with try/catch
try {
  await asyncForEach(items, async (item) => {
    await process(item);
  });
} catch (error) {
  // Handle error
}
```

