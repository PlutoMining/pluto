/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { DeviceInfo, ExtendedDeviceInfo } from "@pluto/interfaces";
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
    updatePrometheusMetrics: (data: Partial<DeviceInfo>) => {
      const setGauge = (gauge: client.Gauge<string>, value: unknown, map?: (n: number) => number) => {
        if (typeof value !== "number" || !Number.isFinite(value)) return;
        gauge.set(map ? map(value) : value);
      };

      const hashrate = data.hashRate ?? data.hashRate_10m;

      setGauge(powerGauge, data.power);
      setGauge(voltageGauge, data.voltage, (v) => v / 1000); // Assume voltage in millivolts
      setGauge(currentGauge, data.current, (c) => c / 1000); // Assume current in milliamps
      setGauge(fanSpeedGauge, data.fanSpeedRpm ?? data.fanrpm ?? data.fanspeed);
      setGauge(tempGauge, data.temp);
      setGauge(vrTempGauge, data.vrTemp);
      setGauge(hashRateGauge, hashrate);
      setGauge(sharesAcceptedGauge, data.sharesAccepted);
      setGauge(sharesRejectedGauge, data.sharesRejected);
      setGauge(uptimeGauge, data.uptimeSeconds);
      setGauge(freeHeapGauge, data.freeHeap);
      setGauge(coreVoltageGauge, data.coreVoltage, (v) => v / 1000); // Assume voltage in millivolts
      setGauge(coreVoltageActualGauge, data.coreVoltageActual, (v) => v / 1000); // Assume voltage in millivolts
      setGauge(frequencyGauge, data.frequency);

      if (typeof data.power === "number" && Number.isFinite(data.power) && typeof hashrate === "number" && Number.isFinite(hashrate)) {
        const efficiency = data.power > 0 && hashrate > 0 ? data.power / (hashrate / 1000) : 0;
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

// Funzione per aggiornare tutte le metriche di overview
export const updateOverviewMetrics = (devicesData: ExtendedDeviceInfo[]) => {
  const totalDevices = devicesData.length;
  const onlineDevices = devicesData.filter((device) => device.tracing).length;
  const offlineDevices = totalDevices - onlineDevices;

  const totalHashrate = devicesData.reduce((acc, device) => {
    if (!device.tracing) return acc;
    const hashRate = device.hashRate ?? device.hashRate_10m ?? 0; // Usa 0 se entrambi sono null o undefined
    return acc + hashRate;
  }, 0);
  const averageHashrate = totalDevices > 0 ? totalHashrate / totalDevices : 0;

  const totalPower = devicesData.reduce((acc, device) => (device.tracing ? acc + (device.power ?? 0) : acc), 0);
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
    const version = device.version || "unknown"; // Gestisce il caso di versioni mancanti
    acc[version] = (acc[version] || 0) + 1;
    return acc;
  }, {});

  // Imposta i valori della metrica firmware per ciascuna versione
  Object.entries(firmwareCount).forEach(([version, count]) => {
    firmwareVersionGauge.labels(version).set(count); // Usa la label `version` per ogni versione firmware
  });

  // Conta le shares per pool (accepted e rejected)
  const sharesByPool = devicesData.reduce(
    (
      acc: { accepted: { [pool: string]: number }; rejected: { [pool: string]: number } },
      device
    ) => {
      const poolKey = normalizePoolKey(device.stratumURL, device.stratumPort);
      const pool = poolMap.get(poolKey) || poolKey;
      acc.accepted[pool] = (acc.accepted[pool] || 0) + device.sharesAccepted;
      acc.rejected[pool] = (acc.rejected[pool] || 0) + device.sharesRejected;
      return acc;
    },
    { accepted: {}, rejected: {} }
  );

  // Imposta le shares accepted e rejected per ciascun pool
  Object.entries(sharesByPool.accepted).forEach(([pool, count]) => {
    sharesByPoolAcceptedGauge.labels(pool).set(count); // Usa la label `pool` per le shares accepted
  });

  Object.entries(sharesByPool.rejected).forEach(([pool, count]) => {
    sharesByPoolRejectedGauge.labels(pool).set(count); // Usa la label `pool` per le shares rejected
  });
};
