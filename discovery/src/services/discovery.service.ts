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
import { ArpScanResult, arpScan, getActiveNetworkInterfaces } from "./arpScanWrapper";
import { ConcurrencyLimiter } from "./concurrency-limiter.service";
import { DeviceConverterService, MinerValidationResult } from "./device-converter.service";
import { MinerValidationService } from "./miner-validation.service";
import { MockDeviceService } from "./mock-device.service";
import { UtilsService } from "./utils.service";

interface DiscoveryOptions {
  ip?: string;
  mac?: string;
  partialMatch?: boolean; // Opzione per ricerche parziali sull'IP
}

export async function discoverDevices(options?: DiscoveryOptions) {
  logger.info("Starting device discovery process...");

  try {
    if (options?.ip && !options.partialMatch) {
      logger.info(
        `Bypassing ARP discovery and directly attempting pyasic validation for IP: ${options.ip}`
      );

      try {
        // Validate using pyasic-bridge
        const validationResponse = await axios.post<MinerValidationResult[]>(
          `${config.pyasicBridgeHost}/miners/validate`,
          { ips: [options.ip] },
          { timeout: config.pyasicValidationTimeout }
        );

        const validationResult = validationResponse.data[0];
        if (!validationResult) {
          logger.info(`No validation result for IP: ${options.ip}`);
          return [];
        }

        if (validationResult.is_miner) {
          // Fetch full miner data
          let minerData: any = {};
          try {
            const dataResponse = await axios.get(
              `${config.pyasicBridgeHost}/miner/${options.ip}/data`,
              { timeout: config.pyasicValidationTimeout }
            );
            minerData = dataResponse.data;
          } catch (error) {
            logger.warn(`Failed to fetch full data for miner ${options.ip}, using minimal data:`, error);
          }

          const deviceInfo = DeviceConverterService.convertMinerInfoToDevice(
            options.ip,
            options?.mac || "unknown",
            validationResult.model,
            undefined,
            minerData
          );

          logger.info(`Device ${options.ip} (${validationResult.model || "unknown model"}) validated and added to the list.`);

          try {
            await insertOne<Device>(
              "pluto_discovery",
              "devices:discovered",
              deviceInfo.mac,
              deviceInfo
            );
            logger.info(`Device ${options.ip} inserted successfully.`);
          } catch (error) {
            if (error instanceof Error && error.message.includes("already exists")) {
              logger.info(`Device ${options.ip} already exists, updating...`);
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

          return [deviceInfo];
        } else {
          logger.info(`Device ${options.ip} is not a supported miner: ${validationResult.error || "unknown reason"}`);
          return [];
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.code === "ECONNABORTED") {
            logger.error(`Request to ${options.ip} timed out.`);
          } else if (error.response) {
            logger.error(`Pyasic-bridge returned error: ${error.response.status} ${error.response.statusText}`);
          } else {
            logger.error(`Failed to validate ${options.ip}:`, error.message);
          }
        } else {
          logger.error(
            `Unexpected error while validating ${options.ip}:`,
            error instanceof Error ? error.message : String(error)
          );
        }
        return [];
      }
    }

    const arpScanInterfaces = await getActiveNetworkInterfaces();

    let arpTable = (
      await Promise.allSettled(
        arpScanInterfaces.map(async (arpScanInterface) => {
          try {
            // Esegui l'ARP scan per l'interfaccia specificata
            const localArpTable = await arpScan(arpScanInterface);
            return localArpTable;
          } catch (error) {
            logger.error(
              `Error retrieving ARP table for interface ${arpScanInterface}:`,
              error instanceof Error ? error.message : String(error)
            );
            // Restituisci un array vuoto in caso di errore per non interrompere l'esecuzione
            return [];
          }
        })
      )
    )
      .filter((result) => result.status === "fulfilled") // Considera solo i risultati che hanno avuto successo
      .map((result) => (result as PromiseFulfilledResult<ArpScanResult[]>).value) // Estrai il valore dai risultati risolti
      .flat();

    if (arpTable.length > 0) {
      logger.info(`ARP table retrieved successfully: ${arpTable.length} devices found.`);
      logger.debug(arpTable);
    } else {
      logger.warn(
        "No devices found in the ARP scan. Verify that your network interfaces are active and have IP addresses assigned."
      );
    }

    if (config.detectMockDevices) {
      const response = await axios.get(`${config.mockDiscoveryHost}/servers`);
      if (response.data && Array.isArray(response.data.servers)) {
        logger.info(`Mock servers retrieved: ${response.data.servers.length} found.`);

        const mockDevices = response.data.servers.map((server: any, index: number) => ({
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

        arpTable = arpTable.concat(mockDevices);
        logger.info(`Mock devices added to the ARP table. Total devices: ${arpTable.length}`);
      } else {
        throw new Error("No mock servers found");
      }
    }

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

    const devices: Device[] = [];

    // Always handle mock devices via dedicated service (skip pyasic-bridge for them).
    const mockDevices = validDevices.filter((device) =>
      MockDeviceService.isMockDevice(device)
    );
    if (mockDevices.length > 0) {
      logger.info(
        `Handling ${mockDevices.length} mock device(s) without pyasic-bridge validation.`
      );
      const handled = await MockDeviceService.handleMockDevices(mockDevices);
      devices.push(...handled);
    }

    const remainingDevices = validDevices.filter(
      (device) => !MockDeviceService.isMockDevice(device)
    );

    // Create a map of IP to ARP scan result for quick lookup for non-mock devices.
    const ipToArpDevice = new Map<string, ArpScanResult>();
    for (const device of remainingDevices) {
      ipToArpDevice.set(device.ip, device);
    }

    // Extract IPs for validation
    const ipsToValidate = Array.from(ipToArpDevice.keys());

    if (ipsToValidate.length === 0) {
      logger.info("No IPs to validate.");
      return devices;
    }

    // Split IPs into chunks
    const chunks = UtilsService.chunkArray(ipsToValidate, config.pyasicValidationBatchSize);
    logger.info(`Split ${ipsToValidate.length} IPs into ${chunks.length} chunks of size ${config.pyasicValidationBatchSize}`);

    // Create concurrency limiter
    const limiter = new ConcurrencyLimiter(config.pyasicValidationConcurrency);

    // Helper function to validate a chunk and store valid miners
    const validateChunk = async (chunk: string[]): Promise<Device[]> => {
      const chunkDevices: Device[] = [];

      logger.info(`Validating chunk of ${chunk.length} IPs: ${chunk.join(", ")}`);

      const validationResults = await MinerValidationService.validateBatch(chunk);
      logger.info(`Received validation results for chunk: ${validationResults.length} results`);

      // Process validation results
      for (const result of validationResults) {
        if (result.is_miner) {
          const arpDevice = ipToArpDevice.get(result.ip);
          if (!arpDevice) {
            logger.warn(`No ARP device found for validated IP: ${result.ip}`);
            continue;
          }

          const storageIp = arpDevice.ip; // Keep original IP (host.docker.internal for mock devices) for storage

          // Fetch full miner data
          const minerData = await MinerValidationService.fetchMinerData(result.ip);

          // Transform MinerInfo to Device format
          const deviceInfo = DeviceConverterService.convertMinerInfoToDevice(
            storageIp,
            arpDevice.mac,
            result.model,
            arpDevice.type,
            minerData
          );

          chunkDevices.push(deviceInfo);
          logger.info(`Device ${storageIp} (${result.model || "unknown model"}) validated and added to the list.`);

          // Store in database immediately (progressive storage)
          try {
            await insertOne<Device>(
              "pluto_discovery",
              "devices:discovered",
              arpDevice.mac,
              deviceInfo
            );
            logger.info(`Device ${storageIp} inserted successfully.`);
          } catch (error) {
            if (error instanceof Error && error.message.includes("already exists")) {
              logger.info(`Device ${storageIp} already exists, updating...`);
              await updateOne<Device>(
                "pluto_discovery",
                "devices:discovered",
                arpDevice.mac,
                deviceInfo
              );
            } else {
              throw error;
            }
          }
        } else {
          logger.debug(`Device ${result.ip} is not a supported miner: ${result.error || "unknown reason"}`);
        }
      }

      return chunkDevices;
    };

    // Process chunks with concurrency limit
    const chunkPromises = chunks.map((chunk) =>
      limiter.execute(() => validateChunk(chunk))
    );

    // Wait for all chunks to complete (using allSettled to continue even if some fail)
    const results = await Promise.allSettled(chunkPromises);

    // Collect all devices from successful chunks
    for (const result of results) {
      if (result.status === "fulfilled") {
        devices.push(...result.value);
      } else {
        logger.error(`Chunk validation failed:`, result.reason);
      }
    }

    logger.info(`Discovery completed. ${devices.length} devices found.`);
    return devices;
  } catch (err) {
    logger.error(err);
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
