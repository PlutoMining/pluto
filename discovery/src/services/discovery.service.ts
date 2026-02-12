/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { findMany, findOne, insertOne, updateOne } from "@pluto/db";
import { DiscoveredMiner } from "@pluto/interfaces";
import { logger } from "@pluto/logger";
import axios from "axios";
import { config } from "../config/environment";
import { ArpScanResult, arpScan, getActiveNetworkInterfaces } from "./arpScanWrapper";
import { ConcurrencyLimiter } from "./concurrency-limiter.service";
import { DeviceConverterService } from "./device-converter.service";
import { MinerValidationService } from "./miner-validation.service";
import { UtilsService } from "./utils.service";

interface DiscoveryOptions {
  ip?: string;
  mac?: string;
  partialMatch?: boolean; // Opzione per ricerche parziali sull'IP
}

/**
 * Stores a discovered miner in the discovery database with upsert logic.
 */
async function storeDiscoveredMiner(discoveredMiner: DiscoveredMiner): Promise<void> {
  try {
    await insertOne<DiscoveredMiner>(
      "pluto_discovery",
      "devices:discovered",
      discoveredMiner.mac,
      discoveredMiner
    );
    logger.info(`Discovered miner ${discoveredMiner.ip} inserted successfully.`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("already exists")) {
      logger.info(`Discovered miner ${discoveredMiner.ip} already exists, updating...`);
      await updateOne<DiscoveredMiner>(
        "pluto_discovery",
        "devices:discovered",
        discoveredMiner.mac,
        discoveredMiner
      );
    } else {
      throw error;
    }
  }
}

/**
 * Handles discovery of a single IP address (bypasses ARP scan).
 */
async function discoverSingleIp(
  ip: string,
  mac?: string
): Promise<DiscoveredMiner[]> {
  logger.info(
    `Bypassing ARP discovery and directly validating IP via pyasic-bridge: ${ip}`
  );

  const validationResult = await MinerValidationService.validateSingleIp(ip);

  if (!validationResult || !validationResult.is_miner) {
    logger.info(
      `Device ${ip} is not a valid miner according to pyasic-bridge${
        validationResult?.error ? `: ${validationResult.error}` : ""
      }`
    );
    return [];
  }

  // Fetch miner data to enrich device info
  const minerData = await MinerValidationService.fetchMinerData(ip);
  const deviceMac = mac || minerData?.mac || "unknown";

  const discoveredMiner = DeviceConverterService.createDiscoveredMiner(
    ip,
    deviceMac,
    validationResult,
    null,
    minerData
  );

  logger.info(
    `Discovered miner ${ip} (${validationResult.model || "unknown model"}) validated and added to the list.`
  );

  await storeDiscoveredMiner(discoveredMiner);
  return [discoveredMiner];
}

/**
 * Retrieves mock devices from the mock discovery service.
 */
async function getMockDevices(): Promise<ArpScanResult[]> {
  try {
    logger.info(`Fetching mock devices from ${config.mockDiscoveryHost}/servers`);
    const response = await axios.get(`${config.mockDiscoveryHost}/servers`, {
      timeout: 5000,
    });
    
    if (!response.data || !Array.isArray(response.data.servers)) {
      logger.warn("Mock discovery service returned invalid response format");
      throw new Error("No mock servers found");
    }

    logger.info(`Mock servers retrieved: ${response.data.servers.length} found.`);

    return response.data.servers.map((server: any, index: number) => ({
      // Use MOCK_DEVICE_HOST for device IPs (allows Docker containers to reach mock devices)
      // If MOCK_DEVICE_HOST is set, use it; otherwise extract from mockDiscoveryHost
      ip: config.mockDeviceHost
        ? `${config.mockDeviceHost}:${server.port}`
        : config.mockDiscoveryHost.replace(/https?:\/\/(.+)(:.+)$/, `$1:${server.port}`),
      // Deterministic MAC based on port so it stays stable across restarts/removals.
      // This avoids generating a different MAC when the /servers ordering changes.
      mac:
        UtilsService.mockMacFromPort(server.port) ??
        `ff:ff:ff:ff:ff:${(index + 1).toString(16).padStart(2, "0")}`,
      type: "unknown",
    }));
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logger.error(
        `Failed to fetch mock devices from ${config.mockDiscoveryHost}: ${error.message} (${error.code || "unknown"})`
      );
    } else {
      logger.error(`Error fetching mock devices:`, error);
    }
    throw error;
  }
}

/**
 * Validates a chunk of IPs and returns discovered miners.
 */
async function validateChunk(
  chunk: string[],
  ipToArpDevice: Map<string, ArpScanResult>
): Promise<DiscoveredMiner[]> {
  const chunkMiners: DiscoveredMiner[] = [];

  logger.info(`Validating chunk of ${chunk.length} IPs: ${chunk.join(", ")}`);

  try {
    const validationResults = await MinerValidationService.validateBatch(chunk);
    logger.info(`Received validation results for chunk: ${validationResults.length} results`);

    // Process validation results
    for (const result of validationResults) {
    if (!result.is_miner) {
      logger.debug(
        `Device ${result.ip} is not a supported miner: ${result.error || "unknown reason"}`
      );
      continue;
    }

    const arpDevice = ipToArpDevice.get(result.ip);
    if (!arpDevice) {
      logger.warn(`No ARP device found for validated IP: ${result.ip}`);
      continue;
    }

    const storageIp = arpDevice.ip; // Keep original IP (host.docker.internal for mock devices) for storage

    // Fetch full miner data
    const minerData = await MinerValidationService.fetchMinerData(result.ip);

    // Create DiscoveredMiner from validation result and miner data
    const discoveredMiner = DeviceConverterService.createDiscoveredMiner(
      storageIp,
      arpDevice.mac,
      result,
      arpDevice,
      minerData
    );

    chunkMiners.push(discoveredMiner);
    logger.info(
      `Discovered miner ${storageIp} (${result.model || "unknown model"}) validated and added to the list.`
    );

      // Store in database immediately (progressive storage)
      await storeDiscoveredMiner(discoveredMiner);
    }

    return chunkMiners;
  } catch (error) {
    logger.error(`Error processing validation chunk:`, error);
    if (error instanceof Error) {
      logger.error(`Chunk error details: ${error.message} (${error.name})`);
    }
    // Return partial results even if some devices failed
    return chunkMiners;
  }
}

/**
 * Processes non-mock devices with chunking and concurrency control.
 */
async function processNonMockDevices(
  nonMockDevices: ArpScanResult[]
): Promise<DiscoveredMiner[]> {
  if (nonMockDevices.length === 0) {
    return [];
  }

  // Create a map of IP to ARP scan result for quick lookup
  const ipToArpDevice = new Map<string, ArpScanResult>();
  for (const device of nonMockDevices) {
    ipToArpDevice.set(device.ip, device);
  }

  // Extract IPs for validation
  const ipsToValidate = Array.from(ipToArpDevice.keys());

  // Split IPs into chunks
  const chunks = UtilsService.chunkArray(ipsToValidate, config.pyasicValidationBatchSize);
  logger.info(
    `Split ${ipsToValidate.length} IPs into ${chunks.length} chunks of size ${config.pyasicValidationBatchSize}`
  );

  // Create concurrency limiter
  const limiter = new ConcurrencyLimiter(config.pyasicValidationConcurrency);

  // Process chunks with concurrency limit
  const chunkPromises = chunks.map((chunk) =>
    limiter.execute(() => validateChunk(chunk, ipToArpDevice))
  );

  // Wait for all chunks to complete (using allSettled to continue even if some fail)
  const results = await Promise.allSettled(chunkPromises);

  // Collect all discovered miners from successful chunks
  const discoveredMiners: DiscoveredMiner[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      discoveredMiners.push(...result.value);
    } else {
      logger.error(`Chunk validation failed:`, result.reason);
    }
  }

  return discoveredMiners;
}

/**
 * Main discovery function that orchestrates ARP scan, validation, and miner storage.
 */
export async function discoverDevices(options?: DiscoveryOptions): Promise<DiscoveredMiner[]> {
  logger.info("Starting device discovery process...");

  try {
    // Handle single IP discovery (bypasses ARP scan)
    if (options?.ip && !options.partialMatch) {
      return await discoverSingleIp(options.ip, options.mac);
    }

    // Perform ARP scan
    const arpScanInterfaces = await getActiveNetworkInterfaces();

    let arpTable = (
      await Promise.allSettled(
        arpScanInterfaces.map(async (arpScanInterface) => {
          try {
            const localArpTable = await arpScan(arpScanInterface);
            return localArpTable;
          } catch (error) {
            logger.error(
              `Error retrieving ARP table for interface ${arpScanInterface}:`,
              error instanceof Error ? error.message : String(error)
            );
            return [];
          }
        })
      )
    )
      .filter((result) => result.status === "fulfilled")
      .map((result) => (result as PromiseFulfilledResult<ArpScanResult[]>).value)
      .flat();

    if (arpTable.length > 0) {
      logger.info(`ARP table retrieved successfully: ${arpTable.length} devices found.`);
      logger.debug(arpTable);
    } else {
      logger.warn(
        "No devices found in the ARP scan. Verify that your network interfaces are active and have IP addresses assigned."
      );
    }

    // Add mock devices if enabled
    if (config.detectMockDevices) {
      try {
        const mockDevices = await getMockDevices();
        arpTable = arpTable.concat(mockDevices);
        logger.info(`Mock devices added to the ARP table. Total devices: ${arpTable.length}`);
      } catch (error) {
        logger.warn(
          `Failed to fetch mock devices, continuing without them:`,
          error instanceof Error ? error.message : String(error)
        );
        // Continue discovery without mock devices
      }
    }

    // Apply IP filter if specified
    let filteredArpTable = arpTable;
    if (options?.ip && options.partialMatch) {
      filteredArpTable = arpTable.filter((device: ArpScanResult) =>
        device.ip.includes(options.ip!)
      );
    }

    const validDevices = filteredArpTable.filter((device: ArpScanResult) => device.ip);

    if (validDevices.length === 0) {
      logger.info(
        options?.ip ? `No devices found with IP: ${options.ip}` : "No valid devices found."
      );
      return [];
    }

    // Detect mock devices based on MAC prefix (ff:ff:ff:ff:*)
    const mockDevices = validDevices.filter((device) =>
      UtilsService.isMockDevice(device.mac)
    );
    if (mockDevices.length > 0) {
      logger.info(
        `Detected ${mockDevices.length} mock device(s) based on MAC prefix; including them in validation.`
      );
    }

    // Process all devices (real + mock) with chunking and concurrency control via pyasic-bridge
    logger.info(`Processing ${validDevices.length} device(s) for validation`);
    const discoveredMiners = await processNonMockDevices(validDevices);

    // If a MAC filter was provided (without a direct IP lookup), filter the final results by MAC.
    if (options?.mac) {
      const macFilter = options.mac.toLowerCase();
      const filteredByMac = discoveredMiners.filter(
        (miner) => miner.mac?.toLowerCase() === macFilter
      );

      logger.info(
        `Discovery completed. ${filteredByMac.length} validated miner(s) found after MAC filter (from ${discoveredMiners.length} total).`
      );

      return filteredByMac;
    }

    logger.info(`Discovery completed. ${discoveredMiners.length} validated miners found.`);
    return discoveredMiners;
  } catch (err) {
    logger.error("Discovery process failed:", err);
    if (err instanceof Error) {
      logger.error(`Error details: ${err.message}`);
      logger.error(`Error stack: ${err.stack}`);
    }
    return [];
  }
}

/**
 * Lookup a single discovered miner by MAC address.
 */
export const lookupDiscoveredDevice = async (mac: string): Promise<DiscoveredMiner | undefined> => {
  try {
    const discoveredMiner = await findOne<DiscoveredMiner>("pluto_discovery", `devices:discovered`, mac);

    if (discoveredMiner) {
      logger.info(`Discovered miner found in devices:discovered for MAC: ${mac}`);
      return discoveredMiner;
    } else {
      logger.info(`No discovered miner found in devices:discovered for MAC: ${mac}`);
      return undefined;
    }
  } catch (error) {
    logger.error(`Error during devices:discovered lookup for MAC: ${mac}`, error);
    throw error;
  }
};

/**
 * Lookup multiple discovered miners by MAC addresses, IPs, or hostnames.
 */
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
}): Promise<DiscoveredMiner[]> => {
  try {
    const discoveredMiners = await findMany<DiscoveredMiner>("pluto_discovery", `devices:discovered`, (discoveredMiner) => {
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
        if (!matchWithPartial(discoveredMiner.mac, macs, partialMatch.macs || "both")) {
          return false;
        }
      }

      // Matching per IP addresses
      if (ips && ips.length > 0) {
        if (!matchWithPartial(discoveredMiner.ip, ips, partialMatch.ips || "both")) {
          return false;
        }
      }

      // Matching per Hostnames
      if (hostnames && hostnames.length > 0) {
        const hostname = discoveredMiner.minerData.hostname ?? discoveredMiner.ip;
        if (!matchWithPartial(hostname, hostnames, partialMatch.hostnames || "both")) {
          return false;
        }
      }

      return true;
    });

    return discoveredMiners.filter(Boolean) as DiscoveredMiner[];
  } catch (error) {
    logger.error("Error during multiple discovered miners lookup", error);
    throw error;
  }
};
