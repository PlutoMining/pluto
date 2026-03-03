/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
 */

import { parentPort, workerData } from "worker_threads";
import { logger } from "@pluto/logger";
import express, { Express } from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { generateFakeLog } from "./services/mock.service";
import systemRoutes from "./routes/system.routes";
import { config } from "./config/environment";
import { checkIfRestarting } from "./middlewares/checkIfRestarting";
import { DeviceApiVersion } from "./types/axeos.types";
import { createMockMinerContext } from "./factories/mock-miner-context.factory";
import type { SupportedMinerType } from "./factories/mock-miner-context.factory";

interface ServerInfo {
  port: number;
  hostname: string;
  startTime: Date;
}

const {
  port,
  hostname,
  apiVersion,
  minerType,
  systemInfoOverrides,
} = workerData as {
  port: number;
  hostname: string;
  apiVersion?: DeviceApiVersion;
  minerType?: string;
  systemInfoOverrides?: Record<string, unknown>;
};

const activeServers: ServerInfo[] = [];

const createMockServer = (
  port: number,
  hostname: string,
  apiVersion?: DeviceApiVersion,
  minerTypeFromWorker?: string
): void => {
  const app: Express = express();
  const server = createServer(app);

  const startTime = new Date();

  app.locals.mockContext = createMockMinerContext({
    minerType: (minerTypeFromWorker as SupportedMinerType) ?? "generic",
    hostname,
    startTime,
    apiVersion,
    systemInfoOverrides,
  });

  if (config.logsPubEnabled) {
    const wss = new WebSocketServer({ server });

    const broadcastLogs = async (): Promise<void> => {
      const startTime = Date.now();

      wss.clients.forEach((client: any) => {
        if (client.readyState === client.OPEN) {
          const log = generateFakeLog();
          client.send(JSON.stringify({ log }));
          logger.debug(`Sent log to WebSocket client: ${log}`);
        }
      });

      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(5000 - elapsedTime, 0);

      logger.debug(
        `Broadcast took ${elapsedTime} ms. Waiting ${remainingTime} ms for next broadcast.`
      );
      setTimeout(broadcastLogs, remainingTime);
    };

    broadcastLogs();
  }

  app.use(express.json());
  app.use(checkIfRestarting);
  app.use(systemRoutes);

  server.listen(port, () => {
    logger.info(`HTTP Server (${hostname}) running on http://localhost:${port}`);
    logger.info(`WebSocket Server (${hostname}) running on ws://localhost:${port}`);
    parentPort?.postMessage({ status: "server_started", port, hostname });
  });

  activeServers.push({ port, hostname, startTime });
};

createMockServer(port, hostname, apiVersion, minerType);
