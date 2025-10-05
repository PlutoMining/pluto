/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { Router } from "express";
import {
  createPreset,
  getPresets,
  deletePreset,
  getPreset,
} from "../controllers/presets.controller";

const router = Router();

router.get("/presets", getPresets);
router.get("/presets/:id", getPreset);
router.post("/presets", createPreset);
router.delete("/presets/:id", deletePreset);

export default router;
