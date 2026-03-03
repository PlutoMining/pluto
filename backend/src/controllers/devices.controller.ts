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
import type { DiscoveredMiner, MinerConfig } from "@pluto/interfaces";
import { driverFactory } from "../drivers";

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
    const macs = req.query.macs ? (req.query.macs as string).split(",") : [];
    const ips = req.query.ips ? (req.query.ips as string).split(",") : [];
    const hostnames = req.query.hostnames ? (req.query.hostnames as string).split(",") : [];

    const partialMatch = {
      macs: (req.query.partialMacs as "left" | "right" | "both" | "none") || "both",
      ips: (req.query.partialIps as "left" | "right" | "both" | "none") || "both",
      hostnames: (req.query.partialHostnames as "left" | "right" | "both" | "none") || "both",
    };

    const data = await deviceService.lookupMultipleDiscoveredDevices({
      macs,
      ips,
      hostnames,
      partialMatch,
    });

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

    res.status(200).json({ message: "Devices retrieved successfully", data });
  } catch (error) {
    logger.error("Error in getImprintedDevices request:", error);
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
  const { device }: { device: DiscoveredMiner } = req.body;

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

    const devices = await deviceService.getImprintedDevices();
    const device = devices.find((d) => id === d.mac);

    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    const deviceIp = device.ip;
    if (!deviceIp) {
      return res.status(400).json({ error: "Device IP not available" });
    }

    const driver = driverFactory.getDriverForDevice(device.type, device.mac);
    await driver.restart(deviceIp);

    res.status(200).json({ message: "Device restarted successfully", data: device });
  } catch (error) {
    logger.error("Error in restartDevice request:", error);

    if (error instanceof Error) {
      res.status(500).json({
        error: "Failed to restart the device",
        details: error.message,
      });
    } else {
      res.status(500).json({ error: "Failed to process the request" });
    }
  }
};

export const validateDeviceSystemInfo = async (req: Request, res: Response) => {
  try {
    const { id }: { id: string } = req.params as any;

    logger.info("validateDeviceSystemInfo called", {
      mac: id,
      bodyKeys: Object.keys(req.body || {}),
    });

    const devices = await deviceService.getImprintedDevices();
    const device = devices.find((d) => id === d.mac);

    if (!device) {
      logger.error("Device not found in validateDeviceSystemInfo", { mac: id });
      return res.status(404).json({ error: "Device not found" });
    }

    const deviceIp = device.ip;
    if (!deviceIp) {
      logger.error("Device IP not available", { mac: id });
      return res.status(400).json({ error: "Device IP not available" });
    }

    const configPatch: MinerConfig = req.body as MinerConfig;

    if (!configPatch || typeof configPatch !== "object") {
      return res.status(400).json({ error: "Invalid config payload" });
    }

    logger.info("Validating config for miner via driver", {
      ip: deviceIp,
      configKeys: Object.keys(configPatch),
    });

    const driver = driverFactory.getDriverForDevice(device.type, device.mac);
    const validationResult = await driver.validateConfig(deviceIp, configPatch);

    res.status(200).json(validationResult);
  } catch (error) {
    logger.error("Error in validateDeviceSystemInfo request:", error);

    if (error instanceof Error) {
      if (error.message.includes("validation")) {
        return res.status(400).json({
          valid: false,
          errors: [error.message],
        });
      }
      res.status(500).json({
        error: "Failed to validate device system info",
        details: error.message,
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
    });

    const devices = await deviceService.getImprintedDevices();
    const device = devices.find((d) => id === d.mac);

    if (!device) {
      logger.error("Device not found in patchDeviceSystemInfo", { mac: id });
      return res.status(404).json({ error: "Device not found" });
    }

    const deviceIp = device.ip;
    if (!deviceIp) {
      logger.error("Device IP not available", { mac: id });
      return res.status(400).json({ error: "Device IP not available" });
    }

    const configPatch: MinerConfig = req.body as MinerConfig;

    if (!configPatch || typeof configPatch !== "object") {
      return res.status(400).json({ error: "Invalid config payload" });
    }

    logger.info("Sending config update to miner via driver", {
      ip: deviceIp,
      configKeys: Object.keys(configPatch),
    });

    const driver = driverFactory.getDriverForDevice(device.type, device.mac);
    await driver.updateConfig(deviceIp, configPatch);

    const updatedDevice: DiscoveredMiner = {
      ...device,
      minerData: {
        ...(device.minerData ?? ({} as DiscoveredMiner["minerData"])),
      },
    };

    const savedDevice = await deviceService.patchImprintedDevice(id, updatedDevice);

    res.status(200).json({
      message: "Device system info updated successfully",
      data: savedDevice,
    });
  } catch (error) {
    logger.error("Error in patchDeviceSystemInfo request:", error);

    if (error instanceof Error) {
      res.status(500).json({
        error: "Failed to update device system info",
        details: error.message,
      });
    } else {
      res.status(500).json({ error: "Failed to process the request" });
    }
  }
};

export const getDeviceConfigForm = async (req: Request, res: Response) => {
  try {
    const { id }: { id: string } = req.params as any;

    const devices = await deviceService.getImprintedDevices();
    const device = devices.find((d) => id === d.mac);

    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    const driver = driverFactory.getDriverForDevice(device.type, device.mac);
    const schema = driver.getConfigSchema();
    const values = driver.getEditableValues(device.minerData);

    res.status(200).json({ schema, values });
  } catch (error) {
    logger.error("Error in getDeviceConfigForm request:", error);

    if (error instanceof Error) {
      res.status(500).json({
        error: "Failed to get device config form",
        details: error.message,
      });
    } else {
      res.status(500).json({ error: "Failed to process the request" });
    }
  }
};
