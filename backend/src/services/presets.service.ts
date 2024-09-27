import { deleteOne, findMany, findOne, insertOne } from "@pluto/db";
import { Preset } from "@pluto/interfaces";
import { logger } from "@pluto/logger";
import { v7 as uuid } from "uuid";

export const getPresets = async (): Promise<Preset[]> => {
  try {
    const presets = await findMany<Preset>("pluto_core", "presets");

    return presets;
  } catch (error) {
    logger.error("Error in getPresets:", error);
    throw error;
  }
};

export const getPreset = async (id: string): Promise<Preset | null> => {
  try {
    const preset = await findOne<Preset>("pluto_core", "presets", id);

    return preset;
  } catch (error) {
    logger.error("Error in getPresets:", error);
    throw error;
  }
};

export const createPreset = async (payload: Preset): Promise<Preset> => {
  try {
    payload.uuid = uuid();

    const preset = await insertOne<Preset>("pluto_core", "presets", payload.uuid, payload);

    return preset;
  } catch (error) {
    logger.error("Error in getPresets:", error);
    throw error;
  }
};

export const deletePreset = async (id: string): Promise<Preset | null> => {
  try {
    const preset = await deleteOne<Preset>("pluto_core", "presets", id);

    return preset;
  } catch (error) {
    logger.error("Error in getPresets:", error);
    throw error;
  }
};
