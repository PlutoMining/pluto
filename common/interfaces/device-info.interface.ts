/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { Entity } from "./entity.interface";

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
  freeHeap: number;
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
  freeHeap: number;
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

export const DeviceFrequencyOptions: Record<string, DropdownOption[]> = {
  BM1397: [
    { label: "400", value: 400 },
    { label: "425 (default)", value: 425 },
    { label: "450", value: 450 },
    { label: "475", value: 475 },
    { label: "485", value: 485 },
    { label: "500", value: 500 },
    { label: "525", value: 525 },
    { label: "550", value: 550 },
    { label: "575", value: 575 },
    { label: "590", value: 590 },
    { label: "600", value: 600 },
    { label: "610", value: 610 },
    { label: "620", value: 620 },
    { label: "630", value: 630 },
    { label: "640", value: 640 },
    { label: "650", value: 650 },
  ],
  BM1366: [
    { label: "400", value: 400 },
    { label: "425", value: 425 },
    { label: "450", value: 450 },
    { label: "475", value: 475 },
    { label: "485 (default)", value: 485 },
    { label: "500", value: 500 },
    { label: "525", value: 525 },
    { label: "550", value: 550 },
    { label: "575", value: 575 },
  ],
  BM1368: [
    { label: "400", value: 400 },
    { label: "425", value: 425 },
    { label: "450", value: 450 },
    { label: "475", value: 475 },
    { label: "490 (default)", value: 490 },
    { label: "500", value: 500 },
    { label: "525", value: 525 },
    { label: "550", value: 550 },
    { label: "575", value: 575 },
  ],
  BM1370: [
    { label: "400", value: 400 },
    { label: "490", value: 490 },
    { label: "525 (default)", value: 525 },
    { label: "550", value: 550 },
    { label: "575", value: 575 },
    { label: "600", value: 600 },
    { label: "625", value: 625 },
  ],
};

export const DeviceVoltageOptions: Record<string, DropdownOption[]> = {
  BM1370: [
    { label: "1000", value: 1000 },
    { label: "1060", value: 1060 },
    { label: "1100", value: 1100 },
    { label: "1150 (default)", value: 1150 },
    { label: "1200", value: 1200 },
    { label: "1250", value: 1250 },
  ],
  BM1397: [
    { label: "1150", value: 1150 },
    { label: "1100", value: 1100 },
    { label: "1200", value: 1200 },
    { label: "1250", value: 1250 },
    { label: "1300", value: 1300 },
    { label: "1350", value: 1350 },
    { label: "1400", value: 1400 },
    { label: "1450", value: 1450 },
    { label: "1500", value: 1500 },
  ],
  BM1366: [
    { label: "1100", value: 1100 },
    { label: "1150", value: 1150 },
    { label: "1200 (default)", value: 1200 },
    { label: "1250", value: 1250 },
    { label: "1300", value: 1300 },
  ],
  BM1368: [
    { label: "1100", value: 1100 },
    { label: "1150", value: 1150 },
    { label: "1166 (default)", value: 1166 },
    { label: "1200", value: 1200 },
    { label: "1250", value: 1250 },
    { label: "1300", value: 1300 },
  ],
};
