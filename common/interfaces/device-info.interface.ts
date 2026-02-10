/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import type { Entity } from "./entity.interface";

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
  efficiency: number;
  frequencyOptions: DropdownOption[];
  coreVoltageOptions: DropdownOption[];
}

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
}

export interface DeviceInfo extends DeviceInfoLegacy, DeviceInfoNew {}

export enum DeviceApiVersion {
  Legacy = "legacy",
  New = "new",
}

export interface ExtendedDeviceInfo extends DeviceInfo {
  tracing?: boolean;
}

export interface Device extends Entity {
  ip: string;
  mac: string;
  type: string;
  presetUuid?: string | null;
  tracing?: boolean;
  info: DeviceInfo;
  publicDashboardUrl?: string;
}

export interface DeviceInfoWithSecrets extends Partial<DeviceInfo> {
  wifiPass?: string;
}

export interface DropdownOption {
  label: string;
  value: number;
}
