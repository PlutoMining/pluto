import { logger } from "@pluto/logger";
import { Request, Response } from "express";
import * as presetsService from "../services/presets.service";

export const getPresets = async (req: Request, res: Response) => {
  try {
    const data = await presetsService.getPresets();

    res.status(200).json({ message: "Presets retrieved successfully", data });
  } catch (error) {
    logger.error("Error in getPresets request:", error);
    res.status(500).json({ error: "Failed to process the request" });
  }
};

export const getPreset = async (req: Request, res: Response) => {
  try {
    const data = await presetsService.getPreset(req.params.id);
    if (data) {
      res.status(200).json({ message: "Preset retrieved successfully", data });
    } else {
      res.status(404).json({ message: "Preset not found", data });
    }
  } catch (error) {
    logger.error("Error in getPreset request:", error);
    res.status(500).json({ error: "Failed to process the request" });
  }
};

export const createPreset = async (req: Request, res: Response) => {
  try {
    const data = await presetsService.createPreset(req.body);

    res.status(200).json({ message: "Preset created successfully", data });
  } catch (error) {
    logger.error("Error in createPreset request:", error);
    res.status(500).json({ error: "Failed to process the request" });
  }
};

export const deletePreset = async (req: Request, res: Response) => {
  try {
    const data = await presetsService.deletePreset(req.params.id);

    if (data) {
      res.status(200).json({ message: "Preset deleted successfully", data });
    } else {
      res.status(404).json({ message: "Preset not found", data });
    }
  } catch (error) {
    logger.error("Error in deletePresets request:", error);
    res.status(500).json({ error: "Failed to process the request" });
  }
};
