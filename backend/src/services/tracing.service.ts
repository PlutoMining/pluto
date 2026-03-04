/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { updateOne } from "@pluto/db";
import type { DiscoveredMiner, MinerData } from "@pluto/interfaces";
import { createCustomLogger, logger } from "@pluto/logger";
import { asyncForEach } from "@pluto/utils";
import { Server as NetServer } from "http";
import { Server as ServerIO } from "socket.io";
import { config } from "../config/environment";
import { extractHostnameFromMinerData } from "./tracing.helpers";
import {
  updateDeviceMetrics,
  removeDeviceMetrics,
  updateOverviewMetrics,
} from "./metrics.service";
import { driverFactory } from "../drivers";

/** Interval between polls per device. Each poll = one request backend→driver; native drivers talk directly to the miner, pyasic-bridge driver proxies through pyasic. */
const getPollIntervalMs = (): number => config.pollIntervalMs;

interface IpMapEntry {
  mac: string;
  type: string;
  cleanupWs?: () => void;
  timeout?: NodeJS.Timeout;
  minerData?: MinerData;
  tracing?: boolean;
}

let isListeningLogs = false;
let ipMap: Record<string, IpMapEntry> = {};
let ioInstance: ServerIO | undefined;

/**
 * Start the socket.io handler for device events.
 */
export function startIoHandler(server: NetServer): void {
  if (ioInstance) return;

  logger.info("Starting ioHandler for the devices");
  ioInstance = new ServerIO(server, {
    path: "/socket/io",
    addTrailingSlash: false,
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  ioInstance.on("connection", (socket) => {
    socket.on("enableLogsListening", () => {
      isListeningLogs = true;
      logger.info("External WebSocket listening enabled");
      ioInstance!.emit("logsListeningStatus", isListeningLogs);
    });

    socket.on("disableLogsListening", () => {
      isListeningLogs = false;
      logger.info("External WebSocket listening disabled");
      ioInstance!.emit("logsListeningStatus", isListeningLogs);
    });

    socket.on("checkLogsListening", () => {
      socket.emit("logsListeningStatus", isListeningLogs);
    });
  });
}

/**
 * Update the list of monitored device IPs.
 * Adds new devices and removes ones that are no longer present.
 */
export async function updateOriginalIpsListeners(
  newDevices: DiscoveredMiner[],
  traceLogs?: boolean
): Promise<void> {
  // Remove devices that are no longer present
  await asyncForEach(Object.keys(ipMap), async (existingIp) => {
    if (newDevices.some((d) => d.ip === existingIp)) return;
    stopDeviceMonitoring(existingIp);
  });

  // Add new devices (first polls run in parallel)
  const startPromises: Promise<void>[] = [];
  for (const device of newDevices) {
    if (ipMap[device.ip]) {
      logger.info(`IP ${device.ip} is already being monitored.`);
    } else {
      logger.info(`Adding new IP to the listening pool: ${device.ip}`);
      startPromises.push(startDeviceMonitoring(device, traceLogs));
    }
  }

  const results = await Promise.allSettled(startPromises);
  for (const result of results) {
    if (result.status === "rejected") {
      logger.error("Failed to start device monitoring:", result.reason);
    }
  }
}

/**
 * Stop monitoring a single device by IP.
 */
function stopDeviceMonitoring(ip: string): void {
  const entry = ipMap[ip];
  if (!entry) return;

  logger.info(`Stopping monitoring for IP ${ip}`);

  clearTimeout(entry.timeout);
  entry.cleanupWs?.();

  ioInstance?.emit("device_removed", {
    ipRemoved: ip,
    remainingIps: Object.keys(ipMap).filter((k) => k !== ip),
  });

  if (config.deleteDataOnDeviceRemove) {
    try {
      removeDeviceMetrics(entry.mac);
      logger.info(`Removed Prometheus metrics for device ${entry.mac} (IP ${ip})`);
    } catch (err) {
      logger.error(`Failed to remove Prometheus metrics for IP ${ip}:`, err);
    }
  }

  delete ipMap[ip];
}


/**
 * Start monitoring a single device: register it, run the first poll,
 * and optionally connect the log WebSocket.
 */
async function startDeviceMonitoring(
  discoveredMiner: DiscoveredMiner,
  traceLogs?: boolean
): Promise<void> {
  const driver = driverFactory.getDriverForDevice(discoveredMiner.type, discoveredMiner.mac);

  ipMap[discoveredMiner.ip] = {
    mac: discoveredMiner.mac,
    type: discoveredMiner.type,
    minerData: discoveredMiner.minerData,
  };

  const hostname = extractHostnameFromMinerData(discoveredMiner.minerData);

  let retryAttempts = 0;
  const maxRetryAttempts = 5;

  const connectWebSocket = async (): Promise<void> => {
    if (!driver.connectLogs) return;
    try {
      const cleanup = await driver.connectLogs(
        discoveredMiner.ip,
        (messageString: string) => {
          logger.debug(
            `Received log message for IP ${discoveredMiner.ip}: ${messageString.substring(0, 100)}...`
          );

          const logsLogger = createCustomLogger(hostname);
          logsLogger.info(messageString);

          if (isListeningLogs) {
            ioInstance?.emit("logs_update", {
              ...discoveredMiner,
              logMessage: messageString,
            });
          }
        },
        (error: Error) => {
          logger.error(`WebSocket error for IP ${discoveredMiner.ip}:`, error);
          attemptReconnect();
        },
        () => {
          logger.debug(`WebSocket closed for IP ${discoveredMiner.ip}`);
          attemptReconnect();
        }
      );

      retryAttempts = 0;
      if (ipMap[discoveredMiner.ip]) {
        ipMap[discoveredMiner.ip].cleanupWs = cleanup;
      }
    } catch (error) {
      logger.error(`Failed to connect WebSocket for IP ${discoveredMiner.ip}:`, error);
      attemptReconnect();
    }
  };

  const attemptReconnect = (): void => {
    if (retryAttempts < maxRetryAttempts) {
      retryAttempts += 1;
      const retryDelay = Math.min(5000, retryAttempts * 1000);
      logger.info(
        `Attempting to reconnect WebSocket for ${discoveredMiner.ip} in ${retryDelay / 1000} seconds...`
      );
      setTimeout(() => void connectWebSocket(), retryDelay);
    } else {
      logger.error(`Max retry attempts reached for IP ${discoveredMiner.ip}. Giving up.`);
    }
  };

  const pollSystemInfo = async (): Promise<void> => {
    const startTime = Date.now();

    try {
      logger.debug(`Polling system info from ${discoveredMiner.ip} via ${driver.driverName} driver`);
      const minerData = await driver.fetchData(discoveredMiner.ip);

      if (!minerData) {
        throw new Error("Failed to fetch miner data");
      }

      const updatedMiner: DiscoveredMiner = { ...discoveredMiner, minerData };

      const updatedDevice = await updateOne<DiscoveredMiner>(
        "pluto_core",
        "devices:imprinted",
        discoveredMiner.mac,
        updatedMiner
      );

      if (ipMap[discoveredMiner.ip]) {
        ipMap[discoveredMiner.ip].minerData = minerData;
        ipMap[discoveredMiner.ip].tracing = true;
      }

      ioInstance?.emit("stat_update", { ...updatedDevice, tracing: true });
      updateDeviceMetrics(discoveredMiner.mac, minerData);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.error(`Failed to poll miner data for ${discoveredMiner.ip}:`, error);

      if (ipMap[discoveredMiner.ip]) {
        ipMap[discoveredMiner.ip].tracing = false;
      }

      try {
        const updatedDevice = await updateOne<DiscoveredMiner>(
          "pluto_core",
          "devices:imprinted",
          discoveredMiner.mac,
          { ...discoveredMiner }
        );

        const payload = { ...updatedDevice, tracing: false };
        ioInstance?.emit("stat_update", payload);
        ioInstance?.emit("error", { ...payload, error: errorMessage });
      } catch (dbError) {
        logger.error(`Failed to persist offline state for ${discoveredMiner.ip}:`, dbError);
        ioInstance?.emit("error", { ...discoveredMiner, tracing: false, error: errorMessage });
      }

      const prevMinerData = ipMap[discoveredMiner.ip]?.minerData;
      updateDeviceMetrics(discoveredMiner.mac, {
        ip: discoveredMiner.ip,
        hostname: prevMinerData?.hostname,
        deviceInfo: prevMinerData?.deviceInfo,
        fans: [],
        hashboards: [],
      });
    } finally {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(getPollIntervalMs() - elapsedTime, 0);

      logger.debug(
        `pollSystemInfo from ${discoveredMiner.ip} took ${elapsedTime} ms. Waiting for ${remainingTime} ms before next polling.`
      );

      if (ipMap[discoveredMiner.ip]) {
        const timeoutId = setTimeout(pollSystemInfo, remainingTime);
        ipMap[discoveredMiner.ip].timeout = timeoutId;
      }

      const allMetrics = Object.values(ipMap)
        .filter((entry) => entry.minerData)
        .map((entry) => entry.minerData!);
      updateOverviewMetrics(allMetrics);
    }
  };

  const freshData = discoveredMiner.minerData;
  const isFresh = freshData && (freshData.hashrate?.rate ?? 0) > 0;

  if (isFresh) {
    logger.debug(`${discoveredMiner.ip}: discovery data is fresh, emitting initial stat_update`);
    ioInstance?.emit("stat_update", { ...discoveredMiner, tracing: true });
    updateDeviceMetrics(discoveredMiner.mac, freshData);
    if (ipMap[discoveredMiner.ip]) {
      ipMap[discoveredMiner.ip].tracing = true;
    }

    const timeoutId = setTimeout(pollSystemInfo, getPollIntervalMs());
    if (ipMap[discoveredMiner.ip]) {
      ipMap[discoveredMiner.ip].timeout = timeoutId;
    }
  } else {
    await pollSystemInfo();
  }

  if (traceLogs) {
    void connectWebSocket();
  }
}

/**
 * Get the current socket.io instance.
 */
export function getIoInstance(): ServerIO | undefined {
  return ioInstance;
}

/**
 * Get current tracing (online) state per device IP.
 * Used to enrich GET /api/devices/imprint responses so the frontend shows correct status on load.
 */
export function getTracingByIp(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const [ip, entry] of Object.entries(ipMap)) {
    out[ip] = entry.tracing === true;
  }
  return out;
}

/**
 * Reset all module state. For use in tests only.
 */
export function _resetForTesting(): void {
  for (const entry of Object.values(ipMap)) {
    clearTimeout(entry.timeout);
    entry.cleanupWs?.();
  }
  ipMap = {};
  ioInstance = undefined;
  isListeningLogs = false;
}
