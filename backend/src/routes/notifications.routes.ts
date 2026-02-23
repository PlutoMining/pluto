/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
 */

import { Router } from "express";
import {
  getNotificationSettings,
  putNotificationSettings,
  postTestNotification,
} from "../controllers/notifications.controller";

const router = Router();

router.get("/settings/notifications", getNotificationSettings);
router.put("/settings/notifications", putNotificationSettings);
router.post("/settings/notifications/test", postTestNotification);

export default router;
