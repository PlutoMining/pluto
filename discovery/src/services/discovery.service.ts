/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { findMany, findOne, insertOne, updateOne } from "@pluto/db";
import type { DiscoveredMiner, MinerData } from "@pluto/interfaces";
import { logger } from "@pluto/logger";
import { config } from "../config/environment";
import { ArpScanResult, arpScan, getActiveNetworkInterfaces } from "./arpScanWrapper";
import { ConcurrencyLimiter } from "./concurrency-limiter.service";
import { DeviceConverterService } from "./device-converter.service";
import { MinerValidationService } from "./miner-validation.service";
import { nativeMinerDetector } from "./native-detector.service";
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
  logger.info(`[discovery] ${ip}: trying native driver first`);
  const nativeResult = await nativeMinerDetector.detect(ip);
  if (nativeResult) {
    const deviceMac = mac || nativeResult.mac || "unknown";
    const discoveredMiner = DeviceConverterService.createDiscoveredMiner(
      ip,
      deviceMac,
      null,
      null,
      nativeResult.minerData,
      "native"
    );
    logger.info(
      `[discovery] ${ip}: discovered via native driver (${nativeResult.type}), supportLevel=native`
    );
    await storeDiscoveredMiner(discoveredMiner);
    return [discoveredMiner];
  }

  logger.info(`[discovery] ${ip}: no native match, falling back to pyasic-bridge (generic)`);
  const validationResult = await MinerValidationService.validateSingleIp(ip);

  if (!validationResult || !validationResult.is_miner) {
    logger.info(
      `[discovery] ${ip}: not a miner (pyasic-bridge)${
        validationResult?.error ? `: ${validationResult.error}` : ""
      }`
    );
    return [];
  }

  const minerData = await MinerValidationService.fetchMinerData(ip);
  const deviceMac = mac || minerData?.mac || "unknown";

  const discoveredMiner = DeviceConverterService.createDiscoveredMiner(
    ip,
    deviceMac,
    validationResult,
    null,
    minerData,
    "generic"
  );

  logger.info(
    `[discovery] ${ip}: discovered via pyasic-bridge (generic), model=${validationResult.model ?? "unknown"}, supportLevel=generic`
  );

  await storeDiscoveredMiner(discoveredMiner);
  return [discoveredMiner];
}

/**
 * Maps raw mock `/api/system/info` data to canonical MinerData.
 */
function mapMockInfoToMinerData(ip: string, raw: Record<string, unknown>): MinerData {
  return {
    ip,
    mac: raw.mac as string | undefined,
    hostname: raw.hostname as string | undefined,
    deviceInfo:
      raw.make || raw.model || raw.firmware || raw.algo
        ? {
            make: (raw.make as string) ?? undefined,
            model: (raw.model as string) ?? undefined,
            firmware: (raw.firmware as string) ?? undefined,
            algo: (raw.algo as string) ?? undefined,
          }
        : undefined,
    serialNumber: (raw.serial_number as string) ?? undefined,
    hashrate: raw.hashrate != null ? { rate: raw.hashrate as number } : undefined,
    expectedHashrate: raw.expected_hashrate != null ? { rate: raw.expected_hashrate as number } : undefined,
    wattage: (raw.wattage as number) ?? undefined,
    wattageLimit: (raw.wattage_limit as number) ?? undefined,
    voltage: (raw.voltage as number) ?? undefined,
    temperatureAvg: (raw.temperature_avg as number) ?? undefined,
    envTemp: (raw.env_temp as number) ?? undefined,
    sharesAccepted: (raw.shares_accepted as number) ?? undefined,
    sharesRejected: (raw.shares_rejected as number) ?? undefined,
    bestDifficulty: (raw.best_difficulty as string) ?? undefined,
    bestSessionDifficulty: (raw.best_session_difficulty as string) ?? undefined,
    networkDifficulty: (raw.network_difficulty as number) ?? undefined,
    fans: Array.isArray(raw.fans)
      ? (raw.fans as { speed?: number }[]).map((f) => ({ speed: f.speed ?? undefined }))
      : undefined,
    hashboards: Array.isArray(raw.hashboards)
      ? (raw.hashboards as Record<string, unknown>[]).map((h) => ({
          slot: (h.slot as number) ?? undefined,
          hashrate: h.hashrate != null ? { rate: h.hashrate as number } : undefined,
          temp: (h.temp as number) ?? undefined,
          chipTemp: (h.chip_temp as number) ?? undefined,
          chips: (h.chips as number) ?? undefined,
          expectedChips: (h.expected_chips as number) ?? undefined,
          active: (h.active as boolean) ?? undefined,
          voltage: (h.voltage as number) ?? undefined,
        }))
      : undefined,
    totalChips: (raw.total_chips as number) ?? undefined,
    expectedChips: (raw.expected_chips as number) ?? undefined,
    expectedHashboards: (raw.expected_hashboards as number) ?? undefined,
    expectedFans: (raw.expected_fans as number) ?? undefined,
    isMining: (raw.is_mining as boolean) ?? undefined,
    uptime: (raw.uptime as number) ?? undefined,
    nominal: (raw.nominal as boolean) ?? undefined,
    efficiency: raw.efficiency != null ? { rate: raw.efficiency as number } : undefined,
    pools:
      raw.pool_url
        ? {
            groups: [
              {
                pools: [{ url: raw.pool_url as string, user: (raw.pool_user as string) ?? undefined }],
              },
            ],
          }
        : undefined,
    fwVer: (raw.fw_ver as string) ?? undefined,
    apiVer: (raw.api_ver as string) ?? undefined,
    datetime: (raw.datetime as string) ?? undefined,
    timestamp: (raw.timestamp as number) ?? undefined,
  };
}

/**
 * Discovers mock devices by fetching their data directly from the mock
 * HTTP API, bypassing pyasic-bridge validation entirely.
 *
 * Mock miners don't speak a real miner protocol, so pyasic cannot
 * validate them. Instead we hit each mock's `/api/system/info` endpoint
 * and map the response into a DiscoveredMiner.
 */
async function discoverMockDevices(): Promise<DiscoveredMiner[]> {
  try {
    logger.info(`Fetching mock device list from ${config.mockDiscoveryHost}/servers`);
    const res = await fetch(`${config.mockDiscoveryHost}/servers`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      throw new Error(`Mock discovery service returned ${res.status}`);
    }

    const data = await res.json();
    if (!data || !Array.isArray(data.servers)) {
      logger.warn("Mock discovery service returned invalid response format");
      return [];
    }

    logger.info(`Mock servers retrieved: ${data.servers.length} found.`);

    // Discovery runs with host networking, so it fetches mock data via the
    // listing host (localhost).  The stored IP may differ (e.g. host.docker.internal)
    // so that the backend (bridge network) can reach the mock later.
    const fetchHost = config.mockDiscoveryHost.replace(/^https?:\/\//, "").replace(/:\d+$/, "");

    // Phase 1: Fetch data from all mocks in parallel (HTTP is safe to parallelize)
    const fetchResults = await Promise.allSettled(
      data.servers.map(async (server: any, index: number) => {
        const fetchIp = `${fetchHost}:${server.port}`;

        const storageIp = config.mockDeviceHost
          ? `${config.mockDeviceHost}:${server.port}`
          : fetchIp;

        const mac =
          UtilsService.mockMacFromPort(server.port) ??
          `ff:ff:ff:ff:ff:${(index + 1).toString(16).padStart(2, "0")}`;

        const infoUrl = `http://${fetchIp}/api/system/info`;
        const infoRes = await fetch(infoUrl, { signal: AbortSignal.timeout(3000) });
        if (!infoRes.ok) {
          logger.warn(`Mock device ${fetchIp} returned ${infoRes.status} from /api/system/info`);
          return null;
        }

        const raw: Record<string, unknown> = await infoRes.json();
        const minerData = mapMockInfoToMinerData(storageIp, raw);

        const discoveredMiner = DeviceConverterService.createDiscoveredMiner(
          storageIp,
          mac,
          null,
          null,
          minerData,
          "generic"
        );

        logger.info(
          `[discovery] ${storageIp}: mock device discovered directly (fetched via ${fetchIp}), model=${minerData.deviceInfo?.model ?? "unknown"}, supportLevel=generic`
        );
        return discoveredMiner;
      })
    );

    // Phase 2: Store results sequentially (LevelDB doesn't handle concurrent writes)
    const miners: DiscoveredMiner[] = [];
    for (const r of fetchResults) {
      if (r.status === "fulfilled" && r.value) {
        try {
          await storeDiscoveredMiner(r.value);
          miners.push(r.value);
        } catch (err) {
          logger.warn(`Failed to store mock device ${r.value.ip}:`, err instanceof Error ? err.message : err);
          miners.push(r.value);
        }
      } else if (r.status === "rejected") {
        logger.warn(`Failed to fetch mock device data:`, r.reason);
      }
    }

    logger.info(`Mock device discovery complete: ${miners.length} device(s) discovered.`);
    return miners;
  } catch (error) {
    logger.error(
      `Error discovering mock devices:`,
      error instanceof Error ? error.message : error
    );
    return [];
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
  const remainingIps: string[] = [];

  logger.info(`[discovery] Chunk: ${chunk.length} IPs (${chunk.join(", ")})`);

  logger.info(`[discovery] Phase 1: trying native driver for ${chunk.length} IP(s) in parallel`);
  const nativeResults = await Promise.allSettled(
    chunk.map(async (ip) => {
      const arpDevice = ipToArpDevice.get(ip);
      if (!arpDevice) {
        logger.warn(`No ARP device found for IP: ${ip}`);
        return { ip, arpDevice: null, nativeResult: null };
      }
      const nativeResult = await nativeMinerDetector.detect(ip);
      return { ip, arpDevice, nativeResult };
    })
  );

  for (const settled of nativeResults) {
    if (settled.status !== "fulfilled") continue;
    const { ip, arpDevice, nativeResult } = settled.value;
    if (!arpDevice) continue;

    if (nativeResult) {
      const storageIp = arpDevice.ip;
      const discoveredMiner = DeviceConverterService.createDiscoveredMiner(
        storageIp,
        nativeResult.mac || arpDevice.mac,
        null,
        arpDevice,
        nativeResult.minerData,
        "native"
      );
      chunkMiners.push(discoveredMiner);
      logger.info(
        `[discovery] ${storageIp}: discovered via native driver (${nativeResult.type}), supportLevel=native`
      );
      await storeDiscoveredMiner(discoveredMiner);
    } else {
      remainingIps.push(ip);
    }
  }

  // Phase 2: Fallback remaining IPs to pyasic-bridge batch validation
  if (remainingIps.length === 0) {
    logger.info(`[discovery] Phase 2: skipped (all IPs matched native)`);
    return chunkMiners;
  }

  logger.info(
    `[discovery] Phase 2: ${remainingIps.length} IP(s) did not match native, validating via pyasic-bridge (generic): ${remainingIps.join(", ")}`
  );
  try {
    const validationResults = await MinerValidationService.validateBatch(remainingIps);
    logger.info(`Received validation results for chunk: ${validationResults.length} results`);

    for (const result of validationResults) {
      if (!result.is_miner) {
        logger.debug(`Device ${result.ip} is not a supported miner: ${result.error || "unknown reason"}`);
        continue;
      }

      const arpDevice = ipToArpDevice.get(result.ip);
      if (!arpDevice) {
        logger.warn(`No ARP device found for validated IP: ${result.ip}`);
        continue;
      }

      const storageIp = arpDevice.ip;
      const minerData = await MinerValidationService.fetchMinerData(result.ip);

      const discoveredMiner = DeviceConverterService.createDiscoveredMiner(
        storageIp,
        arpDevice.mac,
        result,
        arpDevice,
        minerData,
        "generic"
      );

      chunkMiners.push(discoveredMiner);
      logger.info(
        `[discovery] ${storageIp}: discovered via pyasic-bridge (generic), model=${result.model ?? "unknown"}, supportLevel=generic`
      );
      await storeDiscoveredMiner(discoveredMiner);
    }

    return chunkMiners;
  } catch (error) {
    logger.error(`Error processing validation chunk:`, error);
    if (error instanceof Error) {
      logger.error(`Chunk error details: ${error.message} (${error.name})`);
    }
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

    // Apply IP filter if specified
    let filteredArpTable = arpTable;
    if (options?.ip && options.partialMatch) {
      filteredArpTable = arpTable.filter((device: ArpScanResult) =>
        device.ip.includes(options.ip!)
      );
    }

    const validDevices = filteredArpTable.filter((device: ArpScanResult) => device.ip);

    if (validDevices.length === 0 && !config.detectMockDevices) {
      logger.info(
        options?.ip ? `No devices found with IP: ${options.ip}` : "No valid devices found."
      );
      return [];
    }

    // Process real devices with chunking and concurrency control
    logger.info(`Processing ${validDevices.length} real device(s) for validation`);
    const discoveredMiners = await processNonMockDevices(validDevices);

    // Discover mock devices separately (bypass pyasic-bridge validation)
    if (config.detectMockDevices) {
      try {
        const mockMiners = await discoverMockDevices();
        discoveredMiners.push(...mockMiners);
        logger.info(`Total devices after mock discovery: ${discoveredMiners.length}`);
      } catch (error) {
        logger.warn(
          `Failed to discover mock devices, continuing without them:`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }

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
        const hostname = discoveredMiner.minerData?.hostname ?? discoveredMiner.ip;
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
