/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

// Importa config
import { DeviceInfo, DeviceInfoLegacy, DeviceInfoNew } from "@pluto/interfaces";
import { config } from "../config/environment";
// Funzione per estrarre la parte numerica dall'hostname
const extractNumericFromHostname = (hostname: string): number => {
  const match = hostname.match(/\d+$/); // Trova i numeri alla fine dell'hostname
  return match ? parseInt(match[0], 10) : 0; // Restituisci il numero o 0 se non c'è una parte numerica
};

// Mappa delle versioni di firmware con percentuali
const firmwareVersionsWithPercentages = [
  { version: "v2.2.2", percentage: 0.05 }, // 5%
  { version: "v2.2.0", percentage: 0.05 }, // 5%
  { version: "v2.1.10", percentage: 0.2 }, // 20%
  { version: "v2.1.9", percentage: 0.02 }, // 2%
  { version: "v2.1.8", percentage: 0.05 }, // 5%
  { version: "v2.1.7", percentage: 0.02 }, // 2%
  { version: "v2.1.6", percentage: 0.02 }, // 2%
  { version: "v2.0.3", percentage: 0.02 }, // 2%
  { version: "v1.2.0", percentage: 0.01 }, // 1%
  { version: "v1.1.0", percentage: 0.01 }, // 1%
];

// // Funzione per distribuire i firmware in modo proporzionale
// const distributeFirmwareProportionally = (ports: number[]): { [port: number]: string[] } => {
//   const totalPorts = ports.length;

//   // Calcola il numero totale di distribuzioni basato sulle percentuali
//   let totalFirmwareAssigned = 0;
//   const firmwareDistribution = firmwareVersionsWithPercentages.map((fw) => {
//     const assignCount = Math.floor(fw.percentage * totalPorts);
//     totalFirmwareAssigned += assignCount;
//     return { ...fw, assignCount };
//   });

//   // Se c'è qualche differenza dovuta all'arrotondamento, aggiusta i conti
//   let remainder = totalPorts - totalFirmwareAssigned;
//   firmwareDistribution.forEach((fw, index) => {
//     if (remainder > 0 && fw.assignCount > 0) {
//       firmwareDistribution[index].assignCount += 1; // Aggiungi uno ai primi firmware fino a esaurimento remainder
//       remainder--;
//     }
//   });

//   // Mappa finale per la distribuzione dei firmware
//   const distribution: { [port: number]: string[] } = {};
//   let portIndex = 0;

//   firmwareDistribution.forEach((fw) => {
//     for (let i = 0; i < fw.assignCount; i++) {
//       if (portIndex >= totalPorts) break;
//       const port = ports[portIndex];
//       if (!distribution[port]) distribution[port] = [];
//       distribution[port].push(fw.version);
//       portIndex++;
//     }
//   });

//   return distribution;
// };

// Funzione per distribuire i firmware in modo proporzionale con una logica probabilistica
const distributeFirmwareProportionally = (ports: number[]): { [port: number]: string[] } => {
  const totalPorts = ports.length;

  // Genera una lista di firmware basata sulle percentuali
  const firmwareList: { version: string; cumulativeProbability: number }[] = [];
  let cumulativeProbability = 0;

  firmwareVersionsWithPercentages.forEach((fw) => {
    cumulativeProbability += fw.percentage;
    firmwareList.push({ version: fw.version, cumulativeProbability });
  });

  // Funzione per ottenere un firmware in base a una selezione randomica
  const getRandomFirmware = (): string => {
    const randomValue = Math.random();
    return firmwareList.find((fw) => randomValue <= fw.cumulativeProbability)?.version || "v2.1.8";
  };

  // Mappa finale per la distribuzione dei firmware
  const distribution: { [port: number]: string[] } = {};

  ports.forEach((port) => {
    distribution[port] = [getRandomFirmware()];
  });

  return distribution;
};

// Chiamata della funzione con config.ports
const firmwareDistribution = distributeFirmwareProportionally(config.ports);

// Funzione per ottenere la versione firmware in base all'indice
const getFirmwareVersion = (hostname: string): string => {
  const numericPart = extractNumericFromHostname(hostname);
  const portIndex = numericPart - 1;
  // Trova la porta associata e recupera una delle versioni assegnate
  const port = config.ports[portIndex % config.ports.length];
  const assignedFirmwares = firmwareDistribution[port];
  return assignedFirmwares ? assignedFirmwares[numericPart % assignedFirmwares.length] : "v2.1.8"; // Default version
};

// Funzione per generare informazioni di sistema
export const generateSystemInfo = (
  hostname: string,
  uptimeSeconds: number,
  systemInfo: Partial<DeviceInfoLegacy> = {}
): Partial<DeviceInfoLegacy> => {
  const getRandomInt = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;
  const getRandomFloat = (min: number, max: number, decimals: number) => {
    const str = (Math.random() * (max - min) + min).toFixed(decimals);
    return parseFloat(str);
  };

  // Recupera la versione firmware in base all'hostname
  const firmwareVersion = getFirmwareVersion(hostname);

  const defaultSystemInfo: Partial<DeviceInfoLegacy> = {
    power: getRandomFloat(10, 20, 6),
    voltage: getRandomInt(5000, 6000),
    current: getRandomFloat(2000, 3000, 1),
    fanSpeedRpm: getRandomInt(4000, 6000),
    temp: getRandomInt(30, 70),
    hashRate: getRandomFloat(700, 800, 9),
    bestDiff: `${getRandomFloat(1, 5, 2)}M`,
    bestSessionDiff: `${getRandomFloat(10, 30, 1)}k`,
    freeHeap: getRandomInt(100000, 200000),
    coreVoltage: getRandomInt(1000, 1300),
    coreVoltageActual: getRandomInt(1000, 1300),
    frequency: getRandomInt(400, 600),
    ssid: `WiFi-SSID`,
    hostname,
    wifiStatus: "Connected!",
    sharesAccepted: getRandomInt(0, 10),
    sharesRejected: getRandomInt(0, 10),
    uptimeSeconds,
    ASICModel: "BM1368",
    stratumURL: "solo.ckpool.org",
    stratumPort: 3333,
    stratumUser: `bc1asdasdasdasdasasdasdasdasdasdasd.${hostname}`,
    stratumProtocolVersion: "v1",
    version: firmwareVersion, // Usa la versione firmware dinamica
    boardVersion: "401",
    runningPartition: "factory",
    flipscreen: getRandomInt(0, 1),
    invertscreen: getRandomInt(0, 1),
    invertfanpolarity: getRandomInt(0, 1),
    autofanspeed: getRandomInt(0, 1),
    fanspeed: getRandomInt(0, 100),
  };

  // Sovrascrive i valori casuali con quelli di systemInfo se presenti
  return {
    ...defaultSystemInfo, // Valori casuali di default
    ...systemInfo, // Sovrascrittura con i dati forniti
  };
};

// Funzione per generare informazioni di sistema per dispositivi con firmware alternativo
export const generateSystemInfoAlt = (
  hostname: string,
  uptimeSeconds: number,
  systemInfo: Partial<DeviceInfoNew> = {}
): Partial<DeviceInfoNew> => {
  const getRandomInt = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;
  const getRandomFloat = (min: number, max: number, decimals: number) => {
    const str = (Math.random() * (max - min) + min).toFixed(decimals);
    return parseFloat(str);
  };

  // Recupera la versione firmware in base all'hostname
  const firmwareVersion = getFirmwareVersion(hostname);

  const defaultSystemInfo: Partial<DeviceInfoNew> = {
    power: getRandomFloat(30, 80, 3),
    maxPower: 70,
    minPower: 30,
    voltage: getRandomFloat(11000, 13000, 2),
    maxVoltage: 13,
    minVoltage: 11,
    current: getRandomFloat(6000, 7000, 1),
    temp: getRandomInt(30, 80),
    vrTemp: getRandomFloat(60, 80, 1),
    hashRateTimestamp: Date.now(),
    hashRate_10m: getRandomFloat(2900, 3100, 3),
    hashRate_1h: getRandomFloat(2900, 3100, 3),
    hashRate_1d: getRandomFloat(2900, 3100, 3),
    jobInterval: 1200,
    bestDiff: `${getRandomFloat(400, 500, 1)}M`,
    bestSessionDiff: `${getRandomFloat(100, 200, 1)}M`,
    freeHeap: getRandomInt(5000000, 6000000),
    coreVoltage: getRandomInt(1300, 1400),
    coreVoltageActual: getRandomInt(1300, 1400),
    frequency: getRandomInt(400, 600),
    ssid: "EMN_Guest",
    hostname,
    wifiStatus: "Connected!",
    sharesAccepted: getRandomInt(10000, 20000),
    sharesRejected: getRandomInt(0, 50),
    uptimeSeconds,
    asicCount: getRandomInt(2, 6),
    smallCoreCount: getRandomInt(1200, 1300),
    ASICModel: "BM1368",
    deviceModel: "NerdQAxe+",
    stratumURL: "solo.ckpool.org",
    stratumPort: 3333,
    stratumUser: `bc1asdasdasdasdasasdasdasdasdasdasd.${hostname}`,
    stratumProtocolVersion: "v1",
    version: firmwareVersion,
    runningPartition: "ota_1",
    flipscreen: getRandomInt(0, 1),
    overheat_temp: 75,
    invertscreen: getRandomInt(0, 1),
    autoscreenoff: getRandomInt(0, 1),
    invertfanpolarity: getRandomInt(0, 1),
    autofanspeed: getRandomInt(0, 1),
    fanspeed: getRandomInt(0, 100),
    fanrpm: getRandomInt(2000, 3000),
    lastResetReason: "Power on reset",
    history: {
      hashrate_10m: Array.from({ length: 4 }, () => getRandomFloat(290000, 310000, 0)),
      hashrate_1h: Array.from({ length: 4 }, () => getRandomFloat(300000, 310000, 0)),
      hashrate_1d: Array.from({ length: 4 }, () => getRandomFloat(310000, 320000, 0)),
      timestamps: Array.from({ length: 4 }, () => getRandomInt(2000, 5000)),
      timestampBase: Date.now(),
    },
  };

  // Sovrascrive i valori casuali con quelli di systemInfo se presenti
  return {
    ...defaultSystemInfo, // Valori casuali di default
    ...systemInfo, // Sovrascrittura con i dati forniti
  };
};

/**
 * Example: Creating a V2 mock device
 * Pass systemInfo with V2 configuration:
 * {
 *   stratumURL: "stratum2+tcp://pool.example.com:34254/9bXiEd8boQVhq7WddEcERUL5tyyJVFYdU8th3HfbNXK3Yw6GRXh",
 *   stratumProtocolVersion: "v2",
 *   stratumAuthorityKey: "9bXiEd8boQVhq7WddEcERUL5tyyJVFYdU8th3HfbNXK3Yw6GRXh",
 *   stratumPort: 34254,
 *   // ... other fields
 * }
 */
export const generateFakeLog = (): string => {
  const logs = [
    "System started",
    "Temperature reading failed",
    "Fan speed increased",
    "Power supply issue detected",
    "System performance optimal",
    "Network connection lost",
    "ASIC failure detected",
    "Overclocking applied successfully",
    "Temperature is stable",
    "Fan is operating within limits",
  ];
  const randomIndex = Math.floor(Math.random() * logs.length);
  return logs[randomIndex];
};
