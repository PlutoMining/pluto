# Development Guide

This guide covers how to run, debug, and develop the Pluto Discovery Service.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Debugging](#debugging)
- [Testing](#testing)
- [Docker Development](#docker-development)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Node.js**: Version 24 or higher
- **npm**: Comes with Node.js
- **TypeScript**: Installed as dev dependency
- **arp-scan**: Network scanning tool (see installation below)
- **ip**: Network interface tool (usually pre-installed on Linux)
- **Git**: For version control

### Installing arp-scan

**Linux (Debian/Ubuntu):**
```bash
sudo apt-get update
sudo apt-get install arp-scan
```

**Linux (Alpine):**
```bash
apk add arp-scan libcap
```

**macOS:**
```bash
brew install arp-scan
```

**Note:** On Linux, you may need to run with elevated privileges or set capabilities:
```bash
sudo setcap cap_net_raw,cap_net_admin=eip /usr/bin/arp-scan
```

### Required Services

1. **Mock Discovery Service** (optional): For mock device detection
   - Configure via `MOCK_DISCOVERY_HOST` environment variable
   - Only needed if `DETECT_MOCK_DEVICES=true`

2. **LevelDB**: Managed automatically by `@pluto/db`
   - Database files stored in project directory

### Environment Setup

Create a `.env` file in the `discovery/` directory (or set environment variables):

```bash
PORT=4000
DETECT_MOCK_DEVICES=false
MOCK_DISCOVERY_HOST=http://localhost:5000
```

---

## Local Development

### Initial Setup

1. **Install Dependencies**

   ```bash
   cd discovery
   npm install
   ```

   This will also install dependencies from the `common/` packages:
   - `@pluto/db`
   - `@pluto/interfaces`
   - `@pluto/logger`

2. **Build Common Packages** (if needed)

   ```bash
   cd ../common/db && npm run build
   cd ../interfaces && npm run build
   cd ../logger && npm run build
   ```

3. **Set Network Capabilities** (Linux)

   ```bash
   sudo setcap cap_net_raw,cap_net_admin=eip /usr/bin/arp-scan
   ```

4. **Start Development Server**

   ```bash
   cd discovery
   npm run dev
   ```

   This starts the server with:
   - Hot reload via `nodemon`
   - TypeScript compilation via `ts-node`
   - Watches all `.ts` files in `src/`

### Development Scripts

- **`npm run dev`**: Start development server with hot reload
- **`npm run dev:debug`**: Start development server with Node.js inspector
- **`npm run build`**: Compile TypeScript to JavaScript
- **`npm start`**: Run compiled JavaScript (production mode)

### File Watching

The development server watches for changes in:
- `src/**/*.ts` - All TypeScript files

Changes trigger automatic restart of the server.

---

## Debugging

### Using Node.js Inspector

1. **Start Debug Server**

   ```bash
   npm run dev:debug
   ```

   This starts the server with:
   - Inspector on default port (usually 9229)
   - Hot reload enabled

2. **Connect Debugger**

   **VS Code:**
   - Create `.vscode/launch.json`:
     ```json
     {
       "version": "0.2.0",
       "configurations": [
         {
           "type": "node",
           "request": "attach",
           "name": "Attach to Discovery",
           "port": 9229,
           "restart": true,
           "protocol": "inspector"
         }
       ]
     }
     ```
   - Set breakpoints in TypeScript files
   - Press F5 or use Debug panel

   **Chrome DevTools:**
   - Open `chrome://inspect`
   - Click "Open dedicated DevTools for Node"
   - Set breakpoints in the Sources tab

   **Command Line:**
   ```bash
   node --inspect-brk -r ts-node/register src/index.ts
   ```

### Debugging Tips

1. **Logging**
   - Use `logger` from `@pluto/logger`:
     ```typescript
     import { logger } from "@pluto/logger";
     logger.info("Info message");
     logger.error("Error message", error);
     logger.debug("Debug message");
     ```

2. **Breakpoints**
   - Set breakpoints in TypeScript source files
   - VS Code will map them correctly with source maps

3. **Inspect Variables**
   - Use `console.log()` for quick debugging
   - Use debugger's variable inspection for detailed analysis

### Common Debug Scenarios

**ARP Scan Not Working:**
- Check `arp-scan` is installed: `which arp-scan`
- Check capabilities: `getcap /usr/bin/arp-scan`
- Try running manually: `sudo arp-scan --interface=eth0 --localnet`
- Check network interfaces: `ip addr show`

**No Devices Found:**
- Verify network interfaces are active
- Check ARP scan output in logs
- Verify devices are on the same network
- Check firewall settings

**Device Validation Failing:**
- Check device is accessible: `curl http://{device.ip}/api/system/info`
- Verify device has `ASICModel` field in response
- Check timeout settings (currently 1 second)

**Database Issues:**
- Check database file permissions
- Verify `@pluto/db` package is built
- Review database collection names

---

## Testing

Currently, there are no automated tests. Consider adding:

1. **Unit Tests** (Jest/Mocha)
   - Test service functions
   - Mock system command execution
   - Mock HTTP requests

2. **Integration Tests**
   - Test API endpoints
   - Test database operations
   - Test ARP scan wrapper

3. **E2E Tests**
   - Test full discovery flow
   - Test with mock devices

### Manual Testing

**Test Discovery:**
```bash
# Discover all devices
curl "http://localhost:4000/discover"

# Discover specific device
curl "http://localhost:4000/discover?ip=192.168.1.100"
```

**Test Lookup:**
```bash
# Find by MAC
curl "http://localhost:4000/discovered?macs=aa:bb:cc:dd:ee:ff"

# Find by IP
curl "http://localhost:4000/discovered?ips=192.168.1.100"

# Partial matching
curl "http://localhost:4000/discovered?macs=aa:bb&partialMacs=right"
```

**Test System Tools:**
```bash
# Test ARP scan
arp-scan --interface=eth0 --localnet

# Test interface detection
ip -o addr show | awk '{print $2}' | grep -Ev '^(docker|br-|veth|lo|dind|.orbmirror)' | sort -u
```

---

## Docker Development

### Development Dockerfile

The `Dockerfile.development` includes:
- ARP scan installation
- Network capabilities setup
- Development dependencies

### Running in Docker

1. **Build Image**

   ```bash
   docker build -f Dockerfile.development -t pluto-discovery-dev .
   ```

2. **Run Container**

   ```bash
   docker run -it --rm \
     -p 4000:4000 \
     --cap-add=NET_RAW \
     --cap-add=NET_ADMIN \
     -v $(pwd):/home/node/app \
     -e PORT=4000 \
     -e DETECT_MOCK_DEVICES=false \
     pluto-discovery-dev
   ```

   **Note:** `--cap-add=NET_RAW --cap-add=NET_ADMIN` are required for ARP scanning.

### Debugging in Docker

1. **Expose Debug Port**

   ```bash
   docker run -it --rm \
     -p 4000:4000 \
     -p 9229:9229 \
     --cap-add=NET_RAW \
     --cap-add=NET_ADMIN \
     -v $(pwd):/home/node/app \
     pluto-discovery-dev
   ```

2. **Connect Debugger**

   - Use `localhost:9229` to connect
   - Follow VS Code or Chrome DevTools setup above

---

## Common Tasks

### Adding a New Endpoint

1. **Create Controller Function**

   ```typescript
   // src/controllers/discover.controller.ts
   import { Request, Response } from "express";
   import { logger } from "@pluto/logger";
   
   export const myHandler = async (req: Request, res: Response) => {
     try {
       // Handler logic
       res.status(200).json({ data: {} });
     } catch (error) {
       logger.error("Error:", error);
       res.status(500).json({ error: "Failed" });
     }
   };
   ```

2. **Create Route**

   ```typescript
   // src/routes/discover.routes.ts
   import { Router } from "express";
   import { myHandler } from "../controllers/discover.controller";
   
   const router = Router();
   router.get("/my-endpoint", myHandler);
   export default router;
   ```

3. **Register Route** (already done in `index.ts`)

### Adding a New Service Function

1. **Create Service Function**

   ```typescript
   // src/services/discovery.service.ts
   import { logger } from "@pluto/logger";
   
   export const myServiceFunction = async () => {
     try {
       // Service logic
       return result;
     } catch (error) {
       logger.error("Error:", error);
       throw error;
     }
   };
   ```

2. **Use in Controller**

   ```typescript
   import * as discoveryService from "../services/discovery.service";
   
   export const myHandler = async (req: Request, res: Response) => {
     const data = await discoveryService.myServiceFunction();
     res.json(data);
   };
   ```

### Modifying Discovery Logic

The main discovery logic is in `discovery.service.ts`:

- **Change Timeout**: Modify timeout in `axios.get()` calls (currently 1000ms)
- **Change Validation**: Modify `ASICModel` check
- **Add Filters**: Add filtering logic in `discoverDevices()`
- **Parallel Validation**: Change sequential validation to parallel using `Promise.all()`

### Adding New Matching Options

1. **Modify `matchWithPartial` in `lookupMultipleDiscoveredDevices()`**

   ```typescript
   const matchWithPartial = (value, list, matchType) => {
     if (matchType === "custom") {
       // Add custom matching logic
       return list.some(item => /* custom logic */);
     }
     // ... existing logic
   };
   ```

2. **Update Type Definitions**

   ```typescript
   partialMatch?: {
     macs?: "left" | "right" | "both" | "none" | "custom";
     // ...
   };
   ```

---

## Troubleshooting

### Server Won't Start

**Issue:** Port already in use
- **Solution:** Change `PORT` environment variable or kill process using port 4000

**Issue:** Missing dependencies
- **Solution:** Run `npm install` in `discovery/` and all `common/` packages

**Issue:** TypeScript compilation errors
- **Solution:** Check `tsconfig.json` and fix type errors

### ARP Scan Not Working

**Issue:** Permission denied
- **Solution:** 
  - Run with sudo: `sudo npm run dev`
  - Or set capabilities: `sudo setcap cap_net_raw,cap_net_admin=eip /usr/bin/arp-scan`

**Issue:** arp-scan not found
- **Solution:** Install arp-scan (see Prerequisites)

**Issue:** No interfaces found
- **Solution:** 
  - Check network interfaces: `ip addr show`
  - Verify interfaces are active and have IP addresses
  - Check Docker interface filtering

### No Devices Discovered

**Issue:** Devices not on network
- **Solution:** Verify devices are on the same network segment

**Issue:** Devices not responding
- **Solution:** 
  - Check device is accessible: `curl http://{device.ip}/api/system/info`
  - Verify device has `/api/system/info` endpoint
  - Check firewall settings

**Issue:** Devices don't have ASICModel
- **Solution:** Verify device response includes `ASICModel` field

### Database Issues

**Issue:** LevelDB errors
- **Solution:**
  - Check database file permissions
  - Verify `@pluto/db` package is built
  - Review database collection names

**Issue:** Devices not found in lookup
- **Solution:**
  - Verify devices were discovered first (check database)
  - Check matching logic (partial match settings)
  - Review MAC address format

### Performance Issues

**Issue:** Discovery too slow
- **Solution:**
  - Use specific IP for single device discovery
  - Parallelize device validation (currently sequential)
  - Reduce timeout (currently 1 second)

**Issue:** High CPU usage
- **Solution:**
  - Limit number of network interfaces scanned
  - Optimize ARP scan command
  - Add rate limiting

---

## Best Practices

1. **Error Handling**
   - Always wrap async operations in try-catch
   - Log errors with context
   - Return appropriate HTTP status codes

2. **Logging**
   - Use appropriate log levels (info, error, debug)
   - Include context in log messages
   - Log network operations for debugging

3. **Type Safety**
   - Use TypeScript types from `@pluto/interfaces`
   - Avoid `any` types
   - Validate input data

4. **Code Organization**
   - Keep controllers thin (delegate to services)
   - Keep services focused (single responsibility)
   - Use wrappers for system tool interactions

5. **Testing**
   - Test service functions in isolation
   - Mock system command execution
   - Mock HTTP requests

6. **Documentation**
   - Document complex logic
   - Add JSDoc comments for public functions
   - Update this guide when adding features

---

## Next Steps

- Review [Architecture Documentation](./ARCHITECTURE.md) for system design
- Check [Services Documentation](./SERVICES.md) for service details
- Read [API Reference](./API.md) for endpoint documentation
- Understand the [Flows](./FLOWS.md) for process documentation

