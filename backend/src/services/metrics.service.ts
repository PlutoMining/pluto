/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { PyasicMinerInfo } from "@pluto/interfaces";
import { logger } from "@pluto/logger";
import client from "prom-client";

const poolMap = new Map<string, string>();

poolMap.set("mine.ocean.xyz:3334", "Ocean Main");
poolMap.set("solo.ckpool.org:3333", "CKPool Main");
poolMap.set("solo.ckpool.org:4334", "CKPool High Diff");
poolMap.set("umbrel.local:2018", "Public Pool Local");

// Crea un registro globale per tutte le metriche
const globalRegister = new client.Registry();
// client.collectDefaultMetrics({ register: globalRegister }); // Colleziona metriche di default (memoria, CPU, etc.)

// Helper function to get or create a Gauge metric
const getOrCreateGauge = (name: string, help: string): client.Gauge<string> => {
  const existingMetric = globalRegister.getSingleMetric(name);
  if (existingMetric) {
    if (existingMetric instanceof client.Gauge) {
      logger.debug(`Reusing existing metric: ${name}`);
      return existingMetric;
    }
    // If metric exists but is not a Gauge, remove it and create a new one
    logger.warn(`Metric ${name} exists but is not a Gauge, removing and recreating`);
    globalRegister.removeSingleMetric(name);
  }
  return new client.Gauge({
    name,
    help,
    registers: [globalRegister],
  });
};

// Factory function that returns Prometheus metrics for a given hostname
export const createMetricsForDevice = (hostname: string) => {
  logger.debug(`HOSTNAME: ${hostname}`);

  const prefix = `${hostname}_`; // Prefix for all metrics

  // Define counters and gauges for each data point in the JSON, using the hostname as the prefix
  // Use getOrCreateGauge to avoid duplicate registration errors
  const powerGauge = getOrCreateGauge(
    `${prefix}power_watts`,
    "Current power in watts"
  );

  const voltageGauge = getOrCreateGauge(
    `${prefix}voltage_volts`,
    "Current voltage in volts"
  );

  const currentGauge = getOrCreateGauge(
    `${prefix}current_amps`,
    "Current current in amps"
  );

  const fanSpeedGauge = getOrCreateGauge(
    `${prefix}fanspeed_rpm`,
    "Current fan speed in RPM or %"
  );

  const tempGauge = getOrCreateGauge(
    `${prefix}temperature_celsius`,
    "Current temperature in Celsius"
  );

  const vrTempGauge = getOrCreateGauge(
    `${prefix}vr_temperature_celsius`,
    "Current voltage regulator temperature in Celsius"
  );

  const hashRateGauge = getOrCreateGauge(
    `${prefix}hashrate_ghs`,
    "Current hash rate in GH/s"
  );

  const sharesAcceptedGauge = getOrCreateGauge(
    `${prefix}shares_accepted`,
    "Current shares accepted"
  );

  const sharesRejectedGauge = getOrCreateGauge(
    `${prefix}shares_rejected`,
    "Current shares rejected"
  );

  const uptimeGauge = getOrCreateGauge(
    `${prefix}uptime_seconds`,
    "Current uptime in seconds"
  );

  const freeHeapGauge = getOrCreateGauge(
    `${prefix}free_heap_bytes`,
    "Current free heap in bytes"
  );

  const coreVoltageGauge = getOrCreateGauge(
    `${prefix}core_voltage_volts`,
    "Current core voltage in volts"
  );

  const coreVoltageActualGauge = getOrCreateGauge(
    `${prefix}core_voltage_actual_volts`,
    "Current actual core voltage in volts"
  );

  const frequencyGauge = getOrCreateGauge(
    `${prefix}frequency_mhz`,
    "Current frequency in MHz"
  );

  const efficiencyGauge = getOrCreateGauge(
    `${prefix}efficiency`,
    "Current device efficiency"
  );

  return {
    updatePrometheusMetrics: (data: Partial<PyasicMinerInfo>) => {
      const setGauge = (gauge: client.Gauge<string>, value: unknown, map?: (n: number) => number) => {
        if (typeof value !== "number" || !Number.isFinite(value)) return;
        gauge.set(map ? map(value) : value);
      };

      // Pyasic-bridge normalizes hashrate to Gh/s
      const hashrateGhs =
        data.hashrate?.rate !== undefined && Number.isFinite(data.hashrate.rate)
          ? data.hashrate.rate
          : 0;

      // Extract temperature (use temperature_avg or max from hashboards)
      let temp = data.temperature_avg ?? 0;
      if (!temp && data.hashboards && data.hashboards.length > 0) {
        const temps = data.hashboards.map((h) => h.temp ?? h.chip_temp ?? 0).filter((t) => t > 0);
        temp = temps.length > 0 ? Math.max(...temps) : 0;
      }

      // Extract VR temp (max chip_temp from hashboards)
      let vrTemp = 0;
      if (data.hashboards && data.hashboards.length > 0) {
        const temps = data.hashboards.map((h) => h.chip_temp ?? 0).filter((t) => t > 0);
        vrTemp = temps.length > 0 ? Math.max(...temps) : 0;
      }

      // Extract fan speed (first fan or average)
      const fanSpeed = data.fans && data.fans.length > 0 ? data.fans[0].speed : 0;

      // Extract voltage (average from hashboards or top-level)
      let voltage = data.voltage ?? null;
      if (!voltage && data.hashboards && data.hashboards.length > 0) {
        const voltages = data.hashboards.map((h) => h.voltage ?? 0).filter((v) => v > 0);
        voltage = voltages.length > 0 ? voltages.reduce((a, b) => a + b, 0) / voltages.length : null;
      }

      setGauge(powerGauge, data.wattage);
      setGauge(voltageGauge, voltage, (v) => v / 1000); // Assume voltage in millivolts
      // Current is not available in pyasic schema, leave as 0
      setGauge(currentGauge, 0);
      setGauge(fanSpeedGauge, fanSpeed);
      setGauge(tempGauge, temp);
      setGauge(vrTempGauge, vrTemp);
      setGauge(hashRateGauge, hashrateGhs);
      setGauge(sharesAcceptedGauge, data.shares_accepted);
      setGauge(sharesRejectedGauge, data.shares_rejected);
      setGauge(uptimeGauge, data.uptime);
      // Heap and tuning metrics: read from config.extra_config (pyasic model)
      const extra = data.config?.extra_config as Record<string, unknown> | undefined;
      setGauge(freeHeapGauge, (extra?.free_heap as number) ?? 0);
      setGauge(coreVoltageGauge, (extra?.core_voltage as number) ?? 0);
      setGauge(coreVoltageActualGauge, (extra?.core_voltage_actual as number) ?? 0);
      setGauge(frequencyGauge, (extra?.frequency as number) ?? 0);

      // Use efficiency from pyasic if available, otherwise compute
      if (data.efficiency?.rate !== undefined && Number.isFinite(data.efficiency.rate)) {
        efficiencyGauge.set(data.efficiency.rate);
      } else if (data.wattage && hashrateGhs > 0) {
        const efficiency = data.wattage > 0 && hashrateGhs > 0 ? data.wattage / (hashrateGhs / 1000) : 0;
        efficiencyGauge.set(efficiency);
      }
    },
    register: globalRegister, // Return the registry for further usage
  };
};

// Delete metrics for a given device
export const deleteMetricsForDevice = (hostname: string) => {
  try {
    logger.debug(`Deleting Prometheus metrics for device: ${hostname}`);
    const prefix = `${hostname}_`;
    const metricsToRemove = globalRegister
      .getMetricsAsArray()
      .filter((metric) => metric.name.startsWith(prefix));
    metricsToRemove.forEach((metric) => {
      globalRegister.removeSingleMetric(metric.name);
      logger.debug(`Metric ${metric.name} removed from global register.`);
    });
    logger.info(`All Prometheus metrics for device ${hostname} have been deleted.`);
  } catch (error) {
    logger.error(`Error deleting Prometheus metrics for device ${hostname}:`, error);
  }
};

// Esporta il registro globale per esporre le metriche
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
  labelNames: ["version"], // Usa `version` come label per la versione del firmware
});

// Track previously seen firmware versions to reset stale ones
const seenFirmwareVersions = new Set<string>();

// Metrica per le shares accepted con label `pool`
const sharesByPoolAcceptedGauge = new client.Gauge({
  name: "shares_by_pool_accepted",
  help: "Total shares accepted by pool",
  registers: [globalRegister],
  labelNames: ["pool"], // Usa `pool` come label per identificare il pool
});

const sharesByPoolRejectedGauge = new client.Gauge({
  name: "shares_by_pool_rejected",
  help: "Total shares rejected by pool",
  registers: [globalRegister],
  labelNames: ["pool"], // Usa `pool` come label per identificare il pool
});

// Track previously seen pools to reset stale ones
const seenPools = new Set<string>();

const totalEfficiencyGauge = new client.Gauge({
  name: "total_efficiency",
  help: "Total efficiency (hashrate per watt) across all devices",
  registers: [globalRegister],
});

function extractPoolUrlFromConfig(config: PyasicMinerInfo["config"]): { url: string; port: string } {
  const defaultPool = { url: "", port: "" };

  if (!config?.pools?.groups || config.pools.groups.length === 0) {
    return defaultPool;
  }

  const firstGroup = config.pools.groups[0];
  if (!firstGroup?.pools || firstGroup.pools.length === 0) {
    return defaultPool;
  }

  const pool = firstGroup.pools[0];
  if (!pool?.url) {
    return defaultPool;
  }

  // Parse URL to extract host and port
  try {
    const urlStr = pool.url.replace(/^stratum\+tcp:\/\//i, "");
    const urlParts = urlStr.split("/")[0]; // Remove path

    // Handle malformed URLs with multiple colons (e.g., "example.com:abc:123")
    // by keeping the whole thing as the URL
    const colonCount = (urlParts.match(/:/g) || []).length;
    if (colonCount > 1) {
      return {
        url: urlParts,
        port: "",
      };
    }

    const [host, port] = urlParts.split(":");

    return {
      url: host || "",
      port: port || "",
    };
  } catch {
    return {
      url: pool.url || "",
      port: "",
    };
  }
}

function normalizePoolKey(stratumURL: unknown, stratumPort: unknown) {
  const rawUrl = typeof stratumURL === "string" ? stratumURL.trim() : "";
  const rawPortStr = typeof stratumPort === "string" ? stratumPort.trim() : String(stratumPort);
  const rawPort = typeof stratumPort === "number" ? stratumPort : rawPortStr ? Number(rawPortStr) : NaN;

  let hostPort = rawUrl;

  hostPort = hostPort.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, "");
  hostPort = hostPort.split("/")[0];

  if (!hostPort) {
    return Number.isFinite(rawPort) && rawPort > 0 ? `unknown:${rawPort}` : "unknown";
  }

  // If hostPort doesn't look like a valid hostname/IP, treat as unknown
  // Valid hostnames have dots or are IP addresses, or are at least 4 chars (like "localhost")
  const hasDot = hostPort.includes(".");
  const looksLikeIP = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(hostPort);
  const isJustNumbers = /^\d+$/.test(hostPort);
  if (!hasDot && !looksLikeIP && (isJustNumbers || hostPort.length < 3)) {
    // Numbers-only strings or very short strings without dots are likely invalid (e.g., "123")
    return "unknown";
  }

  const lastColonIdx = hostPort.lastIndexOf(":");
  if (lastColonIdx > 0 && lastColonIdx < hostPort.length - 1) {
    const possiblePort = Number(hostPort.slice(lastColonIdx + 1));
    if (Number.isFinite(possiblePort)) {
      return `${hostPort.slice(0, lastColonIdx)}:${possiblePort}`;
    }
  }

  if (Number.isFinite(rawPort) && rawPort > 0) {
    return `${hostPort}:${rawPort}`;
  }

  return hostPort;
}

// Funzione per aggiornare tutte le metriche di overview
export const updateOverviewMetrics = (
  devicesData: Array<PyasicMinerInfo & { tracing?: boolean }>
) => {
  const totalDevices = devicesData.length;
  const onlineDevices = devicesData.filter((device) => device.tracing).length;
  const offlineDevices = totalDevices - onlineDevices;

  // Pyasic-bridge normalizes hashrate to Gh/s
  const totalHashrate = devicesData.reduce((acc, device) => {
    if (!device.tracing || !device.hashrate?.rate) return acc;
    return acc + device.hashrate.rate;
  }, 0);
  const averageHashrate = totalDevices > 0 ? totalHashrate / totalDevices : 0;

  const totalPower = devicesData.reduce(
    (acc, device) => (device.tracing ? acc + (device.wattage ?? 0) : acc),
    0
  );
  // Fleet efficiency (J/TH) is computed with the same formula used for single devices:
  // efficiency (J / TH) = power (W) / (hashrate GH/s / 1000)
  const efficiency =
    totalPower > 0 && totalHashrate > 0 ? totalPower / (totalHashrate / 1000) : 0;

  // Aggiorna le metriche aggregate
  totalHardwareGauge.set(totalDevices);
  hardwareOnlineGauge.set(onlineDevices);
  hardwareOfflineGauge.set(offlineDevices);
  totalHashrateGauge.set(totalHashrate);
  averageHashrateGauge.set(averageHashrate);
  totalPowerGauge.set(totalPower);
  totalEfficiencyGauge.set(efficiency);

  // Conta il numero di dispositivi per ciascuna versione firmware
  const firmwareCount = devicesData.reduce((acc: { [version: string]: number }, device) => {
    const version = device.fw_ver || device.api_ver || "unknown";
    acc[version] = (acc[version] || 0) + 1;
    return acc;
  }, {});

  // Reset all previously seen firmware versions to 0 to remove stale entries
  seenFirmwareVersions.forEach((version) => {
    firmwareVersionGauge.labels(version).set(0);
  });

  // Clear the set and rebuild it with current versions
  seenFirmwareVersions.clear();

  // Imposta i valori della metrica firmware per ciascuna versione
  Object.entries(firmwareCount).forEach(([version, count]) => {
    seenFirmwareVersions.add(version);
    firmwareVersionGauge.labels(version).set(count);
  });

  // Conta le shares per pool (accepted e rejected)
  const sharesByPool = devicesData.reduce(
    (
      acc: { accepted: { [pool: string]: number }; rejected: { [pool: string]: number } },
      device
    ) => {
      const { url, port } = extractPoolUrlFromConfig(device.config);
      const poolKey = normalizePoolKey(url, port);
      const pool = poolMap.get(poolKey) || poolKey;
      acc.accepted[pool] = (acc.accepted[pool] || 0) + (device.shares_accepted || 0);
      acc.rejected[pool] = (acc.rejected[pool] || 0) + (device.shares_rejected || 0);
      return acc;
    },
    { accepted: {}, rejected: {} }
  );

  // Reset all previously seen pools to 0 to remove stale entries
  seenPools.forEach((pool) => {
    sharesByPoolAcceptedGauge.labels(pool).set(0);
    sharesByPoolRejectedGauge.labels(pool).set(0);
  });

  // Clear the set and rebuild it with current pools
  seenPools.clear();

  // Imposta le shares accepted e rejected per ciascun pool
  Object.entries(sharesByPool.accepted).forEach(([pool, count]) => {
    seenPools.add(pool);
    sharesByPoolAcceptedGauge.labels(pool).set(count);
  });

  Object.entries(sharesByPool.rejected).forEach(([pool, count]) => {
    seenPools.add(pool);
    sharesByPoolRejectedGauge.labels(pool).set(count);
  });
};
