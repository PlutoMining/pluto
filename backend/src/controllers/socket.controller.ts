import { Request, Response } from "express";
import { logger } from "@pluto/logger";
import * as socketHandler from "../services/tracing.service";

export const startIoHandler = async (req: Request, res: Response) => {
  try {
    socketHandler.startIoHandler(req.app.get("server"));

    res.status(200).json({
      message: `Socket started listening to devices`,
    });
  } catch (error) {
    logger.error("Error in /listen request:", error);
    res.status(500).json({ error: "Failed to process the request" });
  }
};
