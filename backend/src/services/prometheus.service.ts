/**
 * Copyright (C) 2026 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
 */

import axios from "axios";
import { config } from "../config/environment";

const DEFAULT_TIMEOUT_MS = 10_000;
const MIN_STEP_SECONDS = 5;
const MAX_STEP_SECONDS = 60 * 60;
const MAX_RANGE_SECONDS = 60 * 60 * 24 * 7; // 7d
const MAX_POINTS = 11_000;
const MAX_QUERY_LENGTH = 8_000;

function parseUnixSeconds(value: unknown, label: string): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  throw new Error(`Invalid '${label}'`);
}

function parseStepSeconds(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    throw new Error("Invalid 'step'");
  }

  const trimmed = value.trim();
  if (!trimmed) throw new Error("Invalid 'step'");

  // Accept Prometheus duration formats like 15s, 2m, 1h; and raw seconds as number string.
  const durationMatch = trimmed.match(/^([0-9]+)([smh])$/);
  if (durationMatch) {
    const amount = Number(durationMatch[1]);
    const unit = durationMatch[2];
    const factor = unit === "s" ? 1 : unit === "m" ? 60 : 3600;
    return amount * factor;
  }

  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) {
    throw new Error("Invalid 'step'");
  }
  return numeric;
}

function assertQuery(query: unknown): asserts query is string {
  if (typeof query !== "string" || query.trim() === "") {
    throw new Error("Missing 'query'");
  }
  if (query.length > MAX_QUERY_LENGTH) {
    throw new Error("Query too long");
  }
}

function assertRange(start: number, end: number, stepSeconds: number) {
  if (end <= start) {
    throw new Error("Invalid time range: 'end' must be > 'start'");
  }

  const rangeSeconds = end - start;
  if (rangeSeconds > MAX_RANGE_SECONDS) {
    throw new Error("Range too large");
  }

  if (!Number.isFinite(stepSeconds) || stepSeconds <= 0) {
    throw new Error("Invalid 'step'");
  }

  if (stepSeconds < MIN_STEP_SECONDS) {
    throw new Error("Step too small");
  }

  if (stepSeconds > MAX_STEP_SECONDS) {
    throw new Error("Step too large");
  }

  const points = Math.ceil(rangeSeconds / stepSeconds);
  if (points > MAX_POINTS) {
    throw new Error("Too many datapoints");
  }
}

export async function prometheusQuery(params: { query: unknown; time?: unknown }) {
  assertQuery(params.query);

  const time = params.time !== undefined ? parseUnixSeconds(params.time, "time") : undefined;

  return axios.get(`${config.prometheusHost}/api/v1/query`, {
    timeout: DEFAULT_TIMEOUT_MS,
    params: {
      query: params.query,
      ...(time !== undefined ? { time } : {}),
    },
  });
}

export async function prometheusQueryRange(params: {
  query: unknown;
  start: unknown;
  end: unknown;
  step: unknown;
}) {
  assertQuery(params.query);

  const start = parseUnixSeconds(params.start, "start");
  const end = parseUnixSeconds(params.end, "end");
  const stepSeconds = parseStepSeconds(params.step);

  assertRange(start, end, stepSeconds);

  return axios.get(`${config.prometheusHost}/api/v1/query_range`, {
    timeout: DEFAULT_TIMEOUT_MS,
    params: {
      query: params.query,
      start,
      end,
      step: `${stepSeconds}s`,
    },
  });
}
