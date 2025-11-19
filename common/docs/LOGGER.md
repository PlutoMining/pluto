# @pluto/logger Documentation

## Overview

`@pluto/logger` provides centralized logging functionality using Winston. It supports both console and file logging, with the ability to create custom loggers for specific services or devices.

## Installation

```bash
npm install @pluto/logger
# or as local dependency:
npm install file:../common/logger
```

## Dependencies

- **winston** (^3.14.2): Logging library for Node.js

## Features

- Console logging (stdout)
- File logging (to `logs/` directory)
- Custom loggers per device/service
- Automatic JSON formatting for objects
- Timestamp formatting
- Log level: `debug` (configurable)

## API Reference

### `logger`

Default logger instance for general application logging.

**Usage:**
```typescript
import { logger } from "@pluto/logger";

logger.info("Application started");
logger.error("Error occurred", error);
logger.debug("Debug information");
logger.warn("Warning message");
```

**Log Levels:**
- `debug`: Detailed debugging information
- `info`: General informational messages
- `warn`: Warning messages
- `error`: Error messages

**Output:**
- **Console**: All logs to stdout
- **File**: All logs to `logs/combined.log`

**Format:**
```
2024-01-15T10:30:45.123Z [INFO]: Application started
2024-01-15T10:30:46.456Z [ERROR]: Error occurred
```

---

### `createCustomLogger(fileName)`

Creates a custom logger that writes to a specific file.

**Parameters:**
- `fileName: string` - Name of the log file (without extension)

**Returns:** `winston.Logger` instance

**Usage:**
```typescript
import { createCustomLogger } from "@pluto/logger";

const deviceLogger = createCustomLogger("bitaxe-001");
deviceLogger.info("Device log message");
```

**Output:**
- **File**: Logs to `logs/{fileName}.log`
- **Console**: Not logged to console (file only)

**Example:**
```typescript
// In tracing service
const logsLogger = createCustomLogger(device.info.hostname);
logsLogger.info(messageString);
// Creates: logs/bitaxe-001.log
```

## Log Directory

- **Location**: `./logs/`
- **Created Automatically**: On first logger usage
- **Files**:
  - `combined.log`: All application logs
  - `{hostname}.log`: Device-specific logs (one per device)

## Log Format

### Standard Format
```
{timestamp} [{LEVEL}]: {message}
```

### Object Formatting
If message is an object, it's automatically formatted as JSON:

```typescript
logger.info({ device: "bitaxe-001", status: "online" });
// Output: 2024-01-15T10:30:45.123Z [INFO]: {
//   "device": "bitaxe-001",
//   "status": "online"
// }
```

## Usage Examples

### Basic Logging
```typescript
import { logger } from "@pluto/logger";

// Info log
logger.info("Server started on port 3000");

// Error log with error object
try {
  // some operation
} catch (error) {
  logger.error("Operation failed", error);
}

// Debug log
logger.debug("Processing request", { requestId: "123" });
```

### Device-Specific Logging
```typescript
import { createCustomLogger } from "@pluto/logger";

// Create logger for specific device
const deviceLogger = createCustomLogger("bitaxe-001");

// Log device events
deviceLogger.info("Device connected");
deviceLogger.info("Hash rate: 1000 GH/s");
deviceLogger.error("Connection lost");
```

### Service-Specific Logging
```typescript
import { createCustomLogger } from "@pluto/logger";

// Create logger for discovery service
const discoveryLogger = createCustomLogger("discovery");

discoveryLogger.info("Starting device discovery");
discoveryLogger.info(`Found ${devices.length} devices`);
```

## Integration with Services

### Backend Service
```typescript
// General application logs
import { logger } from "@pluto/logger";
logger.info("Backend service started");

// Device-specific logs (in tracing service)
import { createCustomLogger } from "@pluto/logger";
const deviceLogger = createCustomLogger(device.hostname);
deviceLogger.info(deviceLogMessage);
```

### Discovery Service
```typescript
import { logger } from "@pluto/logger";

logger.info("Starting device discovery");
logger.error("Discovery failed", error);
logger.debug("ARP scan results", results);
```

## Configuration

### Log Level
Currently hardcoded to `"debug"`. To change:

```typescript
// In logger.ts
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info", // Change default
  // ...
});
```

### Log Format
Custom format can be modified in `logger.ts`:

```typescript
format: winston.format.combine(
  winston.format.timestamp(),
  winston.format.printf(({ timestamp, level, message }) => {
    // Custom format logic
  })
)
```

## Best Practices

1. **Use Appropriate Levels**:
   - `debug`: Detailed debugging
   - `info`: General information
   - `warn`: Warnings that don't stop execution
   - `error`: Errors that need attention

2. **Include Context**:
   ```typescript
   logger.error("Device connection failed", { 
     deviceIp: "192.168.1.100",
     error: error.message 
   });
   ```

3. **Device-Specific Logs**:
   - Use `createCustomLogger` for device logs
   - Helps separate device logs from application logs

4. **Error Logging**:
   ```typescript
   try {
     // operation
   } catch (error) {
     logger.error("Operation failed", error);
     // Include full error object for stack traces
   }
   ```

## Log File Management

### File Rotation
Currently, Winston doesn't configure log rotation. Consider:
- Using `winston-daily-rotate-file` for automatic rotation
- Manual cleanup scripts
- Log aggregation services

### Log Retention
No automatic cleanup. Consider:
- Implementing retention policies
- Archiving old logs
- Using log aggregation (e.g., ELK stack)

## Troubleshooting

### Logs Not Appearing
1. Check `logs/` directory exists and is writable
2. Verify logger is imported correctly
3. Check log level (debug logs may not appear if level is higher)

### Too Many Log Files
- Device-specific loggers create one file per device
- Consider cleanup strategy for removed devices
- Use combined.log for general application logs

### Performance
- File I/O is asynchronous (non-blocking)
- Consider log level in production (use "info" or "warn")
- Monitor disk space usage

## Advanced Usage

### Custom Transport
```typescript
import winston from "winston";
import { logger } from "@pluto/logger";

// Add custom transport
logger.add(new winston.transports.Http({
  host: "localhost",
  port: 5000
}));
```

### Log Filtering
```typescript
// Filter by level
logger.level = "info"; // Only info and above

// Custom filter
logger.add(new winston.transports.Console({
  format: winston.format((info) => {
    if (info.level === "debug") return false;
    return info;
  })()
}));
```

