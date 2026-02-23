/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { Worker } from "worker_threads";
import { logger } from "@pluto/logger";
import { config } from "./config/environment";
import express, { Express } from "express";
import path from "path";
import { DeviceApiVersion } from "./types/axeos.types";

interface ServerInfo {
  port: number;
  hostname: string;
  startTime: Date;
}

/**
 * Per-device profile that controls what identity information the mock
 * miner exposes via /api/system/info. Mirrors real-world scenarios:
 * some devices report a hostname, others don't; firmware may or may
 * not include the ASIC model string.
 */
interface DeviceProfile {
  hostname: string;
  apiVersion: DeviceApiVersion;
  overrides: Record<string, unknown>;
}

const deviceProfiles: DeviceProfile[] = [
  // 1 – Named Bitaxe Gamma, fully populated (common case)
  { hostname: "bitaxeGamma2", apiVersion: DeviceApiVersion.Legacy, overrides: { ASICModel: "BM1370", boardVersion: "601" } },
  // 2 – Named Supra with new API
  { hostname: "bitaxeSupra1", apiVersion: DeviceApiVersion.New, overrides: { ASICModel: "BM1368", boardVersion: "401" } },
  // 3 – No hostname (firmware doesn't report one), has model
  { hostname: "", apiVersion: DeviceApiVersion.Legacy, overrides: { ASICModel: "BM1366", boardVersion: "201" } },
  // 4 – No hostname, new API, has model
  { hostname: "", apiVersion: DeviceApiVersion.New, overrides: { ASICModel: "BM1397", boardVersion: "101" } },
  // 5 – Has hostname, missing ASICModel (unknown ASIC)
  { hostname: "miner-rack-01", apiVersion: DeviceApiVersion.Legacy, overrides: { ASICModel: "" } },
  // 6 – No hostname AND no ASICModel (bare device with minimal firmware)
  { hostname: "", apiVersion: DeviceApiVersion.New, overrides: { ASICModel: "" } },
  // 7 – Named Ultra
  { hostname: "officeUltra", apiVersion: DeviceApiVersion.Legacy, overrides: { ASICModel: "BM1366", boardVersion: "201" } },
  // 8 – Named Max, new API
  { hostname: "bitaxeMax1", apiVersion: DeviceApiVersion.New, overrides: { ASICModel: "BM1397", boardVersion: "101" } },
  // 9 – No hostname, Gamma
  { hostname: "", apiVersion: DeviceApiVersion.Legacy, overrides: { ASICModel: "BM1370", boardVersion: "601" } },
  // 10 – Named device, fully populated
  { hostname: "garageRig", apiVersion: DeviceApiVersion.New, overrides: { ASICModel: "BM1368", boardVersion: "401" } },
];

const activeServers: ServerInfo[] = [];
const { listingPort, ports } = config;

const createMockServerWorker = (
  port: number,
  hostname: string,
  apiVersion: DeviceApiVersion,
  minerType = "axeos",
  systemInfoOverrides: Record<string, unknown> = {}
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.resolve(__dirname, "./mockWorker.js"), {
      workerData: { port, hostname, apiVersion, minerType, systemInfoOverrides },
    });

    const label = hostname || `port:${port}`;
    worker.on("message", (message: any) => {
      if (message.status === "server_started") {
        logger.info(`Worker for ${label} started on port ${port}`);
        activeServers.push({
          port: message.port,
          hostname: message.hostname,
          startTime: new Date(),
        });
        resolve();
      }
    });

    worker.on("error", (error) => {
      logger.error(`Error in worker for ${label}:`, error);
      reject(error);
    });

    worker.on("exit", (code) => {
      if (code !== 0) {
        logger.error(`Worker for ${label} stopped with exit code ${code}`);
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
};

Promise.all(
  ports.map((port: number, i: number) => {
    const profile = deviceProfiles[i % deviceProfiles.length];
    const hostname = profile.hostname || `mockaxe${i + 1}`;
    const hostnameOverride = profile.hostname === "" ? { hostname: "" } : {};
    return createMockServerWorker(
      port,
      hostname,
      profile.apiVersion,
      "axeos",
      { ...profile.overrides, ...hostnameOverride }
    );
  })
)
  .then(() => logger.info("All mock servers started successfully"))
  .catch((error) => logger.error("Error starting mock servers:", error));

// Aggiungiamo un server per elencare tutti gli altri server attivi
const createListingServer = (port: number): void => {
  const app: Express = express();

  // Rotta per ottenere la lista dei server attivi, escluso se stesso
  app.get("/servers", (req, res) => {
    const listingHostname = `listing-server:${port}`;
    const otherServers = activeServers.filter((server) => server.port !== port);
    res.json({
      message: `Available servers from ${listingHostname}`,
      servers: otherServers,
    });
  });

  app.listen(port, () => {
    logger.info(`Listing server running on http://localhost:${port}`);
  });
};

// Avvia il server di listing
createListingServer(listingPort);
