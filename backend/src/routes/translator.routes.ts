/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { Router } from "express";
import {
  getTranslatorStatus,
  getJDCStatus,
} from "../controllers/translator.controller";

const router = Router();

router.get("/translator/status", getTranslatorStatus);
router.get("/jdc/status", getJDCStatus);

export default router;
