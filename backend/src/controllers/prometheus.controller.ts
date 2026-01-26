/**
 * Copyright (C) 2026 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
 */

import type { Request, Response } from "express";
import axios from "axios";

import { prometheusQuery, prometheusQueryRange } from "../services/prometheus.service";

export const query = async (req: Request, res: Response) => {
  try {
    const response = await prometheusQuery({
      query: req.query.query,
      time: req.query.time,
    });

    res.status(200).json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      res
        .status(error.response?.status || 500)
        .json(error.response?.data || { status: "error", error: error.message });
      return;
    }

    res.status(400).json({ status: "error", error: (error as Error).message });
  }
};

export const queryRange = async (req: Request, res: Response) => {
  try {
    const response = await prometheusQueryRange({
      query: req.query.query,
      start: req.query.start,
      end: req.query.end,
      step: req.query.step,
    });

    res.status(200).json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      res
        .status(error.response?.status || 500)
        .json(error.response?.data || { status: "error", error: error.message });
      return;
    }

    res.status(400).json({ status: "error", error: (error as Error).message });
  }
};
