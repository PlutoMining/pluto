/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import type { MinerData } from "@pluto/pyasic-bridge-client";
import { logger } from "@pluto/logger";
import client from "prom-client";
import { extractHostnameFromMinerData, extractModelFromMinerData } from "./tracing.helpers";

/** Read a numeric field from extra_config. Standard is snake_case (same as MinerData). */
function readExtraConfigNumber(
  extraConfig: unknown,
  key: string
): number | null {
  if (extraConfig == null || typeof extraConfig !== "object" || Array.isArray(extraConfig)) return null;
  const v = (extraConfig as Record<string, unknown>)[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * Normalize to SI units (volts or amps) from raw device value.
 * Large values (|v| >= 100) are treated as millivolts/milliamps; smaller as already V/A.
 */
function toSiVoltsOrAmps(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.abs(value) >= 100 ? value / 1000 : value;
}

const poolMap = new Map<string, string>();

poolMap.set("mine.ocean.xyz:3334", "Ocean Main");
poolMap.set("solo.ckpool.org:3333", "CKPool Main");
poolMap.set("solo.ckpool.org:4334", "CKPool High Diff");
poolMap.set("umbrel.local:2018", "Public Pool Local");

const globalRegister = new client.Registry();

// ---------------------------------------------------------------------------
// Per-device label-based metrics
// ---------------------------------------------------------------------------

export interface DeviceLabels {
  device_id: string;
  hostname: string;
  ip: string;
  model: string;
  [key: string]: string;
}

const DEVICE_LABEL_NAMES = ["device_id", "hostname", "ip", "model"] as const;

const powerGauge = new client.Gauge({
  name: "pluto_device_power_watts",
  help: "Current power in watts",
  labelNames: DEVICE_LABEL_NAMES,
  registers: [globalRegister],
});

const voltageGauge = new client.Gauge({
  name: "pluto_device_voltage_volts",
  help: "Current voltage in volts",
  labelNames: DEVICE_LABEL_NAMES,
  registers: [globalRegister],
});

const currentGauge = new client.Gauge({
  name: "pluto_device_current_amps",
  help: "Current current in amps",
  labelNames: DEVICE_LABEL_NAMES,
  registers: [globalRegister],
});

const fanSpeedGauge = new client.Gauge({
  name: "pluto_device_fanspeed_rpm",
  help: "Current fan speed in RPM or %",
  labelNames: DEVICE_LABEL_NAMES,
  registers: [globalRegister],
});

const tempGauge = new client.Gauge({
  name: "pluto_device_temperature_celsius",
  help: "Current temperature in Celsius",
  labelNames: DEVICE_LABEL_NAMES,
  registers: [globalRegister],
});

const vrTempGauge = new client.Gauge({
  name: "pluto_device_vr_temperature_celsius",
  help: "Current voltage regulator temperature in Celsius",
  labelNames: DEVICE_LABEL_NAMES,
  registers: [globalRegister],
});

const hashRateGauge = new client.Gauge({
  name: "pluto_device_hashrate_ghs",
  help: "Current hash rate in GH/s",
  labelNames: DEVICE_LABEL_NAMES,
  registers: [globalRegister],
});

const sharesAcceptedGauge = new client.Gauge({
  name: "pluto_device_shares_accepted",
  help: "Current shares accepted",
  labelNames: DEVICE_LABEL_NAMES,
  registers: [globalRegister],
});

const sharesRejectedGauge = new client.Gauge({
  name: "pluto_device_shares_rejected",
  help: "Current shares rejected",
  labelNames: DEVICE_LABEL_NAMES,
  registers: [globalRegister],
});

const uptimeGauge = new client.Gauge({
  name: "pluto_device_uptime_seconds",
  help: "Current uptime in seconds",
  labelNames: DEVICE_LABEL_NAMES,
  registers: [globalRegister],
});

const freeHeapGauge = new client.Gauge({
  name: "pluto_device_free_heap_bytes",
  help: "Current free heap in bytes",
  labelNames: DEVICE_LABEL_NAMES,
  registers: [globalRegister],
});

const freeHeapInternalGauge = new client.Gauge({
  name: "pluto_device_free_heap_internal_bytes",
  help: "Current free internal heap in bytes",
  labelNames: DEVICE_LABEL_NAMES,
  registers: [globalRegister],
});

const freeHeapSpiramGauge = new client.Gauge({
  name: "pluto_device_free_heap_spiram_bytes",
  help: "Current free PSRAM heap in bytes",
  labelNames: DEVICE_LABEL_NAMES,
  registers: [globalRegister],
});

const coreVoltageGauge = new client.Gauge({
  name: "pluto_device_core_voltage_volts",
  help: "Current core voltage in volts",
  labelNames: DEVICE_LABEL_NAMES,
  registers: [globalRegister],
});

const coreVoltageActualGauge = new client.Gauge({
  name: "pluto_device_core_voltage_actual_volts",
  help: "Current actual core voltage in volts",
  labelNames: DEVICE_LABEL_NAMES,
  registers: [globalRegister],
});

const frequencyGauge = new client.Gauge({
  name: "pluto_device_frequency_mhz",
  help: "Current frequency in MHz",
  labelNames: DEVICE_LABEL_NAMES,
  registers: [globalRegister],
});

const efficiencyGauge = new client.Gauge({
  name: "pluto_device_efficiency",
  help: "Current device efficiency",
  labelNames: DEVICE_LABEL_NAMES,
  registers: [globalRegister],
});

const deviceGauges = [
  powerGauge, voltageGauge, currentGauge, fanSpeedGauge, tempGauge,
  vrTempGauge, hashRateGauge, sharesAcceptedGauge, sharesRejectedGauge,
  uptimeGauge, freeHeapGauge, freeHeapInternalGauge, freeHeapSpiramGauge,
  coreVoltageGauge, coreVoltageActualGauge, frequencyGauge, efficiencyGauge,
];

/**
 * Tracks the last-used labels per device so we can remove the old label
 * combination when hostname/IP/model changes.
 */
const previousLabels = new Map<string, DeviceLabels>();

function buildLabels(deviceId: string, data: Partial<MinerData>): DeviceLabels {
  return {
    device_id: deviceId,
    hostname: extractHostnameFromMinerData(data as MinerData),
    ip: data.ip ?? "unknown",
    model: extractModelFromMinerData(data as MinerData),
  };
}

/**
 * Update per-device Prometheus metrics using label-based Gauges.
 * Automatically handles label changes (hostname/IP/model rename) by removing
 * the old label combination before setting the new one.
 */
export function updateDeviceMetrics(deviceId: string, data: Partial<MinerData>): void {
  const labels = buildLabels(deviceId, data);

  const prev = previousLabels.get(deviceId);
  if (prev && (prev.hostname !== labels.hostname || prev.ip !== labels.ip || prev.model !== labels.model)) {
    logger.info(`Device ${deviceId} labels changed, removing old label set`);
    for (const gauge of deviceGauges) {
      gauge.remove(prev);
    }
  }
  previousLabels.set(deviceId, labels);

  const setGauge = (gauge: client.Gauge<string>, value: unknown) => {
    if (typeof value !== "number" || !Number.isFinite(value)) return;
    gauge.labels(labels).set(value);
  };

  const hashrate =
    (typeof data.hashrate === "object" && data.hashrate !== null && "rate" in data.hashrate
      ? (data.hashrate as { rate?: number }).rate
      : null) ?? 0;

  const fanSpeed = data.fans && data.fans.length > 0 && typeof data.fans[0] === "object" && data.fans[0] !== null && "speed" in data.fans[0]
    ? (data.fans[0] as { speed?: number }).speed
    : null;

  const temp = data.temperature_avg ??
    (data.hashboards && data.hashboards.length > 0 && typeof data.hashboards[0] === "object" && data.hashboards[0] !== null && "temp" in data.hashboards[0]
      ? (data.hashboards[0] as { temp?: number }).temp
      : null);

  const voltage =
    data.voltage ??
    (data.hashboards && data.hashboards.length > 0 && typeof data.hashboards[0] === "object" && data.hashboards[0] !== null && "voltage" in data.hashboards[0]
      ? (data.hashboards[0] as { voltage?: number }).voltage
      : null);

  const vrTemp =
    (data.hashboards && data.hashboards.length > 0 && typeof data.hashboards[0] === "object" && data.hashboards[0] !== null && "chip_temp" in data.hashboards[0]
      ? (data.hashboards[0] as { chip_temp?: number }).chip_temp
      : null) ??
    readExtraConfigNumber(data.config?.extra_config, "vr_temp");

  const current = readExtraConfigNumber(data.config?.extra_config, "current");
  const coreVoltage = readExtraConfigNumber(data.config?.extra_config, "core_voltage");
  const coreVoltageActual = readExtraConfigNumber(data.config?.extra_config, "core_voltage_actual");
  const frequency = readExtraConfigNumber(data.config?.extra_config, "frequency");
  const freeHeap = readExtraConfigNumber(data.config?.extra_config, "free_heap");
  const freeHeapInternal = readExtraConfigNumber(data.config?.extra_config, "free_heap_internal");
  const freeHeapSpiram = readExtraConfigNumber(data.config?.extra_config, "free_heap_spiram");

  setGauge(powerGauge, data.wattage);
  setGauge(voltageGauge, toSiVoltsOrAmps(voltage));
  setGauge(currentGauge, toSiVoltsOrAmps(current));
  setGauge(fanSpeedGauge, fanSpeed);
  setGauge(tempGauge, temp);
  setGauge(vrTempGauge, vrTemp);
  setGauge(hashRateGauge, hashrate);
  setGauge(sharesAcceptedGauge, data.shares_accepted);
  setGauge(sharesRejectedGauge, data.shares_rejected);
  setGauge(uptimeGauge, data.uptime);
  setGauge(freeHeapGauge, freeHeap);
  setGauge(freeHeapInternalGauge, freeHeapInternal);
  setGauge(freeHeapSpiramGauge, freeHeapSpiram);
  setGauge(coreVoltageGauge, toSiVoltsOrAmps(coreVoltage));
  setGauge(coreVoltageActualGauge, toSiVoltsOrAmps(coreVoltageActual));
  setGauge(frequencyGauge, frequency);

  if (typeof data.wattage === "number" && Number.isFinite(data.wattage) && typeof hashrate === "number" && Number.isFinite(hashrate)) {
    const efficiency = data.wattage > 0 && hashrate > 0 ? data.wattage / (hashrate / 1000) : 0;
    efficiencyGauge.labels(labels).set(efficiency);
  }
}

/**
 * Remove all per-device metric label combinations for a given device.
 */
export function removeDeviceMetrics(deviceId: string): void {
  const labels = previousLabels.get(deviceId);
  if (!labels) {
    logger.debug(`No previous labels found for device ${deviceId}, nothing to remove`);
    return;
  }

  try {
    logger.debug(`Removing Prometheus metrics for device ${deviceId}`);
    for (const gauge of deviceGauges) {
      gauge.remove(labels);
    }
    previousLabels.delete(deviceId);
    logger.info(`Prometheus metrics removed for device ${deviceId}`);
  } catch (error) {
    logger.error(`Error removing Prometheus metrics for device ${deviceId}:`, error);
  }
}

/**
 * Reset label tracking state. For use in tests only.
 */
export function _resetMetricsForTesting(): void {
  previousLabels.clear();
  for (const gauge of deviceGauges) {
    gauge.reset();
  }
}

export { globalRegister as register };

// ----------- OVERVIEW METRICS ------------

const totalHardwareGauge = new client.Gauge({
  name: "total_hardware",
  help: "Total number of hardware devices being monitored",
  registers: [globalRegister],
});

const hardwareOnlineGauge = new client.Gauge({
  name: "hardware_online",
  help: "Number of hardware devices online",
  registers: [globalRegister],
});

const hardwareOfflineGauge = new client.Gauge({
  name: "hardware_offline",
  help: "Number of hardware devices offline",
  registers: [globalRegister],
});

const totalHashrateGauge = new client.Gauge({
  name: "total_hashrate",
  help: "Total hashrate in GH/s across all devices",
  registers: [globalRegister],
});

const averageHashrateGauge = new client.Gauge({
  name: "average_hashrate",
  help: "Average hashrate in GH/s across all devices",
  registers: [globalRegister],
});

const totalPowerGauge = new client.Gauge({
  name: "total_power_watts",
  help: "Total power in watts across all devices",
  registers: [globalRegister],
});

const firmwareVersionGauge = new client.Gauge({
  name: "firmware_version_distribution",
  help: "Distribution of firmware versions across devices",
  registers: [globalRegister],
  labelNames: ["version"],
});

const sharesByPoolAcceptedGauge = new client.Gauge({
  name: "shares_by_pool_accepted",
  help: "Total shares accepted by pool",
  registers: [globalRegister],
  labelNames: ["pool"],
});

const sharesByPoolRejectedGauge = new client.Gauge({
  name: "shares_by_pool_rejected",
  help: "Total shares rejected by pool",
  registers: [globalRegister],
  labelNames: ["pool"],
});

const totalEfficiencyGauge = new client.Gauge({
  name: "total_efficiency",
  help: "Total efficiency (hashrate per watt) across all devices",
  registers: [globalRegister],
});

function normalizePoolKey(stratumURL: unknown, stratumPort: unknown) {
  const rawUrl = typeof stratumURL === "string" ? stratumURL.trim() : "";
  const rawPort = typeof stratumPort === "number" ? stratumPort : Number(stratumPort);

  let hostPort = rawUrl;

  hostPort = hostPort.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, "");
  hostPort = hostPort.split("/")[0];

  if (!hostPort) {
    return Number.isFinite(rawPort) ? `unknown:${rawPort}` : "unknown";
  }

  const lastColonIdx = hostPort.lastIndexOf(":");
  if (lastColonIdx > 0 && lastColonIdx < hostPort.length - 1) {
    const possiblePort = Number(hostPort.slice(lastColonIdx + 1));
    if (Number.isFinite(possiblePort)) {
      return `${hostPort.slice(0, lastColonIdx)}:${possiblePort}`;
    }
  }

  if (Number.isFinite(rawPort)) {
    return `${hostPort}:${rawPort}`;
  }

  return hostPort;
}

function extractHashrate(minerData: MinerData | null | undefined): number {
  if (!minerData) return 0;
  if (typeof minerData.hashrate === "object" && minerData.hashrate !== null && "rate" in minerData.hashrate) {
    return (minerData.hashrate as { rate?: number }).rate ?? 0;
  }
  return 0;
}

function extractPoolInfo(minerData: MinerData | null | undefined): { url: string | null; port: number | null } {
  if (!minerData?.config?.pools?.groups?.[0]?.pools?.[0]) {
    return { url: null, port: null };
  }
  const pool = minerData.config.pools.groups[0].pools[0];
  const url = typeof pool === "object" && pool !== null && "url" in pool ? (pool.url as string | null) : null;

  let port: number | null = null;
  if (url) {
    const match = url.match(/:(\d+)/);
    if (match) {
      port = parseInt(match[1], 10);
    }
  }

  return { url, port };
}

export const updateOverviewMetrics = (devicesData: MinerData[]) => {
  const totalDevices = devicesData.length;
  const onlineDevices = totalDevices;
  const offlineDevices = 0;

  const totalHashrate = devicesData.reduce((acc, minerData) => {
    return acc + extractHashrate(minerData);
  }, 0);
  const averageHashrate = totalDevices > 0 ? totalHashrate / totalDevices : 0;

  const totalPower = devicesData.reduce((acc, minerData) => acc + (minerData.wattage ?? 0), 0);
  const efficiency =
    totalPower > 0 && totalHashrate > 0 ? totalPower / (totalHashrate / 1000) : 0;

  totalHardwareGauge.set(totalDevices);
  hardwareOnlineGauge.set(onlineDevices);
  hardwareOfflineGauge.set(offlineDevices);
  totalHashrateGauge.set(totalHashrate);
  averageHashrateGauge.set(averageHashrate);
  totalPowerGauge.set(totalPower);
  totalEfficiencyGauge.set(efficiency);

  firmwareVersionGauge.reset();

  const firmwareCount = devicesData.reduce((acc: { [version: string]: number }, minerData) => {
    const version = minerData.fw_ver ?? minerData.firmware ?? "unknown";
    acc[version] = (acc[version] || 0) + 1;
    return acc;
  }, {});

  Object.entries(firmwareCount).forEach(([version, count]) => {
    firmwareVersionGauge.labels(version).set(count);
  });

  const sharesByPool = devicesData.reduce(
    (
      acc: { accepted: { [pool: string]: number }; rejected: { [pool: string]: number } },
      minerData
    ) => {
      const { url, port } = extractPoolInfo(minerData);
      const poolKey = normalizePoolKey(url, port);
      const pool = poolMap.get(poolKey) || poolKey;
      acc.accepted[pool] = (acc.accepted[pool] || 0) + (minerData.shares_accepted ?? 0);
      acc.rejected[pool] = (acc.rejected[pool] || 0) + (minerData.shares_rejected ?? 0);
      return acc;
    },
    { accepted: {}, rejected: {} }
  );

  Object.entries(sharesByPool.accepted).forEach(([pool, count]) => {
    sharesByPoolAcceptedGauge.labels(pool).set(count);
  });

  Object.entries(sharesByPool.rejected).forEach(([pool, count]) => {
    sharesByPoolRejectedGauge.labels(pool).set(count);
  });
};
