/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { Router } from "express";
import { getSystemInfo, patchSystemInfo, restartSystem } from "../controllers/system.controller";

const router = Router();

// Rotta per ottenere le informazioni di sistema
router.get("/api/system/info", getSystemInfo);

// Rotta per aggiornare le informazioni di sistema
router.patch("/api/system", patchSystemInfo);

// Rotta per riavviare il sistema
router.post("/api/system/restart", restartSystem);

export default router;

// /api/devices-proxy/:id/system/info => /api/system/info
