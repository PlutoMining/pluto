/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { findMany, findOne, insertOne, updateOne } from "@pluto/db";
import { Device } from "@pluto/interfaces";
import { logger } from "@pluto/logger";
import axios from "axios";
import { config } from "../config/environment";
import { MinerNetwork, getMiner, UnknownMiner, BaseMiner, MinerData, setLogger } from "@plutomining/miner";
import { mapMinerInfoToDeviceInfo } from "../mappers/device-info.mapper";

// Configure miner library to use Pluto logger
setLogger({
  debug: logger.debug.bind(logger),
  info: logger.info.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
});

interface DiscoveryOptions {
  ip?: string;
  mac?: string;
  partialMatch?: boolean; // Opzione per ricerche parziali sull'IP
}

/**
 * Save device to database (insert or update)
 */
async function saveDevice(deviceInfo: Device): Promise<void> {
  try {
    await insertOne<Device>(
      "pluto_discovery",
      "devices:discovered",
      deviceInfo.mac,
      deviceInfo
    );
    logger.info(`Device ${deviceInfo.ip} inserted successfully.`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("already exists")) {
      logger.info(`Device ${deviceInfo.ip} already exists, updating...`);
      await updateOne<Device>(
        "pluto_discovery",
        "devices:discovered",
        deviceInfo.mac,
        deviceInfo
      );
    } else {
      throw error;
    }
  }
}

/**
 * Convert MinerData to Device format
 */
function minerDataToDevice(minerData: MinerData, type: string = "pluto", storageIP?: string): Device {
  const now = new Date().toISOString();
  return {
    ip: storageIP || minerData.ip,
    mac: minerData.mac,
    type: type,
    info: mapMinerInfoToDeviceInfo(minerData.info),
    createdAt: now,
    updatedAt: now,
  };
}

export async function discoverDevices(options?: DiscoveryOptions) {
  logger.info("Starting device discovery process...");

  try {
    // Single IP discovery (bypass network scan)
    if (options?.ip && !options.partialMatch) {
      logger.info(
        `Bypassing network discovery and directly attempting feature detection for IP: ${options.ip}`
      );

      try {
        const miner = await getMiner(options.ip, options.mac);

        // Skip if unknown miner
        if (miner instanceof UnknownMiner) {
          logger.info(`Device ${options.ip} is not a recognized miner, skipping.`);
          return [];
        }

        const minerData = await miner.getData();
        const deviceInfo = minerDataToDevice(minerData, "pluto");

        logger.info(`Device ${options.ip} with ASICModel detected and added to the list.`);
        await saveDevice(deviceInfo);

        return [deviceInfo];
      } catch (error) {
        logger.error(
          `Failed to discover device at ${options.ip}:`,
          error instanceof Error ? error.message : String(error)
        );
        return [];
      }
    }

    // Network-wide discovery
    let network: MinerNetwork;

    if (options?.ip && options.partialMatch) {
      // Use subnet from IP for partial match
      network = MinerNetwork.fromIP(options.ip);
    } else {
      // Scan all active interfaces (no subnet = uses ARP scan)
      network = MinerNetwork.forAllInterfaces();
    }

    // Scan network for miners (returns identified miner instances)
    const miners = await network.scan();

    // Filter by IP if partial match requested
    let filteredMiners = miners;
    if (options?.ip && options.partialMatch) {
      filteredMiners = miners.filter((miner: BaseMiner) => miner.ip.includes(options.ip!));
    }

    // Handle mock devices if enabled
    if (config.detectMockDevices) {
      try {
        const response = await axios.get(`${config.mockDiscoveryHost}/servers`);
        if (response.data && Array.isArray(response.data.servers)) {
          logger.info(`Mock servers retrieved: ${response.data.servers.length} found.`);

          const mockMiners = await Promise.allSettled(
            response.data.servers.map(async (server: any, index: number): Promise<BaseMiner | null> => {
              // Storage IP: use host.docker.internal so backend containers can reach mock devices
              const storageIP = config.mockDeviceHost
                ? `${config.mockDeviceHost}:${server.port}`
                : config.mockDiscoveryHost.replace(/https?:\/\/(.+)(\:.+)$/, `$1:${server.port}`);
              const mockMAC = `ff:ff:ff:ff:ff:${(index + 1).toString(16).padStart(2, "0")}`;

              // For mock devices, discovery (host network) needs to use localhost for verification
              // but store host.docker.internal for backend containers to reach them
              const verificationIP = storageIP.includes("host.docker.internal")
                ? storageIP.replace("host.docker.internal", "localhost")
                : storageIP;

              try {
                const miner = await getMiner(verificationIP, mockMAC);
                if (!(miner instanceof UnknownMiner)) {
                  // Store the storage IP on the miner instance so we can use it later
                  // We'll handle this in the devicePromises section
                  (miner as any)._storageIP = storageIP;
                  return miner;
                }
              } catch {
                // Ignore errors for mock devices
              }
              return null;
            })
          );

          const validMockMiners = mockMiners
            .filter(
              (result): result is PromiseFulfilledResult<BaseMiner | null> =>
                result.status === "fulfilled" && result.value !== null
            )
            .map((result) => result.value!);

          filteredMiners = [...filteredMiners, ...validMockMiners];
          logger.info(`Mock devices added. Total devices: ${filteredMiners.length}`);
        }
      } catch (error) {
        logger.error("Failed to retrieve mock devices:", error);
      }
    }

    if (filteredMiners.length === 0) {
      return [];
    }

    // Get data from all miners using the miner library interface
    // Process sequentially to avoid potential race conditions or rate limiting
    const devices: Device[] = [];

    for (const miner of filteredMiners) {
      try {
        const minerData = await miner.getData();

        // Determine the storage IP - for mock devices, use host.docker.internal
        const isMockDevice = miner.mac?.startsWith("ff:ff:ff:ff:ff:");
        let storageIP: string | undefined;

        // If this is a mock device that was verified with localhost, convert to host.docker.internal
        if (isMockDevice && miner.ip.includes("localhost")) {
          storageIP = miner.ip.replace("localhost", "host.docker.internal");
        } else if ((miner as any)._storageIP) {
          // Use the stored storage IP if available (set during mock device identification)
          storageIP = (miner as any)._storageIP;
        }

        const deviceInfo = minerDataToDevice(minerData, "pluto", storageIP);

        // Save to database
        await saveDevice(deviceInfo);

        logger.info(`Device ${deviceInfo.ip} with ASICModel added to the list.`);
        devices.push(deviceInfo);
      } catch (error) {
        const errorMessage = error instanceof Error
          ? error.message || String(error)
          : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        logger.error(
          `Failed to get data from miner at ${miner.ip}: ${errorMessage}`,
          errorStack ? { stack: errorStack } : undefined
        );
        // Continue processing other miners even if one fails
      }
    }

    logger.info(`Discovery completed. ${devices.length} devices found with ASICModel.`);
    return devices;
  } catch (err) {
    logger.error("Discovery error:", err);
    return [];
  }
}

// Funzione per cercare un dispositivo scoperto
export const lookupDiscoveredDevice = async (mac: string): Promise<Device | undefined> => {
  try {
    const deviceInfo = await findOne<Device>("pluto_discovery", `devices:discovered`, mac);

    if (deviceInfo) {
      logger.info(`Device found in devices:discovered for MAC: ${mac}`);
      return deviceInfo;
    } else {
      logger.info(`No device found in devices:discovered for MAC: ${mac}`);
      return undefined;
    }
  } catch (error) {
    logger.error(`Error during devices:discovered lookup for MAC: ${mac}`, error);
    throw error;
  }
};

// Funzione per cercare dispositivi scoperti da una lista di MAC address
export const lookupMultipleDiscoveredDevices = async ({
  macs,
  ips,
  hostnames,
  partialMatch = {
    macs: "both", // 'left', 'right', 'both', or 'none'
    ips: "both", // 'left', 'right', 'both', or 'none'
    hostnames: "both", // 'left', 'right', 'both', or 'none'
  },
}: {
  macs?: string[];
  ips?: string[];
  hostnames?: string[];
  partialMatch?: {
    macs?: "left" | "right" | "both" | "none";
    ips?: "left" | "right" | "both" | "none";
    hostnames?: "left" | "right" | "both" | "none";
  };
}): Promise<Device[]> => {
  try {
    const devices = await findMany<Device>("pluto_discovery", `devices:discovered`, (device) => {
      const matchWithPartial = (
        value: string,
        list: string[],
        matchType: "left" | "right" | "both" | "none"
      ) => {
        return list.some((item) => {
          if (matchType === "none") {
            return value === item; // Corrispondenza esatta
          } else if (matchType === "left") {
            return value.endsWith(item); // Like a sinistra
          } else if (matchType === "right") {
            return value.startsWith(item); // Like a destra
          } else {
            return value.includes(item); // Like su entrambi i lati
          }
        });
      };

      // Matching per MAC addresses
      if (macs && macs.length > 0) {
        if (!matchWithPartial(device.mac, macs, partialMatch.macs || "both")) {
          return false;
        }
      }

      // Matching per IP addresses
      if (ips && ips.length > 0) {
        if (!matchWithPartial(device.ip, ips, partialMatch.ips || "both")) {
          return false;
        }
      }

      // Matching per Hostnames
      if (hostnames && hostnames.length > 0) {
        if (!matchWithPartial(device.info.hostname, hostnames, partialMatch.hostnames || "both")) {
          return false;
        }
      }

      return true;
    });

    return devices.filter(Boolean) as Device[];
  } catch (error) {
    logger.error("Error during multiple discovered devices lookup", error);
    throw error;
  }
};
