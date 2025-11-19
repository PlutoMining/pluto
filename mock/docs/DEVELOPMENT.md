# Development Guide

This guide covers how to run, debug, and develop the Pluto Mock Service.

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
- **Git**: For version control

### Environment Setup

Create a `.env` file in the `mock/` directory (or set environment variables):

```bash
LISTING_PORT=5000
PORTS=8001,8002,8003,8004,8005
LOGS_PUB_ENABLED=true
```

---

## Local Development

### Initial Setup

1. **Install Dependencies**

   ```bash
   cd mock
   npm install
   ```

   This will also install dependencies from the `common/` packages:
   - `@pluto/logger`
   - `@pluto/interfaces`

2. **Build Common Packages** (if needed)

   ```bash
   cd ../common/logger && npm run build
   cd ../interfaces && npm run build
   ```

3. **Start Development Server**

   ```bash
   cd mock
   npm run dev
   ```

   This starts the server with:
   - Hot reload via `nodemon`
   - TypeScript compilation via `ts-node`
   - Watches all `.ts` files in `src/`

### Development Scripts

- **`npm run dev`**: Start development server with hot reload
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

   Add to `package.json`:
   ```json
   {
     "scripts": {
       "dev:debug": "node --inspect-brk -r ts-node/register src/index.ts"
     }
   }
   ```

   Then run:
   ```bash
   npm run dev:debug
   ```

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
           "name": "Attach to Mock",
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

### Debugging Tips

1. **Logging**
   - Use `logger` from `@pluto/logger`:
     ```typescript
     import { logger } from "@pluto/logger";
     logger.info("Info message");
     logger.error("Error message", error);
     logger.debug("Debug message");
     ```

2. **Worker Thread Debugging**
   - Debug main process normally
   - Worker threads run in separate contexts
   - Use `logger` for worker debugging

3. **Breakpoints**
   - Set breakpoints in TypeScript source files
   - VS Code will map them correctly with source maps

### Common Debug Scenarios

**Worker Not Starting:**
- Check port is available
- Verify environment variables are set
- Check worker thread creation in logs

**Device Not Responding:**
- Verify worker started successfully
- Check port is correct
- Test with curl: `curl http://localhost:8001/api/system/info`

**WebSocket Not Working:**
- Check `LOGS_PUB_ENABLED=true`
- Verify WebSocket server created
- Test connection: `wscat -c ws://localhost:8001/api/ws`

---

## Testing

Currently, there are no automated tests. Consider adding:

1. **Unit Tests** (Jest/Mocha)
   - Test data generation functions
   - Test firmware distribution
   - Mock worker thread creation

2. **Integration Tests**
   - Test API endpoints
   - Test WebSocket connections
   - Test restart simulation

3. **E2E Tests**
   - Test full device lifecycle
   - Test discovery service integration

### Manual Testing

**Test Device Info:**
```bash
# Get device info
curl http://localhost:8001/api/system/info

# Update device config
curl -X PATCH http://localhost:8001/api/system \
  -H "Content-Type: application/json" \
  -d '{"power": 20, "frequency": 550}'

# Get updated info
curl http://localhost:8001/api/system/info
```

**Test Restart:**
```bash
# Initiate restart
curl -X POST http://localhost:8001/api/system/restart

# Try to access during restart (should return 503)
curl http://localhost:8001/api/system/info

# Wait 5 seconds, then try again (should work)
curl http://localhost:8001/api/system/info
```

**Test Listing Server:**
```bash
curl http://localhost:5000/servers
```

**Test WebSocket:**
```bash
# Using wscat (install: npm install -g wscat)
wscat -c ws://localhost:8001/api/ws
```

---

## Docker Development

### Development Dockerfile

The `Dockerfile.development` is minimal and expects:
- Dependencies pre-installed
- Source code mounted as volume
- Environment variables set

### Running in Docker

1. **Build Image**

   ```bash
   docker build -f Dockerfile.development -t pluto-mock-dev .
   ```

2. **Run Container**

   ```bash
   docker run -it --rm \
     -p 5000:5000 \
     -p 8001-8005:8001-8005 \
     -v $(pwd):/home/node/app \
     -e LISTING_PORT=5000 \
     -e PORTS=8001,8002,8003,8004,8005 \
     -e LOGS_PUB_ENABLED=true \
     pluto-mock-dev
   ```

   **Note:** Port mapping `8001-8005:8001-8005` maps all ports in the range.

### Debugging in Docker

1. **Expose Debug Port**

   ```bash
   docker run -it --rm \
     -p 5000:5000 \
     -p 8001-8005:8001-8005 \
     -p 9229:9229 \
     -v $(pwd):/home/node/app \
     pluto-mock-dev
   ```

2. **Connect Debugger**

   - Use `localhost:9229` to connect
   - Follow VS Code or Chrome DevTools setup above

---

## Common Tasks

### Adding a New Endpoint

1. **Create Controller Function**

   ```typescript
   // src/controllers/system.controller.ts
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
   // src/routes/system.routes.ts
   import { Router } from "express";
   import { myHandler } from "../controllers/system.controller";
   
   const router = Router();
   router.get("/api/my-endpoint", myHandler);
   export default router;
   ```

3. **Route is Already Registered** (in `mockWorker.ts`)

### Adding New Data Fields

1. **Update Interface** (in `@pluto/interfaces`)

2. **Update Generation Functions**

   ```typescript
   // In mock.service.ts
   export const generateSystemInfo = (hostname, uptimeSeconds, systemInfo = {}) => {
     const defaultSystemInfo = {
       // ... existing fields
       newField: getRandomInt(min, max),
     };
     return { ...defaultSystemInfo, ...systemInfo };
   };
   ```

### Modifying Firmware Distribution

1. **Update Percentages**

   ```typescript
   // In mock.service.ts
   const firmwareVersionsWithPercentages = [
     { version: "v2.3.0", percentage: 0.10 }, // Add new version
     // ... existing versions
   ];
   ```

2. **Rebuild and Restart**

   - Distribution happens at startup
   - Changes require service restart

### Adding New Log Messages

1. **Update Log Array**

   ```typescript
   // In mock.service.ts
   export const generateFakeLog = (): string => {
     const logs = [
       // ... existing logs
       "New log message",
     ];
     // ...
   };
   ```

---

## Troubleshooting

### Server Won't Start

**Issue:** Port already in use
- **Solution:** Change `PORTS` environment variable or kill processes using ports

**Issue:** Missing dependencies
- **Solution:** Run `npm install` in `mock/` and all `common/` packages

**Issue:** TypeScript compilation errors
- **Solution:** Check `tsconfig.json` and fix type errors

### Workers Not Starting

**Issue:** Worker creation fails
- **Solution:** 
  - Check `mockWorker.js` exists in `dist/` after build
  - Verify worker thread support
  - Check logs for worker errors

**Issue:** Port conflicts
- **Solution:** 
  - Verify ports are available
  - Check port range doesn't conflict
  - Use different port range

### Device Not Responding

**Issue:** Worker not running
- **Solution:**
  - Check worker started successfully
  - Verify port is correct
  - Check worker logs

**Issue:** Restart state stuck
- **Solution:**
  - Restart service
  - Check `isRestarting` flag in middleware

### WebSocket Issues

**Issue:** WebSocket not connecting
- **Solution:**
  - Verify `LOGS_PUB_ENABLED=true`
  - Check WebSocket server created
  - Test connection manually

**Issue:** No logs received
- **Solution:**
  - Check broadcast loop is running
  - Verify WebSocket connection is open
  - Check logs for errors

### Listing Server Issues

**Issue:** No servers listed
- **Solution:**
  - Verify workers started successfully
  - Check `activeServers` array in main process
  - Verify listing server port is correct

---

## Best Practices

1. **Error Handling**
   - Always wrap async operations in try-catch
   - Log errors with context
   - Return appropriate HTTP status codes

2. **Logging**
   - Use appropriate log levels (info, error, debug)
   - Include context in log messages
   - Log worker creation and errors

3. **Type Safety**
   - Use TypeScript types from `@pluto/interfaces`
   - Avoid `any` types
   - Validate input data

4. **Worker Management**
   - Handle worker errors gracefully
   - Monitor worker health
   - Clean up workers on shutdown

5. **Configuration**
   - Use environment variables for configuration
   - Validate configuration on startup
   - Provide sensible defaults

6. **Testing**
   - Test data generation functions
   - Test API endpoints
   - Test WebSocket connections
   - Test restart simulation

---

## Next Steps

- Review [Architecture Documentation](./ARCHITECTURE.md) for system design
- Check [Services Documentation](./SERVICES.md) for service details
- Read [API Reference](./API.md) for endpoint documentation
- Understand the [Flows](./FLOWS.md) for process documentation

