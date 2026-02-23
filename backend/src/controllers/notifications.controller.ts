/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
 */

import type { NotificationSettings } from "@pluto/interfaces";
import { logger } from "@pluto/logger";
import { Request, Response } from "express";
import * as notificationsService from "../services/notifications.service";

export const getNotificationSettings = async (_req: Request, res: Response) => {
  try {
    const data = await notificationsService.getNotificationSettings();
    res.status(200).json({ message: "Notification settings retrieved", data });
  } catch (error) {
    logger.error("Error in getNotificationSettings request:", error);
    res.status(500).json({ error: "Failed to retrieve notification settings" });
  }
};

export const putNotificationSettings = async (req: Request, res: Response) => {
  try {
    const body = req.body as NotificationSettings;
    const data = await notificationsService.putNotificationSettings(body);
    res.status(200).json({ message: "Notification settings saved", data });
  } catch (error) {
    logger.error("Error in putNotificationSettings request:", error);
    res.status(500).json({ error: "Failed to save notification settings" });
  }
};

export const postTestNotification = async (_req: Request, res: Response) => {
  try {
    const result = await notificationsService.sendTestNotification();
    if (!result.sent) {
      return res.status(400).json({ error: result.reason ?? "Test notification was not sent." });
    }
    res.status(200).json({ message: "Test notification sent" });
  } catch (error) {
    logger.error("Error in postTestNotification request:", error);
    res.status(500).json({
      error: "Failed to send test notification. Check backend logs and that the backend can reach the ntfy server.",
    });
  }
};
