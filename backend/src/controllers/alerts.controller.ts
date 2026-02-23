/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
 */

import type { AlertmanagerWebhookPayload } from "@pluto/interfaces";
import { logger } from "@pluto/logger";
import { Request, Response } from "express";
import { config } from "../config/environment";
import * as notificationsService from "@/services/notifications.service";

export const postAlertmanagerWebhook = async (req: Request, res: Response) => {
  const secret = config.alertmanagerWebhookSecret;
  if (secret) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    if (token !== secret) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  try {
    const payload = req.body as AlertmanagerWebhookPayload;
    if (!payload || !Array.isArray(payload.alerts)) {
      return res.status(400).json({ error: "Invalid webhook payload" });
    }

    logger.info("Alert received", { status: payload.status, alertsCount: payload.alerts?.length });
    await notificationsService.processAlertmanagerWebhook(payload);
    res.status(200).json({ message: "OK" });
  } catch (error) {
    logger.error("Error in Alertmanager webhook:", error);
    res.status(500).json({ error: "Failed to process alert" });
  }
};
