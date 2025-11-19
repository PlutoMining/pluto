# Development Guide

This guide covers how to run, debug, and develop the Pluto Backend.

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

### Required Services

1. **Discovery Service**: Must be running and accessible
   - Configure via `DISCOVERY_SERVICE_HOST` environment variable
   - Default: `http://localhost:4000`

2. **Grafana**: Must be running and accessible
   - Configure via `GF_HOST` environment variable
   - Default: `http://localhost:3001`
   - Must have web authentication configured (uses `X-WEBAUTH-USER: admin`)

3. **LevelDB**: Managed automatically by `@pluto/db`
   - Database files stored in project directory

### Environment Setup

Create a `.env` file in the `backend/` directory (or set environment variables):

```bash
PORT=3000
AUTO_LISTEN=true
DISCOVERY_SERVICE_HOST=http://localhost:4000
GF_HOST=http://localhost:3001
DELETE_DATA_ON_DEVICE_REMOVE=false
```

---

## Local Development

### Initial Setup

1. **Install Dependencies**

   ```bash
   cd backend
   npm install
   ```

   This will also install dependencies from the `common/` packages:
   - `@pluto/db`
   - `@pluto/interfaces`
   - `@pluto/logger`
   - `@pluto/utils`

2. **Build Common Packages** (if needed)

   ```bash
   cd ../common/db && npm run build
   cd ../interfaces && npm run build
   cd ../logger && npm run build
   cd ../utils && npm run build
   ```

3. **Start Development Server**

   ```bash
   cd backend
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
   - Inspector on `0.0.0.0:9229`
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
           "name": "Attach to Backend",
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

2. **Custom Loggers**
   - Create device-specific loggers:
     ```typescript
     import { createCustomLogger } from "@pluto/logger";
     const deviceLogger = createCustomLogger("device-hostname");
     deviceLogger.info("Device-specific log");
     ```

3. **Breakpoints**
   - Set breakpoints in TypeScript source files
   - VS Code will map them correctly with source maps

4. **Inspect Variables**
   - Use `console.log()` for quick debugging
   - Use debugger's variable inspection for detailed analysis

### Common Debug Scenarios

**Device Not Polling:**
- Check `ipMap` in `tracing.service.ts`
- Verify device IP is correct
- Check network connectivity
- Review logs for connection errors

**Metrics Not Updating:**
- Verify Prometheus metrics are created: `createMetricsForDevice()`
- Check if device polling is successful
- Inspect `updatePrometheusMetrics()` calls

**Grafana Dashboard Not Created:**
- Check Grafana connectivity
- Verify `GF_HOST` environment variable
- Review Grafana API responses in logs
- Check dashboard template files exist

---

## Testing

Currently, there are no automated tests. Consider adding:

1. **Unit Tests** (Jest/Mocha)
   - Test service functions
   - Mock external dependencies

2. **Integration Tests**
   - Test API endpoints
   - Test database operations

3. **E2E Tests**
   - Test full device lifecycle
   - Test Socket.IO events

### Manual Testing

**Test Device Discovery:**
```bash
curl "http://localhost:3000/devices/discover?ip=192.168.1.100"
```

**Test Device Imprinting:**
```bash
curl -X PUT http://localhost:3000/devices/imprint \
  -H "Content-Type: application/json" \
  -d '{"macs": ["aa:bb:cc:dd:ee:ff"]}'
```

**Test Metrics:**
```bash
curl http://localhost:3000/metrics
```

**Test Socket.IO:**
- Connect to `ws://localhost:3000/socket/io`
- Send events: `enableLogsListening`, `disableLogsListening`
- Listen for events: `stat_update`, `logs_update`

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
   docker build -f Dockerfile.development -t pluto-backend-dev .
   ```

2. **Run Container**

   ```bash
   docker run -it --rm \
     -p 3000:3000 \
     -v $(pwd):/home/node/app \
     -e PORT=3000 \
     -e AUTO_LISTEN=true \
     -e DISCOVERY_SERVICE_HOST=http://host.docker.internal:4000 \
     -e GF_HOST=http://host.docker.internal:3001 \
     pluto-backend-dev
   ```

   **Note:** Use `host.docker.internal` to access services on the host machine.

### Debugging in Docker

1. **Expose Debug Port**

   ```bash
   docker run -it --rm \
     -p 3000:3000 \
     -p 9229:9229 \
     -v $(pwd):/home/node/app \
     -e PORT=3000 \
     pluto-backend-dev
   ```

2. **Connect Debugger**

   - Use `localhost:9229` instead of `0.0.0.0:9229`
   - Follow VS Code or Chrome DevTools setup above

---

## Common Tasks

### Adding a New Endpoint

1. **Create Controller Function**

   ```typescript
   // src/controllers/my.controller.ts
   import { Request, Response } from "express";
   
   export const myHandler = async (req: Request, res: Response) => {
     try {
       // Handler logic
       res.status(200).json({ message: "Success", data: {} });
     } catch (error) {
       logger.error("Error:", error);
       res.status(500).json({ error: "Failed" });
     }
   };
   ```

2. **Create Route**

   ```typescript
   // src/routes/my.routes.ts
   import { Router } from "express";
   import { myHandler } from "../controllers/my.controller";
   
   const router = Router();
   router.get("/my-endpoint", myHandler);
   export default router;
   ```

3. **Register Route**

   ```typescript
   // src/index.ts
   import myRoutes from "./routes/my.routes";
   app.use(myRoutes);
   ```

### Adding a New Service

1. **Create Service File**

   ```typescript
   // src/services/my.service.ts
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
   import * as myService from "../services/my.service";
   
   export const myHandler = async (req: Request, res: Response) => {
     const data = await myService.myServiceFunction();
     res.json({ data });
   };
   ```

### Modifying Device Monitoring

The device monitoring logic is in `tracing.service.ts`:

- **Change Polling Interval**: Modify the `remainingTime` calculation in `pollSystemInfo()`
- **Change Reconnection Logic**: Modify `attemptReconnect()` function
- **Add New Events**: Emit Socket.IO events in `pollSystemInfo()` or WebSocket handlers

### Adding New Metrics

1. **Create Metric in `metrics.service.ts`**

   ```typescript
   const myMetricGauge = new client.Gauge({
     name: `${prefix}my_metric`,
     help: "Description",
     registers: [globalRegister],
   });
   ```

2. **Update in `updatePrometheusMetrics()`**

   ```typescript
   if (data.myMetric) myMetricGauge.set(data.myMetric);
   ```

---

## Troubleshooting

### Server Won't Start

**Issue:** Port already in use
- **Solution:** Change `PORT` environment variable or kill process using port 3000

**Issue:** Missing dependencies
- **Solution:** Run `npm install` in `backend/` and all `common/` packages

**Issue:** TypeScript compilation errors
- **Solution:** Check `tsconfig.json` and fix type errors

### Devices Not Discovered

**Issue:** Discovery service not running
- **Solution:** Start discovery service and verify `DISCOVERY_SERVICE_HOST`

**Issue:** Network connectivity
- **Solution:** Check firewall, network configuration, and service accessibility

### Metrics Not Exposed

**Issue:** Prometheus registry not exported
- **Solution:** Verify `/metrics` route is registered and `register` is exported from `metrics.service.ts`

### Grafana Integration Issues

**Issue:** Dashboard not created
- **Solution:** 
  - Verify `GF_HOST` is correct
  - Check Grafana is accessible
  - Review logs for API errors
  - Verify template files exist

**Issue:** Authentication errors
- **Solution:** Ensure Grafana is configured with web authentication and `X-WEBAUTH-USER` header is accepted

### WebSocket Issues

**Issue:** Devices not connecting
- **Solution:**
  - Verify device IP is correct
  - Check device WebSocket endpoint is accessible
  - Review reconnection logic and logs

**Issue:** Socket.IO not working
- **Solution:**
  - Verify Socket.IO server is initialized (`/socket/io` endpoint called)
  - Check client is connecting to correct path
  - Review Socket.IO configuration in `startIoHandler()`

### Database Issues

**Issue:** LevelDB errors
- **Solution:**
  - Check database file permissions
  - Verify `@pluto/db` package is built
  - Review database collection names

### Performance Issues

**Issue:** High CPU usage
- **Solution:**
  - Reduce polling frequency
  - Limit number of monitored devices
  - Optimize metric updates

**Issue:** Memory leaks
- **Solution:**
  - Check `ipMap` cleanup when devices removed
  - Verify WebSocket connections are closed
  - Review timeout cleanup

---

## Best Practices

1. **Error Handling**
   - Always wrap async operations in try-catch
   - Log errors with context
   - Return appropriate HTTP status codes

2. **Logging**
   - Use appropriate log levels (info, error, debug)
   - Include context in log messages
   - Use custom loggers for device-specific logs

3. **Type Safety**
   - Use TypeScript types from `@pluto/interfaces`
   - Avoid `any` types
   - Validate input data

4. **Code Organization**
   - Keep controllers thin (delegate to services)
   - Keep services focused (single responsibility)
   - Use middleware for cross-cutting concerns

5. **Testing**
   - Test service functions in isolation
   - Mock external dependencies
   - Test error cases

6. **Documentation**
   - Document complex logic
   - Add JSDoc comments for public functions
   - Update this guide when adding features

---

## Next Steps

- Review [Architecture Documentation](./ARCHITECTURE.md) for system design
- Check [Services Documentation](./SERVICES.md) for service details
- Read [API Reference](./API.md) for endpoint documentation

