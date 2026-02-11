/**
 * Safe accessors for MinerData (device.minerData) so components don't rely on device.info.
 * Use these instead of reading device.info.* (legacy Device model).
 */

import type { DiscoveredMiner } from "@pluto/interfaces";

type MinerData = DiscoveredMiner["minerData"];

/* ---------- Identification ------------------------------------------------ */

export function getHostname(m: MinerData | undefined | null): string {
  return m?.hostname ?? "unknown";
}

export function getModel(m: MinerData | undefined | null): string {
  return m?.model ?? m?.device_info?.model ?? "unknown";
}

export function getFirmware(m: MinerData | undefined | null): string {
  return m?.fw_ver ?? m?.firmware ?? m?.device_info?.firmware ?? "unknown";
}

/* ---------- Performance --------------------------------------------------- */

export function getHashrateGhs(m: MinerData | undefined | null): number {
  return m?.hashrate?.rate ?? 0;
}

/* ---------- Shares / Difficulty ------------------------------------------- */

export function getBestDifficulty(m: MinerData | undefined | null): string {
  return m?.best_difficulty ?? "0";
}

export function getBestSessionDifficulty(m: MinerData | undefined | null): string {
  return m?.best_session_difficulty ?? "0";
}

export function getSharesAccepted(m: MinerData | undefined | null): number {
  const v = m?.shares_accepted;
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export function getSharesRejected(m: MinerData | undefined | null): number {
  const v = m?.shares_rejected;
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/* ---------- Uptime -------------------------------------------------------- */

export function getUptime(m: MinerData | undefined | null): number {
  return m?.uptime ?? 0;
}

/* ---------- Temperature / Power ------------------------------------------- */

export function getTemperatureAvg(m: MinerData | undefined | null): number | undefined {
  const v = m?.temperature_avg;
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

export function getWattage(m: MinerData | undefined | null): number | undefined {
  const v = m?.wattage;
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/* ---------- Hashboards (temp, chip_temp per board) ------------------------- */

function readHashboardTemps(m: MinerData | undefined | null): Array<{ temp?: number; chip_temp?: number }> {
  const boards = m?.hashboards;
  if (!Array.isArray(boards)) return [];
  return boards.map((b) => ({
    temp: typeof b?.temp === "number" && Number.isFinite(b.temp) ? b.temp : undefined,
    chip_temp: typeof b?.chip_temp === "number" && Number.isFinite(b.chip_temp) ? b.chip_temp : undefined,
  }));
}

/** Max board temp (temp) across all hashboards. */
export function getMaxHashboardTempFromHashboards(m: MinerData | undefined | null): number | undefined {
  const temps = readHashboardTemps(m)
    .map((t) => t.temp)
    .filter((v): v is number => v != null);
  return temps.length > 0 ? Math.max(...temps) : undefined;
}

/** Max chip temp across all hashboards. */
export function getMaxChipTempFromHashboards(m: MinerData | undefined | null): number | undefined {
  const temps = readHashboardTemps(m)
    .map((t) => t.chip_temp)
    .filter((v): v is number => v != null);
  return temps.length > 0 ? Math.max(...temps) : undefined;
}

/** Best single temp for heatmap: temperature_avg, or max of hashboard temp/chip_temp. */
export function getEffectiveTempForHeatmap(m: MinerData | undefined | null): number | undefined {
  const avg = getTemperatureAvg(m);
  const boardMax = getMaxHashboardTempFromHashboards(m);
  const chipMax = getMaxChipTempFromHashboards(m);
  const candidates = [avg, boardMax, chipMax].filter((v): v is number => v != null && Number.isFinite(v));
  return candidates.length > 0 ? Math.max(...candidates) : undefined;
}

/* ---------- Extra config (e.g. Bitaxe: frequency, free_heap, min_fan_speed) --- */

function getExtraConfig(m: MinerData | undefined | null): Record<string, unknown> | null | undefined {
  const ec = m?.config?.extra_config;
  return ec && typeof ec === "object" && !Array.isArray(ec) ? (ec as Record<string, unknown>) : undefined;
}

/** Frequency in MHz from config.extra_config.frequency (e.g. Bitaxe). */
export function getExtraConfigFrequency(m: MinerData | undefined | null): number | undefined {
  const v = getExtraConfig(m)?.frequency;
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/** Free heap in bytes from config.extra_config.free_heap (e.g. Bitaxe). */
export function getExtraConfigFreeHeapBytes(m: MinerData | undefined | null): number | undefined {
  const v = getExtraConfig(m)?.free_heap;
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/** Core voltage in volts from config.extra_config.core_voltage (Bitaxe uses millivolts). */
export function getExtraConfigCoreVoltageVolts(m: MinerData | undefined | null): number | undefined {
  const v = getExtraConfig(m)?.core_voltage as number | undefined;
  if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
  // Bitaxe reports core_voltage in millivolts; convert to volts for charts.
  return v / 1000;
}

/** Core voltage in millivolts from config.extra_config.core_voltage (return as-is). */
export function getExtraConfigCoreVoltage(m: MinerData | undefined | null): number | undefined {
  const v = getExtraConfig(m)?.core_voltage as number | undefined;
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/* ---------- Stratum/Pool Config ------------------------------------------- */

/** Extract stratum URL from config.pools.groups[0].pools[0].url */
export function getStratumUrl(m: MinerData | undefined | null): string {
  const url = m?.config?.pools?.groups?.[0]?.pools?.[0]?.url;
  return typeof url === "string" ? url : "";
}

/** Parse port from stratum URL (e.g., `stratum+tcp://pool:3333` → `3333`) */
export function getStratumPort(m: MinerData | undefined | null): number | undefined {
  const url = getStratumUrl(m);
  if (!url) return undefined;

  try {
    // Handle stratum+tcp://pool:port format
    const match = url.match(/:(\d+)(?:\/|$)/);
    if (match) {
      const port = parseInt(match[1], 10);
      return Number.isFinite(port) && port > 0 ? port : undefined;
    }
  } catch {
    // Ignore parsing errors
  }

  return undefined;
}

/** Extract stratum user from config.pools.groups[0].pools[0].user (without worker suffix) */
export function getStratumUser(m: MinerData | undefined | null): string {
  const user = m?.config?.pools?.groups?.[0]?.pools?.[0]?.user;
  if (typeof user !== "string") return "";

  // Remove worker suffix if present (e.g., "user.worker" → "user")
  const dotIndex = user.indexOf(".");
  return dotIndex === -1 ? user : user.substring(0, dotIndex);
}

/** Extract stratum password from config.pools.groups[0].pools[0].password */
export function getStratumPassword(m: MinerData | undefined | null): string {
  const password = m?.config?.pools?.groups?.[0]?.pools?.[0]?.password;
  return typeof password === "string" ? password : "";
}

/* ---------- Extra Config Fields ------------------------------------------- */

/** Fanspeed from config.extra_config.fanspeed */
export function getExtraConfigFanspeed(m: MinerData | undefined | null): number | undefined {
  const v = getExtraConfig(m)?.fanspeed;
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/** Autofanspeed from config.extra_config.autofanspeed (returns 0 or 1) */
export function getExtraConfigAutofanspeed(m: MinerData | undefined | null): number {
  const v = getExtraConfig(m)?.autofanspeed;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "number" && Number.isFinite(v)) return v !== 0 ? 1 : 0;
  return 0;
}

/** Flipscreen from config.extra_config.flipscreen (returns 0 or 1) */
export function getExtraConfigFlipscreen(m: MinerData | undefined | null): number {
  const v = getExtraConfig(m)?.flipscreen;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "number" && Number.isFinite(v)) return v !== 0 ? 1 : 0;
  return 0;
}

/** Invertfanpolarity from config.extra_config.invertfanpolarity (returns 0 or 1) */
export function getExtraConfigInvertfanpolarity(m: MinerData | undefined | null): number {
  const v = getExtraConfig(m)?.invertfanpolarity;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "number" && Number.isFinite(v)) return v !== 0 ? 1 : 0;
  return 0;
}
