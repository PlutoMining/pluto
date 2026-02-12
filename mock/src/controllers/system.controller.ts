/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { Request, Response } from "express";
import { generateSystemInfo, generateSystemInfoAlt } from "../services/mock.service";
import { DeviceApiVersion } from "../types/axeos.types";
import { MockMinerContext } from "../contexts/mock-miner-context";

// Funzione per calcolare l'uptime
const calculateUptime = (startTime: Date): number => {
  const currentTime = new Date();
  const uptimeMs = currentTime.getTime() - startTime.getTime();
  const uptimeSeconds = Math.floor(uptimeMs / 1000);
  return uptimeSeconds;
};

export const getSystemInfo = async (req: Request, res: Response) => {
  try {
    const context: MockMinerContext<unknown> | undefined = req.app.locals.mockContext;

    if (!context) {
      // Fallback to legacy behaviour if context is missing for any reason.
      const hostname = req.app.locals.hostname;
      const apiVersion = req.app.locals.apiVersion;
      const uptimeSeconds = calculateUptime(req.app.locals.startTime);
      const systemInfo =
        apiVersion === DeviceApiVersion.Legacy
          ? generateSystemInfo(hostname, uptimeSeconds, req.app.locals.systemInfo)
          : generateSystemInfoAlt(hostname, uptimeSeconds, req.app.locals.systemInfo);
      res.json(systemInfo);
      return;
    }

    const systemInfo = context.getSystemInfo();
    res.json(systemInfo);
  } catch (error) {
    // Log the actual error for debugging
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
      // Legacy fallback: keep the previous behaviour if context is not present.
      if (!req.app.locals.systemInfo) {
        req.app.locals.systemInfo = {};
      }

      req.app.locals.systemInfo = {
        ...req.app.locals.systemInfo,
        ...updatedInfo,
      };

      res.status(200).json({ message: "System info updated successfully" });
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
    // Imposta il flag di riavvio
    req.app.locals.isRestarting = true;

    // Invia la risposta HTML immediatamente
    res.setHeader("Content-Type", "text/html");
    res.status(200).send("<html><body><h1>System will restart shortly.</h1></body></html>");

    // Simula un tempo di "riavvio" di 5 secondi
    setTimeout(() => {
      req.app.locals.isRestarting = false;
      console.log("System has restarted and is available again.");
    }, 5000); // 5 secondi di timeout
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

/**
 * Root route handler for miner detection.
 *
 * Delegates to the strategy's getRootHtml() method to get miner-specific HTML.
 * This allows each miner type to provide its own root HTML response.
 */
export const getRoot = async (req: Request, res: Response) => {
  const context: MockMinerContext<unknown> | undefined = req.app.locals.mockContext;

  // Get HTML from strategy
  const html = context?.getRootHtml() ?? "";
  res.setHeader("Content-Type", "text/html");
  res.status(200).send(html);
};

