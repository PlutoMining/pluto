import { Request, Response } from "express";
import { register } from "../services/metrics.service"; // Importa il registry delle metriche

// Metodo esistente per leggere i file JSON dalla directory
export const getMetrics = async (req: Request, res: Response) => {
  try {
    res.setHeader("Content-Type", register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end("Failed to collect metrics");
  }
};
