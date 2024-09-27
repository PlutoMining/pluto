import { deleteOne, findMany, findOne, insertOne, updateOne } from "@pluto/db";
import { Device } from "@pluto/interfaces";
import { logger } from "@pluto/logger";
import axios from "axios";
import { config } from "../config/environment";
import { updateOriginalIpsListeners } from "./tracing.service";

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
  ip?: string;
  mac?: string;
  partialMatch?: boolean; // Opzione per ricerche parziali sull'IP
}

// Funzione per iniziare ad ascoltare i dispositivi
export const getImprintedDevices = async (options?: DiscoveryOptions): Promise<Device[]> => {
  try {
    const devices = await findMany<Device>("pluto_core", "devices:imprinted", (d) => {
      if (options?.ip) {
        if (options.partialMatch) {
          return d.ip.includes(options.ip);
        } else {
          return d.ip === options.ip;
        }
      }
      return true;
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
    const preset = await updateOne<Device>("pluto_core", "devices:imprinted", id, objectValue);

    return preset;
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
