/**
 * Copyright (C) 2026 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
 */

import { Router } from "express";

import { query, queryRange } from "../controllers/prometheus.controller";

const router = Router();

router.get("/prometheus/query", query);
router.get("/prometheus/query_range", queryRange);

export default router;
