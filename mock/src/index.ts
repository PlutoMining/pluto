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
  // 1 – Fully populated Gamma (common healthy miner)
  { hostname: "bitaxeGamma2", apiVersion: DeviceApiVersion.Legacy, overrides: { ASICModel: "BM1370", boardVersion: "601" } },
  // 2 – Fully populated Supra, new API
  { hostname: "bitaxeSupra1", apiVersion: DeviceApiVersion.New, overrides: { ASICModel: "BM1368", boardVersion: "401" } },
  // 3 – No hostname (firmware doesn't report one), has model
  { hostname: "", apiVersion: DeviceApiVersion.Legacy, overrides: { ASICModel: "BM1366", boardVersion: "201" } },
  // 4 – No hostname, new API, has model
  { hostname: "", apiVersion: DeviceApiVersion.New, overrides: { ASICModel: "BM1397", boardVersion: "101" } },
  // 5 – Fresh out of box: has hostname, unknown ASIC, pool not configured yet,
  //     but sensors and hashrate work fine (device is physically running)
  { hostname: "miner-rack-01", apiVersion: DeviceApiVersion.Legacy, overrides: {
    ASICModel: "",
    stratumURL: "",
    stratumPort: 0,
    stratumUser: "",
    fallbackStratumURL: "",
    fallbackStratumPort: 0,
    fallbackStratumUser: "",
    hashRate: 0,
    sharesAccepted: 0,
    sharesRejected: 0,
    bestDiff: 0,
    bestSessionDiff: 0,
  }},
  // 6 – Flaky hardware: temp sensor works but voltage/current read failed,
  //     hashing fine, no hostname reported by firmware
  { hostname: "", apiVersion: DeviceApiVersion.New, overrides: {
    ASICModel: "BM1366",
    boardVersion: "201",
    voltage: null,
    current: null,
    vrTemp: null,
  }},
  // 7 – Just rebooted: genuinely zero hashrate/shares (not mining yet),
  //     but difficulty sub-call failed (null). Sensors report normally.
  { hostname: "officeUltra", apiVersion: DeviceApiVersion.Legacy, overrides: {
    ASICModel: "BM1366",
    boardVersion: "201",
    hashRate: 0,
    hashRate_1m: 0,
    hashRate_10m: 0,
    hashRate_1h: 0,
    sharesAccepted: 0,
    sharesRejected: 0,
    bestDiff: null,
    bestSessionDiff: null,
    networkDifficulty: null,
  }},
  // 8 – Older firmware: version strings missing (null), wifi RSSI flaky (null),
  //     but device is hashing and reporting data fine otherwise
  { hostname: "bitaxeMax1", apiVersion: DeviceApiVersion.New, overrides: {
    ASICModel: "BM1397",
    boardVersion: "101",
    version: null,
    axeOSVersion: null,
    idfVersion: null,
    wifiRSSI: null,
  }},
  // 9 – Network-challenged: no hostname, MAC readable but wifi details failed,
  //     pool configured and hashing, but network difficulty unavailable
  { hostname: "", apiVersion: DeviceApiVersion.Legacy, overrides: {
    ASICModel: "BM1370",
    boardVersion: "601",
    ssid: null,
    wifiStatus: null,
    wifiRSSI: null,
    ipv6: "",
    networkDifficulty: null,
    blockHeight: null,
    poolDifficulty: 0,
  }},
  // 10 – Mostly healthy but power data partially failed: power null but
  //      voltage/current report fine; fallback pool not configured
  { hostname: "garageRig", apiVersion: DeviceApiVersion.New, overrides: {
    ASICModel: "BM1368",
    boardVersion: "401",
    power: null,
    fallbackStratumURL: "",
    fallbackStratumPort: 0,
    fallbackStratumUser: "",
  }},
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
