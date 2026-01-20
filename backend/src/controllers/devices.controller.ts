/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { logger } from "@pluto/logger";
import { Request, Response } from "express";
import * as deviceService from "../services/device.service";
import * as presetsService from "../services/presets.service";
import { Device, DeviceFrequencyOptions, DeviceVoltageOptions } from "@pluto/interfaces";
import axios from "axios";

function resolveAsicModelKey(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const bmMatch = trimmed.match(/BM\d{4}/);
  return bmMatch?.[0] ?? trimmed;
}

const WRITABLE_SYSTEM_FIELDS = [
  "hostname",
  "frequency",
  "coreVoltage",
  "flipscreen",
  "invertscreen",
  "invertfanpolarity",
  "autofanspeed",
  "fanspeed",
  "stratumURL",
  "stratumPort",
  "stratumUser",
  "stratumPassword",
  "wifiPassword",
  "wifiPass",
  "autoscreenoff",
  "overheat_temp",
] as const;

function pickWritableSystemInfo(info: unknown) {
  const raw = (info ?? {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  for (const key of WRITABLE_SYSTEM_FIELDS) {
    if (raw[key] !== undefined) out[key] = raw[key];
  }

  const coerceNumber = (value: unknown) => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const n = Number(value);
      return Number.isFinite(n) ? n : undefined;
    }
    return undefined;
  };

  const coerceNumberField = (key: string) => {
    if (out[key] === undefined) return;
    const n = coerceNumber(out[key]);
    if (n === undefined) {
      delete out[key];
      return;
    }
    out[key] = n;
  };

  coerceNumberField("frequency");
  coerceNumberField("coreVoltage");
  coerceNumberField("stratumPort");
  coerceNumberField("fanspeed");
  coerceNumberField("overheat_temp");
  coerceNumberField("autoscreenoff");

  return out;
}

export const discoverDevices = async (req: Request, res: Response) => {
  try {
    const data = await deviceService.discoverDevices({
      ip: req.query.ip as string | undefined,
      mac: req.query.mac as string | undefined,
    });
    res.status(200).json(data);
  } catch (error) {
    logger.error("Error in discoverDevices request:", error);
    res.status(500).json({ error: "Discovery service failed" });
  }
};

export const getDiscoveredDevices = async (req: Request, res: Response) => {
  try {
    // Estrai i parametri di query dalla richiesta
    const macs = req.query.macs ? (req.query.macs as string).split(",") : [];
    const ips = req.query.ips ? (req.query.ips as string).split(",") : [];
    const hostnames = req.query.hostnames ? (req.query.hostnames as string).split(",") : [];

    // Estrai i parametri di matching parziale dalla query, con valore di default 'both'
    const partialMatch = {
      macs: (req.query.partialMacs as "left" | "right" | "both" | "none") || "both",
      ips: (req.query.partialIps as "left" | "right" | "both" | "none") || "both",
      hostnames: (req.query.partialHostnames as "left" | "right" | "both" | "none") || "both",
    };

    // Chiamata al servizio per cercare i dispositivi scoperti
    const data = await deviceService.lookupMultipleDiscoveredDevices({
      macs,
      ips,
      hostnames,
      partialMatch,
    });

    // Invia la risposta con i dati dei dispositivi
    res.status(200).json(data);
  } catch (error) {
    logger.error("Error in getDiscoveredDevices request:", error);
    res.status(500).json({ error: "Discovery service failed" });
  }
};

export const imprintDevices = async (req: Request, res: Response) => {
  const { macs }: { macs: string[] } = req.body;

  try {
    const data = await deviceService.imprintDevices(macs);

    if (data.length === 0) {
      return res.status(404).json({ message: "No devices found for the provided MAC addresses" });
    }

    res.status(200).json({ message: "Devices imprint successful", data });
  } catch (error) {
    logger.error("Error in imprintDevices request:", error);
    res.status(500).json({ error: "Failed to process the request" });
  }
};

export const imprintDevice = async (req: Request, res: Response) => {
  const { mac }: { mac: string } = req.body;
  try {
    const imprinted = await deviceService.getImprintedDevices();
    const data = await deviceService.imprintDevices([
      ...new Set([...imprinted.map((d) => d.mac), mac]),
    ]);

    if (data.length === 0) {
      return res.status(404).json({ message: "No devices found for the provided MAC addresses" });
    }

    res.status(200).json({
      message: "Devices imprint successful",
      data: data,
    });
  } catch (error) {
    logger.error("Error in imprintDevices request:", error);
    res.status(500).json({ error: "Failed to process the request" });
  }
};

export const getImprintedDevices = async (req: Request, res: Response) => {
  try {
    const qRaw = req.query.q;
    const q = typeof qRaw === "string" ? qRaw : undefined;

    const data = await deviceService.getImprintedDevices({ q });

    const enrichedDevices = data.map((device) => {
      const modelKey = resolveAsicModelKey((device as any)?.info?.ASICModel);
      const mappedFrequencyOptions = (modelKey ? DeviceFrequencyOptions[modelKey] : undefined) || [];
      const mappedCoreVoltageOptions = (modelKey ? DeviceVoltageOptions[modelKey] : undefined) || [];

      const frequencyOptions =
        mappedFrequencyOptions.length > 0
          ? mappedFrequencyOptions
          : Array.isArray(device.info.frequencyOptions)
          ? device.info.frequencyOptions
          : [];

      const coreVoltageOptions =
        mappedCoreVoltageOptions.length > 0
          ? mappedCoreVoltageOptions
          : Array.isArray(device.info.coreVoltageOptions)
          ? device.info.coreVoltageOptions
          : [];

      return {
        ...device,
        info: {
          ...device.info,
          frequencyOptions,
          coreVoltageOptions,
        },
      };
    });

    res.status(200).json({ message: "Devices retrieved successfully", data: enrichedDevices });
  } catch (error) {
    logger.error("Error in imprintDevices request:", error);
    res.status(500).json({ error: "Failed to process the request" });
  }
};

export const getImprintedDevice = async (req: Request, res: Response) => {
  try {
    const data = await deviceService.getImprintedDevice(req.params.id);

    res.status(200).json({ message: "Device retrieved successfully", data });
  } catch (error) {
    logger.error("Error in getImprintedDevice request:", error);
    res.status(500).json({ error: "Failed to process the request" });
  }
};

export const getDevicesByPresetId = async (req: Request, res: Response) => {
  try {
    const data = await deviceService.getDevicesByPresetId(req.params.presetId);

    res.status(200).json({ message: "Devices by preset retrieved successfully", data });
  } catch (error) {
    logger.error("Error in getDevicesByPresetId request:", error);
    res.status(500).json({ error: "Failed to process the request" });
  }
};

export const patchImprintedDevice = async (req: Request, res: Response) => {
  const { device }: { device: Device } = req.body;

  try {
    const data = await deviceService.patchImprintedDevice(req.params.id, device);

    if (data) {
      res.status(200).json({ message: "Device updated successfully", data });
    } else {
      res.status(404).json({ message: "Device not found", data });
    }
  } catch (error) {
    logger.error("Error in patchImprintedDevice request:", error);
    res.status(500).json({ error: "Failed to process the request" });
  }
};

export const deleteImprintedDevice = async (req: Request, res: Response) => {
  try {
    const data = await deviceService.deleteImprintedDevice(req.params.id);

    if (data) {
      res.status(200).json({ message: "Device deleted successfully", data });
    } else {
      res.status(404).json({ message: "Device not found", data });
    }
  } catch (error) {
    logger.error("Error in deleteImprintedDevice request:", error);
    res.status(500).json({ error: "Failed to process the request" });
  }
};

export const putListenDevices = async (req: Request, res: Response) => {
  try {
    const payload: { macs: string[]; traceLogs?: boolean } = req.body;
    const devices = (await deviceService.getImprintedDevices())?.filter((d) =>
      payload.macs.includes(d.mac)
    );
    const data = await deviceService.listenToDevices(devices, payload.traceLogs);

    res.status(200).json({ message: "Devices listeners set successfully", data });
  } catch (error) {
    logger.error("Error in putListenDevices request:", error);
    res.status(500).json({ error: "Failed to process the request" });
  }
};

export const restartDevice = async (req: Request, res: Response) => {
  try {
    const { id }: { id: string } = req.params as any;

    // Ottieni la lista dei dispositivi e trova il dispositivo corrispondente al MAC
    const devices = await deviceService.getImprintedDevices();

    const device = devices.find((d) => id === d.mac);

    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    // Ottieni l'indirizzo IP del dispositivo
    const deviceIp = device.ip;

    if (!deviceIp) {
      return res.status(400).json({ error: "Device IP not available" });
    }

    // Invia la richiesta di riavvio al dispositivo
    const restartUrl = `http://${deviceIp}/api/system/restart`; // Assumendo che il dispositivo esponga un endpoint /api/system/restart
    const response = await axios.post(restartUrl);

    // Inoltra la risposta del dispositivo al client
    res
      .status(response.status)
      .json({ message: "Device restarted successfully", data: response.data });
  } catch (error) {
    logger.error("Error in restartDevice request:", error);

    // Gestisci errori di Axios separatamente, se necessario
    if (axios.isAxiosError(error)) {
      res.status(error.response?.status || 500).json({
        error: "Failed to restart the device",
        details: error.response?.data || error.message,
      });
    } else {
      res.status(500).json({ error: "Failed to process the request" });
    }
  }
};

export const patchDeviceSystemInfo = async (req: Request, res: Response) => {
  try {
    const { id }: { id: string } = req.params as any;

    logger.info("patchDeviceSystemInfo called", {
      mac: id,
      bodyKeys: Object.keys(req.body || {}),
      hasPresetUuid: !!(req.body as any)?.presetUuid,
      presetUuid: (req.body as any)?.presetUuid,
    });

    // Ottieni la lista dei dispositivi e trova il dispositivo corrispondente al MAC
    const devices = await deviceService.getImprintedDevices();

    const device = devices.find((d) => id === d.mac);

    if (!device) {
      logger.error("Device not found in patchDeviceSystemInfo", { mac: id });
      return res.status(404).json({ error: "Device not found" });
    }

    // Ottieni l'indirizzo IP del dispositivo
    const deviceIp = device.ip;

    if (!deviceIp) {
      logger.error("Device IP not available", { mac: id });
      return res.status(400).json({ error: "Device IP not available" });
    }

    const payload: Device | undefined = req.body as any;
    if (!payload || typeof payload !== "object") {
      throw new Error("Missing payload");
    }

    const originalInfo = (payload as any).info;

    if (payload.presetUuid) {
      const preset = await presetsService.getPreset(payload.presetUuid);

      if (preset) {
        if (!payload.info) {
          payload.info = {} as any;
        }

        logger.info("Applying preset to device", {
          mac: payload.mac,
          presetUuid: payload.presetUuid,
          presetName: preset.name,
          presetPort: preset.configuration.stratumPort,
          presetPortType: typeof preset.configuration.stratumPort,
        });

        // Ensure we forward correct types to the miner API.
        // Bitaxe expects a numeric port; if we pass a string (as stored in presets),
        // the firmware can treat it as 0, effectively disabling the port.
        const presetPort = preset.configuration.stratumPort;

        payload.info.stratumPort =
          typeof presetPort === "number" ? presetPort : Number(presetPort) || 0;
        payload.info.stratumURL = preset.configuration.stratumURL;
        // payload.info.stratumUser = preset.configuration.stratumUser;
        payload.info.stratumPassword = preset.configuration.stratumPassword;

        logger.info("Final system info payload to device", {
          mac: payload.mac,
          stratumPort: payload.info.stratumPort,
          stratumURL: payload.info.stratumURL,
        });
      } else {
        logger.error("Preset not found", { presetUuid: payload.presetUuid });
        return res.status(400).json({ error: "Associated Preset id not available" });
      }
    }

    // Invia la richiesta PATCH per aggiornare le informazioni di sistema
    const patchUrl = `http://${deviceIp}/api/system`; // Assumendo che l'endpoint sia /api/system

    const systemInfoPatch = pickWritableSystemInfo(payload.info ?? originalInfo);
    const infoForLog = (payload.info ?? originalInfo) as any;

    logger.info("Sending PATCH to device", {
      url: patchUrl,
      stratumPort: infoForLog?.stratumPort,
      stratumURL: infoForLog?.stratumURL,
      stratumUser: infoForLog?.stratumUser,
      hasPassword: !!infoForLog?.stratumPassword,
      frequency: (systemInfoPatch as any).frequency,
      coreVoltage: (systemInfoPatch as any).coreVoltage,
    });

    const response = await axios.patch(patchUrl, systemInfoPatch); // Passa solo i campi configurabili nel body

    // Inoltra la risposta del dispositivo al client
    res
      .status(response.status)
      .json({ message: "Device system info updated successfully", data: payload });
  } catch (error) {
    logger.error("Error in putDeviceSystemInfo request:", error);

    // Gestisci errori di Axios separatamente, se necessario
    if (axios.isAxiosError(error)) {
      res.status(error.response?.status || 500).json({
        error: "Failed to update device system info",
        details: error.response?.data || error.message,
      });
    } else {
      res.status(500).json({ error: "Failed to process the request" });
    }
  }
};
