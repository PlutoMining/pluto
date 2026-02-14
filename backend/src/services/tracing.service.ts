/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { updateOne } from "@pluto/db";
import { DiscoveredMiner } from "@pluto/interfaces";
import { createCustomLogger, logger } from "@pluto/logger";
import { asyncForEach, sanitizeHostname } from "@pluto/utils";
import { Server as NetServer } from "http";
import { Server as ServerIO } from "socket.io";
import { config } from "../config/environment";
import { extractHostnameFromMinerData } from "./tracing.helpers";
import {
  createMetricsForDevice,
  deleteMetricsForDevice,
  updateOverviewMetrics,
} from "./metrics.service";
import { pyasicBridgeService } from "./pyasic-bridge.service";
import type { MinerData } from "@pluto/pyasic-bridge-client";

/** Interval between polls per device. Each poll = one request backend→pyasic-bridge; pyasic then issues several HTTP requests to the miner (e.g. /, /api/system/info, /api/system/asic). */
const getPollIntervalMs = (): number => config.pollIntervalMs;

interface IpMapEntry {
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

  await Promise.allSettled(startPromises);
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

  const hostname = extractHostnameFromMinerData(entry.minerData);
  ioInstance?.emit("device_removed", {
    ipRemoved: ip,
    remainingIps: Object.keys(ipMap).filter((k) => k !== ip),
  });

  if (config.deleteDataOnDeviceRemove) {
    try {
      deleteMetricsForDevice(sanitizeHostname(hostname));
      logger.info(`Deleted Prometheus metrics for IP ${ip}`);
    } catch (err) {
      logger.error(`Failed to delete Prometheus metrics for IP ${ip}:`, err);
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
  // Register entry BEFORE any async work so concurrent readers see it
  ipMap[discoveredMiner.ip] = {
    minerData: discoveredMiner.minerData,
  };

  const hostname = extractHostnameFromMinerData(discoveredMiner.minerData);
  const { updatePrometheusMetrics } = createMetricsForDevice(sanitizeHostname(hostname));

  let retryAttempts = 0;
  const maxRetryAttempts = 5;

  const connectWebSocket = async (): Promise<void> => {
    try {
      const cleanup = await pyasicBridgeService.connectMinerLogsWebSocket(
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
      logger.debug(`Polling system info from ${discoveredMiner.ip} via pyasic-bridge`);
      const minerData = await pyasicBridgeService.fetchMinerData(discoveredMiner.ip);

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
      updatePrometheusMetrics(minerData);
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

      // Reset Prometheus metrics so stale values aren't reported for offline devices
      updatePrometheusMetrics({
        ip: discoveredMiner.ip,
        hashrate: { rate: 0, unit: "H/s" },
        wattage: 0,
        voltage: 0,
        fans: [],
        temperature: 0,
        hashboards: [],
      } as unknown as MinerData);
    } finally {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(getPollIntervalMs() - elapsedTime, 0);

      logger.debug(
        `pollSystemInfo from ${discoveredMiner.ip} took ${elapsedTime} ms. Waiting for ${remainingTime} ms before next polling.`
      );

      // Schedule next poll only if device is still being monitored
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

  // Run first poll eagerly so callers can await it
  await pollSystemInfo();

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
