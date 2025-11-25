/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { Request, Response } from "express";
import { register } from "../services/metrics.service"; // Importa il registry delle metriche

// Metodo esistente per leggere i file JSON dalla directory
export const getMetrics = async (req: Request, res: Response) => {
  try {
    res.setHeader("Content-Type", register.contentType);
    res.end(await register.metrics());
  } catch (_err) {
    res.status(500).end("Failed to collect metrics");
  }
};
