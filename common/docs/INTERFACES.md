# @pluto/interfaces Documentation

## Overview

`@pluto/interfaces` provides shared TypeScript type definitions used across the Pluto project. It defines interfaces for devices, presets, dashboards, and related configuration options.

## Installation

```bash
npm install @pluto/interfaces
# or as local dependency:
npm install file:../common/interfaces
```

## Dependencies

None (dev dependencies only for TypeScript compilation)

## Core Interfaces

### Entity

Base interface for all entities with timestamp fields.

```typescript
interface Entity {
  createdAt?: string;  // ISO timestamp
  updatedAt?: string;  // ISO timestamp
}
```

**Usage:**
All main entities extend this interface to get automatic timestamp management.

---

### Device

Represents a Bitcoin mining device (Bitaxe miner).

```typescript
interface Device extends Entity {
  ip: string;                    // Device IP address
  mac: string;                   // Device MAC address
  type: string;                  // Device type (usually "unknown")
  presetUuid?: string | null;   // Associated preset UUID
  tracing?: boolean;             // Online/offline status
  info: DeviceInfo;              // Device information
  publicDashboardUrl?: string;  // Grafana dashboard URL
}
```

**Usage:**
```typescript
import { Device } from "@pluto/interfaces";

const device: Device = {
  ip: "192.168.1.100",
  mac: "aa:bb:cc:dd:ee:ff",
  type: "unknown",
  info: { ... },
  createdAt: "2024-01-15T10:30:45.123Z",
  updatedAt: "2024-01-15T10:30:45.123Z"
};
```

---

### DeviceInfo

Complete device information combining legacy and new API versions.

```typescript
interface DeviceInfo extends DeviceInfoLegacy, DeviceInfoNew {}
```

**DeviceInfoLegacy Fields:**
- `power: number` - Power consumption (watts)
- `voltage: number` - Voltage (millivolts)
- `current: number` - Current (milliamps)
- `fanSpeedRpm: number` - Fan speed (RPM)
- `temp: number` - Temperature (Celsius)
- `hashRate: number` - Hash rate (deprecated, use hashRate_10m)
- `bestDiff: string` - Best difficulty
- `bestSessionDiff: string` - Best session difficulty
- `freeHeap: number` - Free heap memory (bytes)
- `coreVoltage: number` - Core voltage (millivolts)
- `coreVoltageActual: number` - Actual core voltage (millivolts)
- `frequency: number` - Frequency (MHz)
- `ssid: string` - WiFi SSID
- `hostname: string` - Device hostname
- `wifiStatus: string` - WiFi connection status
- `sharesAccepted: number` - Accepted shares count
- `sharesRejected: number` - Rejected shares count
- `uptimeSeconds: number` - Uptime in seconds
- `ASICModel: string` - ASIC model (e.g., "BM1366", "BM1397")
- `stratumURL: string` - Mining pool URL
- `stratumPort: number` - Mining pool port
- `stratumUser: string` - Mining pool username
- `wifiPassword?: string` - WiFi password (optional)
- `stratumPassword?: string` - Mining pool password (optional)
- `version: string` - Firmware version
- `boardVersion: string` - Board version
- `runningPartition: string` - Running partition
- `flipscreen: number` - Screen flip setting
- `invertscreen: number` - Screen invert setting
- `invertfanpolarity: number` - Fan polarity setting
- `autofanspeed: number` - Auto fan speed setting
- `fanspeed: number` - Manual fan speed
- `efficiency: number` - Efficiency (J/TH)
- `frequencyOptions: DropdownOption[]` - Available frequency options
- `coreVoltageOptions: DropdownOption[]` - Available voltage options

**DeviceInfoNew Fields:**
- `maxPower: number` - Maximum power
- `minPower: number` - Minimum power
- `maxVoltage: number` - Maximum voltage
- `minVoltage: number` - Minimum voltage
- `vrTemp: number` - VR temperature
- `hashRateTimestamp: number` - Hash rate timestamp
- `hashRate_10m: number` - 10-minute hash rate average
- `hashRate_1h: number` - 1-hour hash rate average
- `hashRate_1d: number` - 1-day hash rate average
- `jobInterval: number` - Job interval
- `asicCount: number` - Number of ASICs
- `smallCoreCount: number` - Number of small cores
- `deviceModel: string` - Device model
- `overheat_temp: number` - Overheat temperature threshold
- `autoscreenoff: number` - Auto screen off setting
- `fanrpm: number` - Fan RPM
- `lastResetReason: string` - Last reset reason
- `history: { ... }` - Hash rate history

**Usage:**
```typescript
import { DeviceInfo } from "@pluto/interfaces";

const deviceInfo: DeviceInfo = {
  power: 150,
  voltage: 12000,
  current: 12500,
  temp: 65,
  hashRate_10m: 1000,
  ASICModel: "BM1366",
  hostname: "bitaxe-001",
  // ... other fields
};
```

---

### ExtendedDeviceInfo

Device info with tracing status.

```typescript
interface ExtendedDeviceInfo extends DeviceInfo {
  tracing?: boolean;  // Online/offline status
}
```

**Usage:**
Used for metrics aggregation where online/offline status is needed.

---

### Preset

Device configuration preset.

```typescript
interface Preset extends Entity {
  uuid: string;                    // Unique preset identifier
  name: string;                    // Preset name
  configuration: Record<string, any>; // Configuration object
  associatedDevices?: Device[];     // Devices using this preset
}
```

**Usage:**
```typescript
import { Preset } from "@pluto/interfaces";

const preset: Preset = {
  uuid: "preset-uuid-here",
  name: "My Mining Pool",
  configuration: {
    stratumURL: "stratum+tcp://pool.example.com",
    stratumPort: 3333,
    stratumPassword: "password"
  },
  createdAt: "2024-01-15T10:30:45.123Z",
  updatedAt: "2024-01-15T10:30:45.123Z"
};
```

---

### Dashboard

Grafana dashboard information.

```typescript
interface Dashboard {
  name: string;              // Dashboard name
  publicUrl: string;          // Public dashboard URL
  grafanaData: {
    createdAt: string;         // Creation timestamp
    updatedAt: string;        // Update timestamp
  };
}
```

---

### DropdownOption

Option for dropdown/select UI components.

```typescript
interface DropdownOption {
  label: string;  // Display label
  value: number;  // Option value
}
```

**Usage:**
Used for frequency and voltage options.

---

## Configuration Constants

### DeviceFrequencyOptions

Available frequency options per ASIC model.

```typescript
const DeviceFrequencyOptions: Record<string, DropdownOption[]> = {
  BM1397: [
    { label: "400", value: 400 },
    { label: "425 (default)", value: 425 },
    // ... more options
  ],
  BM1366: [ ... ],
  BM1368: [ ... ],
  BM1370: [ ... ]
};
```

**Usage:**
```typescript
import { DeviceFrequencyOptions } from "@pluto/interfaces";

const options = DeviceFrequencyOptions["BM1366"];
// Returns array of frequency options for BM1366
```

**Supported Models:**
- **BM1397**: 400-650 MHz (default: 425)
- **BM1366**: 400-575 MHz (default: 485)
- **BM1368**: 400-575 MHz (default: 490)
- **BM1370**: 400-625 MHz (default: 525)

---

### DeviceVoltageOptions

Available voltage options per ASIC model.

```typescript
const DeviceVoltageOptions: Record<string, DropdownOption[]> = {
  BM1370: [
    { label: "1000", value: 1000 },
    { label: "1060", value: 1060 },
    // ... more options
  ],
  BM1397: [ ... ],
  BM1366: [ ... ],
  BM1368: [ ... ]
};
```

**Usage:**
```typescript
import { DeviceVoltageOptions } from "@pluto/interfaces";

const options = DeviceVoltageOptions["BM1366"];
// Returns array of voltage options for BM1366
```

**Supported Models:**
- **BM1370**: 1000-1250 mV (default: 1150)
- **BM1397**: 1150-1500 mV
- **BM1366**: 1100-1300 mV (default: 1200)
- **BM1368**: 1100-1300 mV (default: 1166)

---

## Enums

### DeviceApiVersion

Device API version identifier.

```typescript
enum DeviceApiVersion {
  Legacy = "legacy",
  New = "new"
}
```

**Usage:**
Used to distinguish between legacy and new device API versions.

---

## Type Guards and Utilities

### DeviceInfoWithSecrets

Extended device info with secret fields.

```typescript
interface DeviceInfoWithSecrets extends Partial<DeviceInfo> {
  wifiPass?: string;
}
```

**Usage:**
Used internally for handling device info with sensitive data.

---

## Usage Examples

### Creating a Device
```typescript
import { Device, DeviceInfo } from "@pluto/interfaces";

const deviceInfo: DeviceInfo = {
  ASICModel: "BM1366",
  hostname: "bitaxe-001",
  power: 150,
  hashRate_10m: 1000,
  // ... other fields
};

const device: Device = {
  ip: "192.168.1.100",
  mac: "aa:bb:cc:dd:ee:ff",
  type: "unknown",
  info: deviceInfo
};
```

### Creating a Preset
```typescript
import { Preset } from "@pluto/interfaces";
import { v7 as uuid } from "uuid";

const preset: Preset = {
  uuid: uuid(),
  name: "Ocean Pool",
  configuration: {
    stratumURL: "stratum+tcp://mine.ocean.xyz",
    stratumPort: 3334,
    stratumPassword: "password"
  }
};
```

### Using Configuration Options
```typescript
import { DeviceFrequencyOptions, DeviceVoltageOptions } from "@pluto/interfaces";

// Get frequency options for device
const device = await getDevice();
const frequencyOptions = DeviceFrequencyOptions[device.info.ASICModel] || [];

// Get voltage options for device
const voltageOptions = DeviceVoltageOptions[device.info.ASICModel] || [];
```

### Type Checking
```typescript
import { Device, ExtendedDeviceInfo } from "@pluto/interfaces";

function isDeviceOnline(device: Device): boolean {
  return device.tracing === true;
}

function getOnlineDevices(devices: ExtendedDeviceInfo[]): ExtendedDeviceInfo[] {
  return devices.filter(d => d.tracing === true);
}
```

## Best Practices

1. **Always Import Types**: Use explicit imports for type safety
   ```typescript
   import { Device, DeviceInfo } from "@pluto/interfaces";
   ```

2. **Use Type Guards**: Check for required fields
   ```typescript
   if (device.info.ASICModel) {
     // Device is valid
   }
   ```

3. **Handle Optional Fields**: Use optional chaining
   ```typescript
   const presetUuid = device.presetUuid ?? null;
   ```

4. **Extend Entity**: When creating new entities, extend `Entity`
   ```typescript
   interface MyEntity extends Entity {
     // fields
   }
   ```

## Version Compatibility

### Device API Versions
- **Legacy**: Uses `hashRate` field
- **New**: Uses `hashRate_10m`, `hashRate_1h`, `hashRate_1d`

The `DeviceInfo` interface supports both versions by extending both interfaces.

