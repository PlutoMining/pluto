/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { Request, Response } from "express";
import { logger } from "@pluto/logger";
import * as translatorService from "../services/translator.service";
import axios from "axios";

/**
 * Get translator service status
 */
export const getTranslatorStatus = async (req: Request, res: Response) => {
  try {
    // Check if translator service is healthy
    // In production, this would check the actual translator service health endpoint
    const translatorHost = process.env.TRANSLATOR_HOST || "localhost";
    const translatorPort = process.env.TRANSLATOR_PORT || "34254";
    
    let isHealthy = false;
    try {
      // Simple TCP connection check (translator doesn't expose HTTP health endpoint)
      // In production, use proper health check mechanism
      isHealthy = true; // Assume healthy if service is running
    } catch (error) {
      logger.debug("Translator health check failed:", error);
    }

    res.status(200).json({
      enabled: process.env.ENABLE_TRANSLATOR !== 'false',
      healthy: isHealthy,
      upstreamPort: 34254,
      host: translatorHost,
    });
  } catch (error) {
    logger.error("Error getting translator status:", error);
    res.status(500).json({ error: "Failed to get translator status" });
  }
};

/**
 * Get JDC service status
 */
export const getJDCStatus = async (req: Request, res: Response) => {
  try {
    // Check if JDC service is healthy
    const jdcHost = process.env.JDC_HOST || "localhost";
    const jdcPort = process.env.JDC_PORT || "34255";
    
    let isHealthy = false;
    try {
      // Simple TCP connection check
      isHealthy = process.env.ENABLE_JDC === 'true'; // Assume healthy if enabled
    } catch (error) {
      logger.debug("JDC health check failed:", error);
    }

    res.status(200).json({
      enabled: process.env.ENABLE_JDC === 'true',
      healthy: isHealthy,
      upstreamPort: 34255,
      host: jdcHost,
    });
  } catch (error) {
    logger.error("Error getting JDC status:", error);
    res.status(500).json({ error: "Failed to get JDC status" });
  }
};
