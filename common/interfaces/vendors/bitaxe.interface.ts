/**
 * Bitaxe vendor-specific data and configuration types.
 *
 * These types map 1:1 to the Bitaxe AxeOS REST API (GET /api/system/info)
 * and configuration (PATCH /api/system). Fields use the exact naming from
 * the Bitaxe firmware where practical.
 */

/* ---------- Raw Bitaxe API response (GET /api/system/info) --------------- */

export interface BitaxeApiResponse {
  power: number;
  voltage: number;
  current: number;
  temp: number;
  temp2: number;
  vrTemp: number;
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
  sharesRejectedReasons: { message: string; count: number }[];
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
  hashrateMonitor?: {
    asics: { total: number; domains: number[]; errorCount: number }[];
  };
}

/* ---------- Share rejection detail --------------------------------------- */

export interface BitaxeShareRejectedReason {
  message: string;
  count: number;
}

/* ---------- ASIC-level hashrate monitoring ------------------------------- */

export interface BitaxeAsicMonitor {
  total: number;
  domains: number[];
  errorCount: number;
}

export interface BitaxeHashrateMonitor {
  asics: BitaxeAsicMonitor[];
}

/* ---------- Full read-only data from GET /api/system/info --------------- */

export interface BitaxeData {
  // Hashrates (GH/s)
  hashRate: number;
  hashRate1m: number;
  hashRate10m: number;
  hashRate1h: number;
  expectedHashrate: number;
  errorPercentage: number;

  // Power
  power: number;
  voltage: number;
  current: number;
  maxPower: number;
  nominalVoltage: number;

  // Hardware / ASIC
  asicModel: string;
  boardVersion: string;
  frequency: number;
  coreVoltage: number;
  coreVoltageActual: number;
  smallCoreCount: number;

  // Thermal
  temp: number;
  temp2: number;
  vrTemp: number;
  overheatMode: number;
  temptarget: number;

  // Memory
  freeHeap: number;
  freeHeapInternal: number;
  freeHeapSpiram: number;
  isPSRAMAvailable: number;

  // Network / WiFi
  ssid: string;
  macAddr: string;
  hostname: string;
  ipv4: string;
  ipv6: string;
  wifiStatus: string;
  wifiRSSI: number;
  apEnabled: number;

  // Shares
  sharesAccepted: number;
  sharesRejected: number;
  sharesRejectedReasons: BitaxeShareRejectedReason[];

  // Mining / Pool
  poolDifficulty: number;
  networkDifficulty: number;
  blockHeight: number;
  blockFound: number;
  bestDiff: number;
  bestSessionDiff: number;
  isUsingFallbackStratum: number;
  poolAddrFamily: number;
  scriptsig: string;

  // Stratum primary
  stratumURL: string;
  stratumPort: number;
  stratumUser: string;
  stratumSuggestedDifficulty: number;
  stratumExtranonceSubscribe: number;

  // Stratum fallback
  fallbackStratumURL: string;
  fallbackStratumPort: number;
  fallbackStratumUser: string;
  fallbackStratumSuggestedDifficulty: number;
  fallbackStratumExtranonceSubscribe: number;

  // Fan
  fanrpm: number;
  fan2rpm: number;
  autofanspeed: number;
  fanspeed: number;
  manualFanSpeed: number;
  minFanSpeed: number;

  // Firmware / System
  version: string;
  axeOSVersion: string;
  idfVersion: string;
  runningPartition: string;
  resetReason: string;
  uptimeSeconds: number;
  responseTime: number;

  // Display
  display: string;
  rotation: number;
  invertscreen: number;
  displayTimeout: number;

  // Overclocking
  overclockEnabled: number;
  statsFrequency: number;

  // ASIC monitor
  hashrateMonitor?: BitaxeHashrateMonitor;
}

/* ---------- Shared validation limits ------------------------------------- */

export const BITAXE_LIMITS = {
  frequency: { min: 50, max: 800 },
  coreVoltage: { min: 800, max: 1400 },
  fanspeed: { min: 0, max: 100 },
  temptarget: { min: 30, max: 100 },
  stratumPort: { min: 1, max: 65535 },
} as const;

/* ---------- Configurable fields (PATCH /api/system) --------------------- */

export interface BitaxeConfig {
  // Hardware
  frequency?: number;
  coreVoltage?: number;
  overclockEnabled?: number;
  overheatMode?: number;

  // Fan
  autofanspeed?: number;
  fanspeed?: number;
  minFanSpeed?: number;
  temptarget?: number;

  // Display
  rotation?: number;
  invertscreen?: number;
  displayTimeout?: number;
  statsFrequency?: number;

  // Stratum primary
  stratumURL?: string;
  stratumPort?: number;
  stratumUser?: string;
  stratumPassword?: string;
  stratumSuggestedDifficulty?: number;

  // Stratum fallback
  fallbackStratumURL?: string;
  fallbackStratumPort?: number;
  fallbackStratumUser?: string;
  fallbackStratumPassword?: string;
  fallbackStratumSuggestedDifficulty?: number;

  // Network
  hostname?: string;
  ssid?: string;
  wifiPass?: string;
}
