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
import type { GenericMinerInfo } from "./types/generic-miner.types";

interface ServerInfo {
  port: number;
  hostname: string;
  startTime: Date;
}

/**
 * Per-device profile that controls what data the mock miner exposes.
 *
 * Each profile represents a realistic scenario for a generic (pyasic-bridge)
 * miner: healthy, degraded, freshly booted, partial data, etc.
 * Bitaxe/AxeOS miners are NOT included — use a real device for native testing.
 */
interface DeviceProfile {
  hostname: string;
  overrides: Partial<GenericMinerInfo>;
}

const deviceProfiles: DeviceProfile[] = [
  // 1 — Fully healthy Antminer S19 Pro, all fields populated
  {
    hostname: "antminer-s19-pro-01",
    overrides: {
      make: "Bitmain",
      model: "Antminer S19 Pro",
      firmware: "20240601-v2.1.0",
      algo: "SHA256",
      serial_number: "SN100001",
      expected_hashrate: 110_000,
      wattage_limit: 3250,
      expected_hashboards: 3,
      expected_fans: 4,
      expected_chips: 444,
      total_chips: 444,
      nominal: true,
      is_mining: true,
    },
  },

  // 2 — Fully healthy Whatsminer M30S++, different make/model
  {
    hostname: "whatsminer-m30s-01",
    overrides: {
      make: "MicroBT",
      model: "Whatsminer M30S++",
      firmware: "20240115-v2.0.1",
      algo: "SHA256",
      serial_number: "SN200002",
      expected_hashrate: 112_000,
      wattage_limit: 3472,
      expected_hashboards: 3,
      expected_fans: 2,
      expected_chips: 348,
      total_chips: 348,
      nominal: true,
      is_mining: true,
    },
  },

  // 3 — Missing device info (make, model, firmware all absent)
  {
    hostname: "unknown-rig-03",
    overrides: {
      make: undefined,
      model: undefined,
      firmware: undefined,
      algo: undefined,
      serial_number: undefined,
      is_mining: true,
      nominal: true,
    },
  },

  // 4 — No hashboard details (hashrate works, but no per-board breakdown)
  {
    hostname: "rig-no-boards-04",
    overrides: {
      make: "Bitmain",
      model: "Antminer S9",
      firmware: "20230901-v1.3.4",
      algo: "SHA256",
      hashboards: undefined,
      total_chips: undefined,
      expected_chips: undefined,
      expected_hashboards: undefined,
      is_mining: true,
    },
  },

  // 5 — Minimal data: only hashrate and identity, everything else missing
  {
    hostname: "",
    overrides: {
      make: undefined,
      model: undefined,
      firmware: undefined,
      algo: undefined,
      serial_number: undefined,
      wattage: undefined,
      wattage_limit: undefined,
      voltage: undefined,
      temperature_avg: undefined,
      env_temp: undefined,
      shares_accepted: undefined,
      shares_rejected: undefined,
      best_difficulty: undefined,
      best_session_difficulty: undefined,
      network_difficulty: undefined,
      fans: undefined,
      hashboards: undefined,
      total_chips: undefined,
      expected_chips: undefined,
      expected_hashboards: undefined,
      expected_fans: undefined,
      nominal: undefined,
      efficiency: undefined,
      pool_url: undefined,
      pool_user: undefined,
      fw_ver: undefined,
      api_ver: undefined,
      is_mining: true,
    },
  },

  // 6 — Not mining: discovered but idle (zero hashrate, zero shares)
  {
    hostname: "idle-canaan-06",
    overrides: {
      make: "Canaan",
      model: "Avalon A1266",
      firmware: "20240601-v2.1.0",
      algo: "SHA256",
      hashrate: 0,
      expected_hashrate: 100_000,
      shares_accepted: 0,
      shares_rejected: 0,
      best_difficulty: undefined,
      best_session_difficulty: undefined,
      is_mining: false,
      nominal: false,
      efficiency: undefined,
      pool_url: "",
      pool_user: "",
    },
  },

  // 7 — Degraded hardware: 1 of 3 hashboards missing, 1 fan dead, high temp
  {
    hostname: "degraded-miner-07",
    overrides: {
      make: "Bitmain",
      model: "Antminer S19j Pro",
      firmware: "braiins-os-25.01",
      algo: "SHA256",
      hashboards: [
        { slot: 0, hashrate: 34200, temp: 72.3, chip_temp: 81.5, chips: 148, expected_chips: 148, active: true, voltage: 12.1 },
        { slot: 1, hashrate: 33800, temp: 78.1, chip_temp: 86.2, chips: 148, expected_chips: 148, active: true, voltage: 12.0 },
        { slot: 2, hashrate: 0, temp: 0, chip_temp: 0, chips: 0, expected_chips: 148, active: false, voltage: 0 },
      ],
      fans: [
        { speed: 6200 },
        { speed: 6100 },
        { speed: 0 },
        { speed: 5900 },
      ],
      total_chips: 296,
      expected_chips: 444,
      expected_hashboards: 3,
      expected_fans: 4,
      hashrate: 68000,
      expected_hashrate: 100_000,
      temperature_avg: 82.5,
      nominal: false,
      is_mining: true,
    },
  },

  // 8 — Power data missing (hashrate/temp fine, but no wattage/voltage)
  {
    hostname: "no-power-data-08",
    overrides: {
      make: "MicroBT",
      model: "Whatsminer M50",
      firmware: "vnish-2.0.6",
      algo: "SHA256",
      wattage: undefined,
      wattage_limit: undefined,
      voltage: undefined,
      efficiency: undefined,
      is_mining: true,
      nominal: true,
    },
  },

  // 9 — Fresh boot: zero uptime, zero shares, mining just started
  {
    hostname: "fresh-boot-09",
    overrides: {
      make: "Innosilicon",
      model: "T3+",
      firmware: "20230901-v1.3.4",
      algo: "SHA256",
      shares_accepted: 0,
      shares_rejected: 0,
      best_difficulty: undefined,
      best_session_difficulty: undefined,
      hashrate: 1200,
      is_mining: true,
      nominal: undefined,
    },
  },

  // 10 — Network/difficulty issues: mining fine, but difficulty & pool data missing
  {
    hostname: "net-issues-10",
    overrides: {
      make: "Bitmain",
      model: "Antminer S19 Pro",
      firmware: "20240115-v2.0.1",
      algo: "SHA256",
      network_difficulty: undefined,
      best_difficulty: undefined,
      best_session_difficulty: undefined,
      pool_url: undefined,
      pool_user: undefined,
      is_mining: true,
      nominal: true,
    },
  },
];

const activeServers: ServerInfo[] = [];
const { listingPort, ports } = config;

const createMockServerWorker = (
  port: number,
  hostname: string,
  minerType = "generic",
  systemInfoOverrides: Record<string, unknown> = {}
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.resolve(__dirname, "./mockWorker.js"), {
      workerData: { port, hostname, minerType, systemInfoOverrides },
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
    const hostname = profile.hostname || `mock-miner-${i + 1}`;
    const hostnameOverride = profile.hostname === "" ? { hostname: "" } : {};
    return createMockServerWorker(
      port,
      hostname,
      "generic",
      { ...profile.overrides, ...hostnameOverride }
    );
  })
)
  .then(() => logger.info("All mock servers started successfully"))
  .catch((error) => logger.error("Error starting mock servers:", error));

const createListingServer = (port: number): void => {
  const app: Express = express();

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

createListingServer(listingPort);
