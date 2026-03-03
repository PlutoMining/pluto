/**
 * Safe accessors for MinerData (device.minerData) so components don't rely on device.info.
 * Use these instead of reading device.info.* (legacy Device model).
 */

import type { MinerData } from "@pluto/interfaces";

/* ---------- Identification ------------------------------------------------ */

export function getHostname(m: MinerData | undefined | null): string {
  return m?.hostname ?? "unknown";
}

export function getModel(m: MinerData | undefined | null): string {
  return m?.deviceInfo?.model ?? "unknown";
}

export function getFirmware(m: MinerData | undefined | null): string {
  return m?.fwVer ?? m?.deviceInfo?.firmware ?? "unknown";
}

/* ---------- Performance --------------------------------------------------- */

export function getHashrateGhs(m: MinerData | undefined | null): number {
  return m?.hashrate?.rate ?? 0;
}

/* ---------- Shares / Difficulty ------------------------------------------- */

export function getBestDifficulty(m: MinerData | undefined | null): string {
  return m?.bestDifficulty ?? "0";
}

export function getBestSessionDifficulty(m: MinerData | undefined | null): string {
  return m?.bestSessionDifficulty ?? "0";
}

export function getSharesAccepted(m: MinerData | undefined | null): number {
  const v = m?.sharesAccepted;
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export function getSharesRejected(m: MinerData | undefined | null): number {
  const v = m?.sharesRejected;
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/* ---------- Uptime -------------------------------------------------------- */

export function getUptime(m: MinerData | undefined | null): number {
  return m?.uptime ?? 0;
}

/* ---------- Temperature / Power ------------------------------------------- */

export function getTemperatureAvg(m: MinerData | undefined | null): number | undefined {
  const v = m?.temperatureAvg;
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

export function getWattage(m: MinerData | undefined | null): number | undefined {
  const v = m?.wattage;
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/* ---------- Hashboards (temp, chipTemp per board) ------------------------- */

function readHashboardTemps(m: MinerData | undefined | null): Array<{ temp?: number; chipTemp?: number }> {
  const boards = m?.hashboards;
  if (!Array.isArray(boards)) return [];
  return boards.map((b) => ({
    temp: typeof b?.temp === "number" && Number.isFinite(b.temp) ? b.temp : undefined,
    chipTemp: typeof b?.chipTemp === "number" && Number.isFinite(b.chipTemp) ? b.chipTemp : undefined,
  }));
}

export function getMaxHashboardTempFromHashboards(m: MinerData | undefined | null): number | undefined {
  const temps = readHashboardTemps(m)
    .map((t) => t.temp)
    .filter((v): v is number => v != null);
  return temps.length > 0 ? Math.max(...temps) : undefined;
}

export function getMaxChipTempFromHashboards(m: MinerData | undefined | null): number | undefined {
  const temps = readHashboardTemps(m)
    .map((t) => t.chipTemp)
    .filter((v): v is number => v != null);
  return temps.length > 0 ? Math.max(...temps) : undefined;
}

export function getEffectiveTempForHeatmap(m: MinerData | undefined | null): number | undefined {
  const avg = getTemperatureAvg(m);
  const boardMax = getMaxHashboardTempFromHashboards(m);
  const chipMax = getMaxChipTempFromHashboards(m);
  const candidates = [avg, boardMax, chipMax].filter((v): v is number => v != null && Number.isFinite(v));
  return candidates.length > 0 ? Math.max(...candidates) : undefined;
}

/* ---------- Bitaxe-specific typed accessors -------------------------------- */

export function getBitaxeFrequency(m: MinerData | undefined | null): number | undefined {
  return m?.bitaxe?.frequency;
}

export function getBitaxeFreeHeapBytes(m: MinerData | undefined | null): number | undefined {
  return m?.bitaxe?.freeHeap;
}

export function getBitaxeCoreVoltageVolts(m: MinerData | undefined | null): number | undefined {
  const v = m?.bitaxe?.coreVoltage;
  if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
  return v / 1000;
}

export function getBitaxeCoreVoltage(m: MinerData | undefined | null): number | undefined {
  return m?.bitaxe?.coreVoltage;
}

export function getBitaxeVrTemp(m: MinerData | undefined | null): number | undefined {
  return m?.bitaxe?.vrTemp;
}

export function getBitaxeWifiRSSI(m: MinerData | undefined | null): number | undefined {
  return m?.bitaxe?.wifiRSSI;
}

export function getBitaxeBlockHeight(m: MinerData | undefined | null): number | undefined {
  return m?.bitaxe?.blockHeight;
}

export function getBitaxeNetworkDifficulty(m: MinerData | undefined | null): number | undefined {
  return m?.bitaxe?.networkDifficulty;
}

export function getBitaxeFreeHeapInternal(m: MinerData | undefined | null): number | undefined {
  return m?.bitaxe?.freeHeapInternal;
}

export function getBitaxeCoreVoltageActual(m: MinerData | undefined | null): number | undefined {
  return m?.bitaxe?.coreVoltageActual;
}

export function getBitaxeExpectedHashrate(m: MinerData | undefined | null): number | undefined {
  return m?.bitaxe?.expectedHashrate;
}

export function getBitaxeHashRate10m(m: MinerData | undefined | null): number | undefined {
  return m?.bitaxe?.hashRate10m;
}

export function getBitaxeHashRate1h(m: MinerData | undefined | null): number | undefined {
  return m?.bitaxe?.hashRate1h;
}

/* ---------- Bitaxe Fan / Display accessors -------------------------------- */

export function getBitaxeFanspeed(m: MinerData | undefined | null): number | undefined {
  return m?.bitaxe?.fanspeed;
}

export function getBitaxeAutofanspeed(m: MinerData | undefined | null): number {
  const v = m?.bitaxe?.autofanspeed;
  return typeof v === "number" && Number.isFinite(v) ? (v !== 0 ? 1 : 0) : 0;
}

export function getBitaxeFlipscreen(m: MinerData | undefined | null): number {
  return m?.bitaxe?.rotation != null && m.bitaxe.rotation !== 0 ? 1 : 0;
}

/* ---------- Stratum/Pool Config ------------------------------------------- */

export function getStratumUrl(m: MinerData | undefined | null): string {
  const url = m?.pools?.groups?.[0]?.pools?.[0]?.url;
  return typeof url === "string" ? url : "";
}

export function getStratumPort(m: MinerData | undefined | null): number | undefined {
  const url = getStratumUrl(m);
  if (!url) return undefined;

  try {
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

export function getStratumUser(m: MinerData | undefined | null): string {
  const user = m?.pools?.groups?.[0]?.pools?.[0]?.user;
  if (typeof user !== "string") return "";

  const dotIndex = user.indexOf(".");
  return dotIndex === -1 ? user : user.substring(0, dotIndex);
}

export function getStratumPassword(m: MinerData | undefined | null): string {
  const password = m?.pools?.groups?.[0]?.pools?.[0]?.password;
  return typeof password === "string" ? password : "";
}

