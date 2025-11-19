# @pluto/db Documentation

## Overview

`@pluto/db` is a database abstraction layer built on top of LevelDB. It provides a simple, type-safe interface for CRUD operations with automatic timestamp management and singleton database instances.

## Installation

```bash
npm install @pluto/db
# or as local dependency:
npm install file:../common/db
```

## Dependencies

- **level** (^8.0.1): LevelDB implementation for Node.js

## Architecture

### Singleton Pattern
- Each database name gets a single instance
- Instances are cached in memory
- Automatic cleanup on process exit

### Key Structure
- Format: `{prefix}:{key}`
- Example: `devices:discovered:aa:bb:cc:dd:ee:ff`
- Prefix represents a collection (e.g., `devices:discovered`)
- Key is the unique identifier (e.g., MAC address)

### List Management
- Each collection maintains a list of keys
- List stored at the prefix key itself
- Used for `findMany` operations

## API Reference

### `findOne<T>(dbName, prefix, key)`

Retrieves a single record from the database.

**Parameters:**
- `dbName: string` - Database name (e.g., "pluto_core", "pluto_discovery")
- `prefix: string` - Collection prefix (e.g., "devices:discovered")
- `key: string` - Unique identifier

**Returns:** `Promise<T | null>`

**Example:**
```typescript
import { findOne } from "@pluto/db";
import { Device } from "@pluto/interfaces";

const device = await findOne<Device>(
  "pluto_discovery",
  "devices:discovered",
  "aa:bb:cc:dd:ee:ff"
);
```

**Error Handling:**
- Returns `null` if record not found
- Throws error for other database errors

---

### `findMany<T>(dbName, fullListKey, filters?)`

Retrieves multiple records from a collection with optional filtering.

**Parameters:**
- `dbName: string` - Database name
- `fullListKey: string` - Collection prefix (e.g., "devices:discovered")
- `filters?: (record: T) => boolean` - Optional filter function

**Returns:** `Promise<T[]>`

**Example:**
```typescript
import { findMany } from "@pluto/db";
import { Device } from "@pluto/interfaces";

// Get all devices
const allDevices = await findMany<Device>(
  "pluto_core",
  "devices:imprinted"
);

// Get devices with filter
const onlineDevices = await findMany<Device>(
  "pluto_core",
  "devices:imprinted",
  (device) => device.tracing === true
);
```

**Features:**
- Returns empty array if collection doesn't exist
- Results sorted by `createdAt` (descending)
- Filter function applied to each record

---

### `insertOne<T>(dbName, fullListKey, objectKey, objectValue)`

Inserts a new record into the database.

**Parameters:**
- `dbName: string` - Database name
- `fullListKey: string` - Collection prefix
- `objectKey: string` - Unique identifier
- `objectValue: T` - Record data

**Returns:** `Promise<T>` (with timestamps added)

**Example:**
```typescript
import { insertOne } from "@pluto/db";
import { Device } from "@pluto/interfaces";

const device: Device = {
  mac: "aa:bb:cc:dd:ee:ff",
  ip: "192.168.1.100",
  type: "unknown",
  info: { ... }
};

const inserted = await insertOne<Device>(
  "pluto_discovery",
  "devices:discovered",
  device.mac,
  device
);
// inserted now has createdAt and updatedAt
```

**Features:**
- Automatically adds `createdAt` and `updatedAt` timestamps
- Throws error if record already exists
- Updates collection key list

**Error Handling:**
- Throws error if record with key already exists
- Use `updateOne` for updates

---

### `updateOne<T>(dbName, fullListKey, objectKey, objectValue)`

Updates an existing record or creates it if it doesn't exist.

**Parameters:**
- `dbName: string` - Database name
- `fullListKey: string` - Collection prefix
- `objectKey: string` - Unique identifier
- `objectValue: Partial<T>` - Partial record data

**Returns:** `Promise<T>` (merged with existing data)

**Example:**
```typescript
import { updateOne } from "@pluto/db";
import { Device } from "@pluto/interfaces";

const updated = await updateOne<Device>(
  "pluto_core",
  "devices:imprinted",
  "aa:bb:cc:dd:ee:ff",
  { tracing: true }
);
// Merges with existing device data
```

**Features:**
- Shallow merge with existing record
- Preserves `createdAt` from original record
- Updates `updatedAt` timestamp
- Creates record if it doesn't exist
- Updates collection key list

---

### `deleteOne<T>(dbName, fullListKey, objectKey)`

Deletes a record from the database.

**Parameters:**
- `dbName: string` - Database name
- `fullListKey: string` - Collection prefix
- `objectKey: string` - Unique identifier

**Returns:** `Promise<T | null>` (deleted record or null)

**Example:**
```typescript
import { deleteOne } from "@pluto/db";
import { Device } from "@pluto/interfaces";

const deleted = await deleteOne<Device>(
  "pluto_core",
  "devices:imprinted",
  "aa:bb:cc:dd:ee:ff"
);
```

**Features:**
- Removes record from database
- Removes key from collection list
- Returns deleted record or null if not found

---

## Base Entity Interface

All entities should extend `BaseEntity`:

```typescript
interface BaseEntity {
  createdAt?: string;  // ISO timestamp
  updatedAt?: string; // ISO timestamp
}
```

The database automatically manages these fields:
- `createdAt`: Set on insert, preserved on update
- `updatedAt`: Set on insert and update

## Database Storage

### Location
- Databases stored in: `./data/{dbName}/`
- Created automatically on first use

### Structure
```
data/
├── pluto_core/
│   └── (LevelDB files)
└── pluto_discovery/
    └── (LevelDB files)
```

### Value Encoding
- All values stored as JSON
- Automatic serialization/deserialization

## Internal Functions

### `getDatabase(dbName)`
- Gets or creates singleton database instance
- Opens database connection
- Registers exit handler for cleanup

### `closeAllDatabases()`
- Closes all database instances
- Called automatically on process exit

### `closeDatabase(dbName)`
- Closes specific database instance

### `buildKeyWithPrefix(prefix, key)`
- Constructs full key: `{prefix}:{key}`

## Error Handling

### Common Error Codes
- `LEVEL_NOT_FOUND`: Record or collection doesn't exist
  - `findOne`: Returns `null`
  - `findMany`: Returns empty array
  - `deleteOne`: Returns `null`

### Error Patterns
```typescript
try {
  const record = await findOne(...);
  if (!record) {
    // Record not found
  }
} catch (error) {
  if (error.code === "LEVEL_NOT_FOUND") {
    // Handle not found
  } else {
    // Handle other errors
  }
}
```

## Usage Patterns

### Pattern 1: Insert or Update
```typescript
try {
  await insertOne(dbName, prefix, key, value);
} catch (error) {
  if (error.message.includes("already exists")) {
    await updateOne(dbName, prefix, key, value);
  } else {
    throw error;
  }
}
```

### Pattern 2: Find or Create
```typescript
let record = await findOne(dbName, prefix, key);
if (!record) {
  record = await insertOne(dbName, prefix, key, defaultValue);
}
```

### Pattern 3: Filtered Query
```typescript
const filtered = await findMany<Device>(
  "pluto_core",
  "devices:imprinted",
  (device) => device.ip.startsWith("192.168.1")
);
```

## Performance Considerations

1. **Singleton Instances**: Database instances are reused
2. **Sequential Operations**: `findMany` processes records sequentially
3. **Key Lists**: Maintained in memory for fast lookups
4. **No Indexing**: LevelDB uses key-based lookups (fast for exact matches)

## Limitations

### Not Implemented (Stubs)
- `insertMany()`: Throws "not implemented" error
- `updateMany()`: Throws "not implemented" error
- `deleteMany()`: Throws "not implemented" error
- `countDocuments()`: Throws "not implemented" error
- `distinct()`: Throws "not implemented" error

### Design Limitations
- No transactions
- No complex queries (use filters for simple filtering)
- No indexing (relies on key structure)
- Sequential processing in `findMany`

## Best Practices

1. **Use TypeScript Types**: Always specify generic type `<T>`
2. **Handle Not Found**: Check for `null` returns
3. **Error Handling**: Catch and handle `LEVEL_NOT_FOUND` appropriately
4. **Key Design**: Use meaningful, unique keys (e.g., MAC addresses)
5. **Prefix Naming**: Use descriptive prefixes (e.g., `devices:discovered`)

## Examples

### Complete CRUD Example
```typescript
import { insertOne, findOne, updateOne, deleteOne } from "@pluto/db";
import { Device } from "@pluto/interfaces";

const dbName = "pluto_core";
const prefix = "devices:imprinted";
const mac = "aa:bb:cc:dd:ee:ff";

// Create
const device = await insertOne<Device>(dbName, prefix, mac, deviceData);

// Read
const found = await findOne<Device>(dbName, prefix, mac);

// Update
const updated = await updateOne<Device>(dbName, prefix, mac, { tracing: true });

// Delete
const deleted = await deleteOne<Device>(dbName, prefix, mac);
```

### Collection Management
```typescript
// Get all devices
const all = await findMany<Device>("pluto_core", "devices:imprinted");

// Get online devices
const online = await findMany<Device>(
  "pluto_core",
  "devices:imprinted",
  (d) => d.tracing === true
);

// Get devices by preset
const byPreset = await findMany<Device>(
  "pluto_core",
  "devices:imprinted",
  (d) => d.presetUuid === "preset-uuid"
);
```

