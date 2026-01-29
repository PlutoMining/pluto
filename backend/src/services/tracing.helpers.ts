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

export function normalizeSystemInfo(raw: any): any {
  if (!raw || typeof raw !== "object") return raw;

  const bestDiff = pickFirstValue(raw, [
    "bestDiff",
    "best_diff",
    "bestDifficulty",
    "best_difficulty",
  ]);
  const bestSessionDiff = pickFirstValue(raw, [
    "bestSessionDiff",
    "best_session_diff",
    "bestSessionDifficulty",
    "best_session_difficulty",
  ]);
  const currentDiff = pickFirstValue(raw, [
    "currentDiff",
    "current_diff",
    "currentDifficulty",
    "current_difficulty",
    "difficulty",
    "poolDifficulty",
    "pool_difficulty",
  ]);

  const uptimeSeconds =
    pickFirstValue(raw, ["uptimeSeconds", "uptime_seconds", "uptime", "uptime_s"]) ??
    raw.uptimeSeconds;
  const normalizedUptimeSeconds = coerceFiniteNumber(uptimeSeconds);

  const isPSRAMAvailable = pickFirstValue(raw, ["isPSRAMAvailable", "is_psram_available"]);
  const normalizedIsPSRAMAvailable =
    typeof isPSRAMAvailable === "boolean"
      ? isPSRAMAvailable
        ? 1
        : 0
      : coerceFiniteNumber(isPSRAMAvailable);

  const freeHeapInternal = pickFirstValue(raw, ["freeHeapInternal", "free_heap_internal"]);
  const normalizedFreeHeapInternal = coerceFiniteNumber(freeHeapInternal);

  const freeHeapSpiram = pickFirstValue(raw, ["freeHeapSpiram", "free_heap_spiram"]);
  const normalizedFreeHeapSpiram = coerceFiniteNumber(freeHeapSpiram);

  return {
    ...raw,
    ...(bestDiff !== undefined ? { bestDiff } : {}),
    ...(bestSessionDiff !== undefined ? { bestSessionDiff } : {}),
    ...(currentDiff !== undefined ? { currentDiff } : {}),
    ...(normalizedUptimeSeconds !== undefined
      ? { uptimeSeconds: normalizedUptimeSeconds }
      : {}),
    ...(normalizedIsPSRAMAvailable !== undefined ? { isPSRAMAvailable: normalizedIsPSRAMAvailable } : {}),
    ...(normalizedFreeHeapInternal !== undefined ? { freeHeapInternal: normalizedFreeHeapInternal } : {}),
    ...(normalizedFreeHeapSpiram !== undefined ? { freeHeapSpiram: normalizedFreeHeapSpiram } : {}),
  };
}
