/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
 */

export function resolveAsicModelKey(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const bmMatch = trimmed.match(/BM\d{4}/);
  return bmMatch?.[0] ?? trimmed;
}

export function pickFirstValue<T = unknown>(obj: any, keys: string[]): T | undefined {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null) return value as T;
  }
  return undefined;
}

export function coerceFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string") {
    const n = Number(value.trim());
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/**
 * @deprecated This function is no longer used. Pyasic-bridge responses are stored directly without transformation.
 * This function is kept for backward compatibility during migration but will be removed in v2.
 */
export function normalizeSystemInfo(raw: any): any {
  // Return raw data as-is (no transformation)
  // Pyasic-bridge already normalizes the data, so we just pass it through
  return raw;
}
