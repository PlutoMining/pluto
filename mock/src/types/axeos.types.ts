/**
 * AxeOS-specific mock miner types.
 *
 * These types were originally part of `@pluto/interfaces` but have been
 * moved into the mock service so that legacy AxeOS details are not
 * exposed to other services.
 */

import type { DropdownOption } from "@pluto/interfaces";

/**
 * Legacy AxeOS-specific interface used by the mock service.
 */
export interface DeviceInfoLegacy {
  power: number;
  voltage: number;
  current: number;
  fanSpeedRpm: number;
  temp: number;
  /**
   * @deprecated
   * use DeviceInfoNew hashRate_10m, hashRate_1h, hashRate_1d
   */
  hashRate: number;
  bestDiff: string;
  bestSessionDiff: string;
  currentDiff?: string;
  freeHeap: number;
  freeHeapInternal?: number;
  freeHeapSpiram?: number;
  isPSRAMAvailable?: number;
  coreVoltage: number;
  coreVoltageActual: number;
  frequency: number;
  ssid: string;
  hostname: string;
  wifiStatus: string;
  sharesAccepted: number;
  sharesRejected: number;
  uptimeSeconds: number;
  mac?: string;
  macAddr?: string;
  ASICModel: string;
  stratumURL: string;
  stratumPort: number;
  stratumUser: string;
  wifiPassword?: string;
  stratumPassword?: string;
  version: string;
  boardVersion: string;
  runningPartition: string;
  flipscreen: number;
  invertscreen: number;
  invertfanpolarity: number;
  autofanspeed: number;
  fanspeed: number;
  // Optional metadata fields to better mimic real miners / pyasic expectations
  make?: string;
  model?: string;
  firmware?: string;
  efficiency: number;
  frequencyOptions: DropdownOption[];
  coreVoltageOptions: DropdownOption[];
}

/**
 * Newer AxeOS-specific interface used by the mock service.
 */
export interface DeviceInfoNew {
  power: number;
  maxPower: number;
  minPower: number;
  voltage: number;
  maxVoltage: number;
  minVoltage: number;
  current: number;
  temp: number;
  vrTemp: number;
  hashRateTimestamp: number;
  hashRate_10m: number;
  hashRate_1h: number;
  hashRate_1d: number;
  jobInterval: number;
  bestDiff: string;
  bestSessionDiff: string;
  currentDiff?: string;
  freeHeap: number;
  freeHeapInternal?: number;
  freeHeapSpiram?: number;
  isPSRAMAvailable?: number;
  coreVoltage: number;
  coreVoltageActual: number;
  frequency: number;
  ssid: string;
  hostname: string;
  wifiStatus: string;
  sharesAccepted: number;
  sharesRejected: number;
  uptimeSeconds: number;
  mac?: string;
  macAddr?: string;
  asicCount: number;
  smallCoreCount: number;
  ASICModel: string;
  deviceModel: string;
  stratumURL: string;
  stratumPort: number;
  stratumUser: string;
  wifiPassword?: string;
  stratumPassword?: string;
  version: string;
  runningPartition: string;
  flipscreen: number;
  overheat_temp: number;
  invertscreen: number;
  autoscreenoff: number;
  invertfanpolarity: number;
  autofanspeed: number;
  fanspeed: number;
  fanrpm: number;
  lastResetReason: string;
  history: {
    hashrate_10m: number[];
    hashrate_1h: number[];
    hashrate_1d: number[];
    timestamps: number[];
    timestampBase: number;
  };
  // Optional metadata fields to better mimic real miners / pyasic expectations
  make?: string;
  model?: string;
  firmware?: string;
}

export interface DeviceInfo extends DeviceInfoLegacy, DeviceInfoNew {}

export enum DeviceApiVersion {
  Legacy = "legacy",
  New = "new",
}

export interface DeviceInfoWithSecrets extends Partial<DeviceInfo> {
  wifiPass?: string;
}

