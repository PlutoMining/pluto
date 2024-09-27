import { Entity } from "./entity.interface";

export interface DeviceInfo {
  power: number;
  voltage: number;
  current: number;
  fanSpeedRpm: number;
  temp: number;
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
  stratumPassword: string;
  version: string;
  boardVersion: string;
  runningPartition: string;
  flipscreen: number;
  invertscreen: number;
  invertfanpolarity: number;
  autofanspeed: number;
  fanspeed: number;
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
