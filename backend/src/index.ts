/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { logger } from "@pluto/logger";
import express from "express";
import http from "http";
import { config } from "./config/environment";
import metricsRoutes from "./routes/metrics.routes";
import devicesRoutes from "./routes/devices.routes";
import presetsRoutes from "./routes/presets.routes";
import socketRoutes from "./routes/socket.routes";
import prometheusRoutes from "./routes/prometheus.routes";
import { listenToDevices } from "./services/device.service";
import { removeSecretsMiddleware } from "./middleware/remove-secrets.middleware";

export function createBackendServer() {
  const app = express();
  const server = http.createServer(app);

  app.use(express.json());
  app.use(removeSecretsMiddleware);

  // Store server reference on app for reuse in controllers
  app.set("server", server);

  // Register routes
  app.use(metricsRoutes);
  app.use(prometheusRoutes);
  app.use(devicesRoutes);
  app.use(presetsRoutes);
  app.use(socketRoutes);

  return { app, server };
}

export async function startServer(opts?: { port?: number; autoListen?: boolean }) {
  const { port = config.port, autoListen = config.autoListen } = opts ?? {};
  const { server } = createBackendServer();

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, async () => {
      try {
        if (autoListen) {
          await listenToDevices();
        }
        resolve();
      } catch (err) {
        server.close(() => {
          reject(err);
        });
      }
    });
  });

  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  logger.info(`Server running on http://localhost:${actualPort}`);

  return { server, port: actualPort };
}

/**
 * Top-level entry point: starts the server and handles fatal errors.
 */
export async function main(): Promise<{ server: http.Server; port: number } | undefined> {
  try {
    return await startServer();
  } catch (err) {
    logger.error("Failed to start backend server", err);
    process.exitCode = 1;
    return undefined;
  }
}

/* istanbul ignore next -- entry point guard */
if (require.main === module) {
  void main();
}
