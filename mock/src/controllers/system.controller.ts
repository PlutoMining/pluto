/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
 */

import { Request, Response } from "express";
import { MockMinerContext } from "../contexts/mock-miner-context";

export const getSystemInfo = async (req: Request, res: Response) => {
  try {
    const context: MockMinerContext<unknown> | undefined = req.app.locals.mockContext;

    if (!context) {
      res.status(500).json({ error: "MockMinerContext not initialised" });
      return;
    }

    const systemInfo = context.getSystemInfo();
    res.json(systemInfo);
  } catch (error) {
    console.error("[Mock Service] Error in getSystemInfo:", error);
    res.status(500).json({
      error: "Failed to retrieve system info",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

export const patchSystemInfo = async (req: Request, res: Response) => {
  try {
    const updatedInfo = req.body as Record<string, unknown>;

    const context: MockMinerContext<unknown> | undefined = req.app.locals.mockContext;

    if (!context) {
      res.status(500).json({ error: "MockMinerContext not initialised" });
      return;
    }

    context.patchSystemInfo(updatedInfo as any);
    res.status(200).json({ message: "System info updated successfully" });
  } catch (_error) {
    res.status(500).json({ error: "Failed to update system info" });
  }
};

export const restartSystem = async (req: Request, res: Response) => {
  try {
    req.app.locals.isRestarting = true;

    res.setHeader("Content-Type", "text/html");
    res.status(200).send("<html><body><h1>System will restart shortly.</h1></body></html>");

    setTimeout(() => {
      req.app.locals.isRestarting = false;
      console.log("System has restarted and is available again.");
    }, 5000);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

/**
 * Root route handler for miner detection.
 * Delegates to the strategy's getRootHtml() method.
 */
export const getRoot = async (req: Request, res: Response) => {
  const context: MockMinerContext<unknown> | undefined = req.app.locals.mockContext;
  const html = context?.getRootHtml() ?? "";
  res.setHeader("Content-Type", "text/html");
  res.status(200).send(html);
};
