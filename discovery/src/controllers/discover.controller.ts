/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { Request, Response } from "express";
import * as discoveryService from "../services/discovery.service";
import { logger } from "@pluto/logger";

export const discoverDevices = async (req: Request, res: Response) => {
  try {
    const discoveredMiners = await discoveryService.discoverDevices({
      ip: req.query.ip as string | undefined,
      mac: req.query.mac as string | undefined,
      partialMatch: false,
    });
    res.json(discoveredMiners);
  } catch (error) {
    logger.error("Error in /discover request:", error);
    res.status(500).json({ error: "Failed to discover devices" });
  }
};

export const getDiscoveredDevices = async (req: Request, res: Response) => {
  try {
    // Recupera i parametri dalla query string
    const macs = req.query.macs ? (req.query.macs as string).split(",") : [];
    const ips = req.query.ips ? (req.query.ips as string).split(",") : [];
    const hostnames = req.query.hostnames ? (req.query.hostnames as string).split(",") : [];

    // Recupera il matching parziale dalla query string
    const partialMatch = {
      macs: (req.query.partialMacs as "left" | "right" | "both" | "none") || "both",
      ips: (req.query.partialIps as "left" | "right" | "both" | "none") || "both",
      hostnames: (req.query.partialHostnames as "left" | "right" | "both" | "none") || "both",
    };

    // Chiamata al servizio di discovery con i parametri corretti
    const data = await discoveryService.lookupMultipleDiscoveredDevices({
      macs,
      ips,
      hostnames,
      partialMatch,
    });

    // Risposta con i dati filtrati
    res.status(200).json(data);
  } catch (error) {
    logger.error("Error in discoverDevices request:", error);
    res.status(500).json({ error: "Discovery service failed" });
  }
};
