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

// Crea un registro globale per tutte le metriche
const globalRegister = new client.Registry();
// client.collectDefaultMetrics({ register: globalRegister }); // Colleziona metriche di default (memoria, CPU, etc.)

// Factory function that returns Prometheus metrics for a given hostname
export const createMetricsForDevice = (hostname: string) => {
  logger.debug(`HOSTNAME: ${hostname}`);

  const prefix = `${hostname}_`; // Prefix for all metrics

  // Define counters and gauges for each data point in the JSON, using the hostname as the prefix
  const powerGauge = new client.Gauge({
    name: `${prefix}power_watts`,
    help: "Current power in watts",
    registers: [globalRegister],
  });

  const voltageGauge = new client.Gauge({
    name: `${prefix}voltage_volts`,
    help: "Current voltage in volts",
    registers: [globalRegister],
  });

  const currentGauge = new client.Gauge({
    name: `${prefix}current_amps`,
    help: "Current current in amps",
    registers: [globalRegister],
  });

  const fanSpeedGauge = new client.Gauge({
    name: `${prefix}fanspeed_rpm`,
    help: "Current fan speed in RPM or %",
    registers: [globalRegister],
  });

  const tempGauge = new client.Gauge({
    name: `${prefix}temperature_celsius`,
    help: "Current temperature in Celsius",
    registers: [globalRegister],
  });

  const vrTempGauge = new client.Gauge({
    name: `${prefix}vr_temperature_celsius`,
    help: "Current voltage regulator temperature in Celsius",
    registers: [globalRegister],
  });

  const hashRateGauge = new client.Gauge({
    name: `${prefix}hashrate_ghs`,
    help: "Current hash rate in GH/s",
    registers: [globalRegister],
  });

  const sharesAcceptedGauge = new client.Gauge({
    name: `${prefix}shares_accepted`,
    help: "Current shares accepted",
    registers: [globalRegister],
  });

  const sharesRejectedGauge = new client.Gauge({
    name: `${prefix}shares_rejected`,
    help: "Current shares rejected",
    registers: [globalRegister],
  });

  const uptimeGauge = new client.Gauge({
    name: `${prefix}uptime_seconds`,
    help: "Current uptime in seconds",
    registers: [globalRegister],
  });

  const freeHeapGauge = new client.Gauge({
    name: `${prefix}free_heap_bytes`,
    help: "Current free heap in bytes",
    registers: [globalRegister],
  });

  const freeHeapInternalGauge = new client.Gauge({
    name: `${prefix}free_heap_internal_bytes`,
    help: "Current free internal heap in bytes",
    registers: [globalRegister],
  });

  const freeHeapSpiramGauge = new client.Gauge({
    name: `${prefix}free_heap_spiram_bytes`,
    help: "Current free PSRAM heap in bytes",
    registers: [globalRegister],
  });

  const coreVoltageGauge = new client.Gauge({
    name: `${prefix}core_voltage_volts`,
    help: "Current core voltage in volts",
    registers: [globalRegister],
  });

  const coreVoltageActualGauge = new client.Gauge({
    name: `${prefix}core_voltage_actual_volts`,
    help: "Current actual core voltage in volts",
    registers: [globalRegister],
  });

  const frequencyGauge = new client.Gauge({
    name: `${prefix}frequency_mhz`,
    help: "Current frequency in MHz",
    registers: [globalRegister],
  });

  const efficiencyGauge = new client.Gauge({
    name: `${prefix}efficiency`,
    help: "Current device efficiency",
    registers: [globalRegister],
  });

  return {
    updatePrometheusMetrics: (data: Partial<MinerData>) => {
      const setGauge = (gauge: client.Gauge<string>, value: unknown, map?: (n: number) => number) => {
        if (typeof value !== "number" || !Number.isFinite(value)) return;
        gauge.set(map ? map(value) : value);
      };

      // Extract hashrate from nested structure
      const hashrate =
        (typeof data.hashrate === "object" && data.hashrate !== null && "rate" in data.hashrate
          ? (data.hashrate as { rate?: number }).rate
          : null) ?? 0;

      // Extract fan speed from fans array
      const fanSpeed = data.fans && data.fans.length > 0 && typeof data.fans[0] === "object" && data.fans[0] !== null && "speed" in data.fans[0]
        ? (data.fans[0] as { speed?: number }).speed
        : null;

      // Extract temperature from temperature_avg or hashboards
      const temp = data.temperature_avg ??
        (data.hashboards && data.hashboards.length > 0 && typeof data.hashboards[0] === "object" && data.hashboards[0] !== null && "temp" in data.hashboards[0]
          ? (data.hashboards[0] as { temp?: number }).temp
          : null);

      // Extract voltage from top-level or hashboards (e.g. hashboard.voltage in mV)
      const voltage =
        data.voltage ??
        (data.hashboards && data.hashboards.length > 0 && typeof data.hashboards[0] === "object" && data.hashboards[0] !== null && "voltage" in data.hashboards[0]
          ? (data.hashboards[0] as { voltage?: number }).voltage
          : null);

      // Extract VR temp from hashboards or extra_config
      const vrTemp =
        (data.hashboards && data.hashboards.length > 0 && typeof data.hashboards[0] === "object" && data.hashboards[0] !== null && "chip_temp" in data.hashboards[0]
          ? (data.hashboards[0] as { chip_temp?: number }).chip_temp
          : null) ??
        readExtraConfigNumber(data.config?.extra_config, "vr_temp");

      // extra_config: snake_case only (same convention as MinerData: shares_accepted, temperature_avg, etc.)
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

// Helper function to extract hashrate from MinerData
function extractHashrate(minerData: MinerData | null | undefined): number {
  if (!minerData) return 0;
  if (typeof minerData.hashrate === "object" && minerData.hashrate !== null && "rate" in minerData.hashrate) {
    return (minerData.hashrate as { rate?: number }).rate ?? 0;
  }
  return 0;
}

// Helper function to extract pool URL and port from MinerData
function extractPoolInfo(minerData: MinerData | null | undefined): { url: string | null; port: number | null } {
  if (!minerData?.config?.pools?.groups?.[0]?.pools?.[0]) {
    return { url: null, port: null };
  }
  const pool = minerData.config.pools.groups[0].pools[0];
  const url = typeof pool === "object" && pool !== null && "url" in pool ? (pool.url as string | null) : null;
  
  // Extract port from URL if present
  let port: number | null = null;
  if (url) {
    const match = url.match(/:(\d+)/);
    if (match) {
      port = parseInt(match[1], 10);
    }
  }
  
  return { url, port };
}

// Funzione per aggiornare tutte le metriche di overview
export const updateOverviewMetrics = (devicesData: MinerData[]) => {
  const totalDevices = devicesData.length;
  // For now, assume all devices in the array are online (tracing)
  // This will be updated when we integrate with DiscoveredMiner properly
  const onlineDevices = totalDevices;
  const offlineDevices = 0;

  const totalHashrate = devicesData.reduce((acc, minerData) => {
    return acc + extractHashrate(minerData);
  }, 0);
  const averageHashrate = totalDevices > 0 ? totalHashrate / totalDevices : 0;

  const totalPower = devicesData.reduce((acc, minerData) => acc + (minerData.wattage ?? 0), 0);
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
  const firmwareCount = devicesData.reduce((acc: { [version: string]: number }, minerData) => {
    const version = minerData.fw_ver ?? minerData.firmware ?? "unknown";
    acc[version] = (acc[version] || 0) + 1;
    return acc;
  }, {});

  // Imposta i valori della metrica firmware per ciascuna versione
  Object.entries(firmwareCount).forEach(([version, count]) => {
    firmwareVersionGauge.labels(version).set(count);
  });

  // Conta le shares per pool (accepted e rejected)
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

  // Imposta le shares accepted e rejected per ciascun pool
  Object.entries(sharesByPool.accepted).forEach(([pool, count]) => {
    sharesByPoolAcceptedGauge.labels(pool).set(count);
  });

  Object.entries(sharesByPool.rejected).forEach(([pool, count]) => {
    sharesByPoolRejectedGauge.labels(pool).set(count);
  });
};
