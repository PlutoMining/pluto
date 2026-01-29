/**
 * Native AxeOS / BitAxe `/api/system/info` payload shape.
 *
 * This is intentionally close to the real firmware response so that
 * pyasic and other tooling can treat the mock just like hardware.
 *
 * The goal is fidelity, not minimising fields: if the firmware adds
 * more keys we can extend this interface over time.
 */
export interface BitaxeAxeOSInfo {
  power: number;
  voltage: number;
  current: number;
  temp: number;
  temp2: number;
  vrTemp: number;

  // Power constraints / nominal voltage
  maxPower: number;
  nominalVoltage: number;

  hashRate: number;
  hashRate_1m: number;
  hashRate_10m: number;
  hashRate_1h: number;
  expectedHashrate: number;

  errorPercentage: number;
  bestDiff: number;
  bestSessionDiff: number;
  poolDifficulty: number;

  isUsingFallbackStratum: number;
  poolAddrFamily: number;

  isPSRAMAvailable: number;
  freeHeap: number;
  freeHeapInternal: number;
  freeHeapSpiram: number;

  coreVoltage: number;
  coreVoltageActual: number;
  frequency: number;

  ssid: string;
  macAddr: string;
  hostname: string;
  ipv4: string;
  ipv6: string;
  wifiStatus: string;
  wifiRSSI: number;
  apEnabled: number;

  sharesAccepted: number;
  sharesRejected: number;
  sharesRejectedReasons: {
    message: string;
    count: number;
  }[];

  uptimeSeconds: number;
  smallCoreCount: number;
  ASICModel: string;

  stratumURL: string;
  stratumPort: number;
  stratumUser: string;
  stratumSuggestedDifficulty: number;
  stratumExtranonceSubscribe: number;
  fallbackStratumURL: string;
  fallbackStratumPort: number;
  fallbackStratumUser: string;
  fallbackStratumSuggestedDifficulty: number;
  fallbackStratumExtranonceSubscribe: number;

  responseTime: number;
  version: string;
  axeOSVersion: string;
  idfVersion: string;
  boardVersion: string;
  resetReason: string;
  runningPartition: string;

  overheat_mode: number;
  overclockEnabled: number;
  display: string;
  rotation: number;
  invertscreen: number;
  displayTimeout: number;
  autofanspeed: number;
  fanspeed: number;
  manualFanSpeed: number;
  minFanSpeed: number;
  temptarget: number;
  fanrpm: number;
  fan2rpm: number;
  statsFrequency: number;

  blockFound: number;
  blockHeight: number;
  scriptsig: string;
  networkDifficulty: number;

  hashrateMonitor: {
    asics: {
      total: number;
      domains: number[];
      errorCount: number;
    }[];
  };
}

