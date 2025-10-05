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
        `Bypassing ARP discovery and directly attempting feature detection for IP: ${options.ip}`
      );

      try {
        const response = await axios.get(`http://${options.ip}/api/system/info`, {
          timeout: 1000,
        });

        logger.info(`Received response from ${options.ip}:`, response.data);

        if (response.data && response.data.ASICModel) {
          const deviceInfo: Device = {
            ip: options.ip,
            mac: response.data.mac || options?.mac || "unknown",
            type: "unknown",
            info: response.data,
          };

          logger.info(`Device ${options.ip} with ASICModel detected and added to the list.`);

          try {
            // Tenta di inserire il dispositivo
            await insertOne<Device>(
              "pluto_discovery",
              "devices:discovered",
              deviceInfo.mac,
              deviceInfo
            );
            logger.info(`Device ${options.ip} inserted successfully.`);
          } catch (error) {
            if (error instanceof Error && error.message.includes("already exists")) {
              // Se l'inserimento fallisce, effettua un aggiornamento
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
          logger.info(`Device ${options.ip} does not contain ASICModel, skipping.`);
          return [];
        }
      } catch (error) {
        if (error instanceof axios.AxiosError) {
          if (error.code === "ECONNABORTED") {
            logger.error(`Request to ${options.ip} timed out.`);
          } else {
            logger.error(`Failed to make request to ${options.ip}:`, error.message);
          }
        } else {
          logger.error(
            `Unexpected error while making request to ${options.ip}:`,
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
          ip: config.mockDiscoveryHost.replace(/https?:\/\/(.+)(\:.+)$/, `$1:${server.port}`),
          mac: `ff:ff:ff:ff:ff:${(index + 1).toString(16).padStart(2, "0")}`,
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

    for (const element of validDevices) {
      logger.info(`Attempting to connect to device with IP: ${element.ip} and MAC: ${element.mac}`);

      try {
        const response = await axios.get(`http://${element.ip}/api/system/info`, { timeout: 1000 });

        logger.info(`Received response from ${element.ip}:`, response.data);

        if (response.data && response.data.ASICModel) {
          const deviceInfo: Device = {
            ip: element.ip,
            mac: element.mac,
            type: element.type,
            info: response.data,
          };

          devices.push(deviceInfo);
          logger.info(`Device ${element.ip} with ASICModel added to the list.`);

          try {
            // Tenta di inserire il dispositivo
            await insertOne<Device>(
              "pluto_discovery",
              "devices:discovered",
              element.mac,
              deviceInfo
            );
            logger.info(`Device ${element.ip} inserted successfully.`);
          } catch (error) {
            if (error instanceof Error && error.message.includes("already exists")) {
              // Se l'inserimento fallisce, effettua un aggiornamento
              logger.info(`Device ${element.ip} already exists, updating...`);
              await updateOne<Device>(
                "pluto_discovery",
                "devices:discovered",
                element.mac,
                deviceInfo
              );
            } else {
              throw error;
            }
          }
        } else {
          logger.info(`Device ${element.ip} does not contain ASICModel, skipping.`);
        }
      } catch (error) {
        if (error instanceof axios.AxiosError) {
          if (error.code === "ECONNABORTED") {
            logger.error(`Request to ${element.ip} timed out.`);
          } else {
            logger.error(`Failed to make request to ${element.ip}:`, error.message);
          }
        } else {
          logger.error(
            `Unexpected error while making request to ${element.ip}:`,
            error instanceof Error ? error.message : String(error)
          );
        }
      }
    }

    logger.info(`Discovery completed. ${devices.length} devices found with ASICModel.`);
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
