# Pluto Common Packages Documentation

## Overview

The `common/` directory contains shared packages used across the Pluto project. These packages provide core functionality for database operations, logging, type definitions, and utility functions.

## Table of Contents

- [Package Overview](#package-overview)
- [@pluto/db](./DB.md) - Database abstraction layer
- [@pluto/logger](./LOGGER.md) - Logging utilities
- [@pluto/interfaces](./INTERFACES.md) - TypeScript type definitions
- [@pluto/utils](./UTILS.md) - Utility functions

## Package Overview

### @pluto/db
**Purpose:** Database abstraction layer using LevelDB  
**Dependencies:** `level` (^8.0.1)  
**Key Features:**
- Singleton database instances
- CRUD operations (findOne, findMany, insertOne, updateOne, deleteOne)
- Automatic timestamp management (createdAt, updatedAt)
- Prefix-based key management
- Automatic database cleanup on process exit

### @pluto/logger
**Purpose:** Centralized logging using Winston  
**Dependencies:** `winston` (^3.14.2)  
**Key Features:**
- Console and file logging
- Custom logger creation per device/service
- Structured JSON logging for objects
- Automatic log directory creation

### @pluto/interfaces
**Purpose:** Shared TypeScript type definitions  
**Dependencies:** None (dev dependencies only)  
**Key Features:**
- Device interfaces (Device, DeviceInfo, ExtendedDeviceInfo)
- Preset interfaces
- Dashboard interfaces
- Entity base interface
- Device configuration options (frequency, voltage)

### @pluto/utils
**Purpose:** Reusable utility functions  
**Dependencies:** None (dev dependencies only)  
**Key Features:**
- Array utilities (asyncForEach)
- Promise utilities (delay)
- String utilities (sanitizeHostname)
- Validation utilities (IP, MAC, domain, Bitcoin address, TCP port)

## Usage Across Services

### Backend Service
- Uses all common packages
- `@pluto/db`: Stores devices, presets
- `@pluto/logger`: Application logging
- `@pluto/interfaces`: Type definitions
- `@pluto/utils`: String sanitization, delays, validations

### Discovery Service
- Uses: `@pluto/db`, `@pluto/logger`, `@pluto/interfaces`
- `@pluto/db`: Stores discovered devices
- `@pluto/logger`: Discovery logging
- `@pluto/interfaces`: Device type definitions

## Installation

Each package is installed as a local file dependency:

```json
{
  "dependencies": {
    "@pluto/db": "file:../common/db",
    "@pluto/logger": "file:../common/logger",
    "@pluto/interfaces": "file:../common/interfaces",
    "@pluto/utils": "file:../common/utils"
  }
}
```

## Building

Each package has a build script:

```bash
cd common/db && npm run build
cd ../logger && npm run build
cd ../interfaces && npm run build
cd ../utils && npm run build
```

Or build all at once:

```bash
cd common
for dir in */; do
  cd "$dir" && npm run build && cd ..
done
```

## Development

### Adding a New Package

1. Create directory: `common/my-package/`
2. Initialize package:
   ```bash
   cd common/my-package
   npm init
   ```
3. Add TypeScript configuration
4. Create source files
5. Export from `index.ts`
6. Build: `npm run build`

### Modifying Existing Packages

1. Make changes to source files
2. Build: `npm run build`
3. Services using the package will pick up changes after rebuild

## Version Management

All packages are currently at version `1.0.0`. Consider semantic versioning when making breaking changes.

## Next Steps

- Read detailed documentation for each package:
  - [Database Package](./DB.md)
  - [Logger Package](./LOGGER.md)
  - [Interfaces Package](./INTERFACES.md)
  - [Utils Package](./UTILS.md)

