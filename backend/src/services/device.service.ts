/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { deleteOne, findMany, findOne, insertOne, updateOne } from "@pluto/db";
import { Device, DeviceInfo } from "@pluto/interfaces";
import { logger } from "@pluto/logger";
import axios from "axios";
import { config } from "../config/environment";
import { updateOriginalIpsListeners } from "./tracing.service";

const cleanDeviceInfo = (deviceInfo: DeviceInfo) => {
  const deviceInfoCopy = { ...deviceInfo };
  if (deviceInfoCopy.stratumPassword) {
    delete deviceInfoCopy.stratumPassword;
  }

  if (deviceInfoCopy.wifiPassword) {
    delete deviceInfoCopy.wifiPassword;
  }

  return deviceInfoCopy;
};

// Funzione per cercare dispositivi scoperti da una lista di MAC address
export const discoverDevices = async ({
  ip,
  mac,
}: {
  ip?: string;
  mac?: string;
} = {}): Promise<Device[]> => {
  try {
    const response = await axios.get(`${config.discoveryServiceHost}/discover`, {
      params: { ip, mac },
    });
    return response.data;
  } catch (error) {
    logger.error("Error during multiple discovered devices lookup", error);
    throw error;
  }
};

// Funzione per cercare dispositivi scoperti tramite il proxy
export const lookupMultipleDiscoveredDevices = async ({
  macs,
  ips,
  hostnames,
  partialMatch = {
    macs: "both",
    ips: "both",
    hostnames: "both",
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
    // Costruzione del query object per Axios
    const params: Record<string, any> = {};

    if (macs && macs.length > 0) {
      params.macs = macs.join(","); // Converte l'array di MAC in una stringa separata da virgole
    }

    if (ips && ips.length > 0) {
      params.ips = ips.join(","); // Converte l'array di IP in una stringa separata da virgole
    }

    if (hostnames && hostnames.length > 0) {
      params.hostnames = hostnames.join(","); // Converte l'array di hostnames in una stringa separata da virgole
    }

    // Aggiungi i parametri di matching parziale alle query string
    if (partialMatch.macs) {
      params.partialMacs = partialMatch.macs;
    }

    if (partialMatch.ips) {
      params.partialIps = partialMatch.ips;
    }

    if (partialMatch.hostnames) {
      params.partialHostnames = partialMatch.hostnames;
    }

    // Chiamata HTTP verso il servizio di discovery con i parametri di query
    const response = await axios.get(`${config.discoveryServiceHost}/discovered`, {
      params, // Passa l'oggetto `params` come query string
    });

    return response.data;
  } catch (error) {
    logger.error("Error during multiple discovered devices lookup", error);
    throw error;
  }
};

// Funzione per imprintare i dispositivi
export const imprintDevices = async (macs: string[]): Promise<Device[]> => {
  try {
    const devices = await lookupMultipleDiscoveredDevices({ macs });

    if (devices.length === 0) {
      logger.info("No devices found for the provided MAC addresses in the 'discovered' list.");
      return []; // Ritorna un array vuoto se nessun dispositivo è stato trovato
    }

    for (const device of devices) {
      const { mac } = device;
      device.info = cleanDeviceInfo(device.info);

      try {
        // Prova ad inserire il dispositivo
        await insertOne<Device>("pluto_core", "devices:imprinted", mac, device);
        logger.info(`Device with MAC ${mac} has been imprinted.`);
      } catch (error) {
        if (error instanceof Error && error.message.includes("already exists")) {
          // Se l'inserimento fallisce perché esiste già, effettua un aggiornamento
          logger.info(`Device with MAC ${mac} already imprinted, updating...`);
          await updateOne<Device>("pluto_core", "devices:imprinted", mac, device);
        } else {
          throw error;
        }
      }
    }

    logger.info(`Successfully imprinted ${devices.length} devices.`);
    return devices; // Restituisce i dispositivi imprintati
  } catch (error) {
    logger.error("Error in imprintDevices:", error);
    throw error;
  }
};

interface DiscoveryOptions {
  q?: string;
}

// Funzione per iniziare ad ascoltare i dispositivi
export const getImprintedDevices = async (options?: DiscoveryOptions): Promise<Device[]> => {
  try {
    const q = options?.q?.trim().toLowerCase();
    const isFullIp = q ? /^\d{1,3}(\.\d{1,3}){3}$/.test(q) : false;

    const devices = await findMany<Device>("pluto_core", "devices:imprinted", (d) => {
      if (!q) return true;

      const ip = d.ip?.toLowerCase() ?? "";
      const mac = d.mac?.toLowerCase() ?? "";
      const hostname = d.info?.hostname?.toLowerCase?.() ?? "";

      if (isFullIp) {
        return ip === q || ip.startsWith(`${q}:`);
      }

      return ip.includes(q) || mac.includes(q) || hostname.includes(q);
    });

    return devices;
  } catch (error) {
    logger.error("Error in listenToDevices:", error);
    throw error;
  }
};

export const getImprintedDevice = async (mac: string): Promise<Device | null> => {
  try {
    const device = await findOne<Device>("pluto_core", "devices:imprinted", mac);
    return device;
  } catch (error) {
    logger.error("Error in getImprintedDevice:", error);
    throw error;
  }
};

export const getDevicesByPresetId = async (presetId: string): Promise<Device[]> => {
  try {
    const devices = await findMany<Device>("pluto_core", "devices:imprinted", (d) => {
      if (d.presetUuid) {
        return d.presetUuid === presetId;
      }
      return false;
    });
    return devices;
  } catch (error) {
    logger.error("Error in getDevicesByPresetId:", error);
    throw error;
  }
};

export const patchImprintedDevice = async (
  id: string,
  objectValue: Device
): Promise<Device | null> => {
  try {
    const payload = { ...objectValue, info: cleanDeviceInfo(objectValue.info) };

    const device = await updateOne<Device>("pluto_core", "devices:imprinted", id, payload);

    return device;
  } catch (error) {
    logger.error("Error in patchImprintedDevice:", error);
    throw error;
  }
};

export const deleteImprintedDevice = async (id: string): Promise<Device | null> => {
  try {
    const preset = await deleteOne<Device>("pluto_core", "devices:imprinted", id);

    return preset;
  } catch (error) {
    logger.error("Error in deleteImprintedDevice:", error);
    throw error;
  }
};

// Funzione per iniziare ad ascoltare i dispositivi
export const listenToDevices = async (
  devices?: Device[],
  traceLogs?: boolean
): Promise<Device[]> => {
  try {
    if (!devices) {
      devices = await findMany<Device>("pluto_core", "devices:imprinted");
    }

    updateOriginalIpsListeners(devices, traceLogs);

    return devices;
  } catch (error) {
    logger.error("Error in listenToDevices:", error);
    throw error;
  }
};
