import { logger } from "@pluto/logger";
import { Request, Response } from "express";
import * as deviceService from "../services/device.service";
import * as presetsService from "../services/presets.service";
import { Device, DeviceFrequencyOptions, DeviceVoltageOptions } from "@pluto/interfaces";
import axios from "axios";

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
    const data = await deviceService.getImprintedDevices({
      ip: req.query.q as string,
      partialMatch: true,
    });

    const enrichedDevices = data.map((device) => {
      const frequencyOptions = DeviceFrequencyOptions[device.info.ASICModel] || [];
      const coreVoltageOptions = DeviceVoltageOptions[device.info.ASICModel] || [];

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

    const payload: Device = req.body;

    if (payload.presetUuid) {
      const preset = await presetsService.getPreset(payload.presetUuid);

      if (preset) {
        payload.info.stratumPort = preset.configuration.stratumPort;
        payload.info.stratumURL = preset.configuration.stratumURL;
        // payload.info.stratumUser = preset.configuration.stratumUser;
        payload.info.stratumPassword = preset.configuration.stratumPassword;
      } else {
        return res.status(400).json({ error: "Associated Preset id not available" });
      }
    }

    // Invia la richiesta PATCH per aggiornare le informazioni di sistema
    const patchUrl = `http://${deviceIp}/api/system`; // Assumendo che l'endpoint sia /api/system
    const response = await axios.patch(patchUrl, payload.info); // Passa i dati nel body

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
