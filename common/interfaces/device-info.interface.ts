/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import type { Entity } from "./entity.interface";

export type DeviceSource = "real" | "mock";

/**
 * Unit structure for hashrate, efficiency, and other metrics.
 * Matches pyasic-bridge response format.
 */
export interface MetricUnit {
  value?: number;
  suffix: string;
}

/**
 * Hashrate structure from pyasic-bridge.
 */
export interface HashrateMetric {
  unit: MetricUnit;
  rate: number;
}

/**
 * Efficiency structure from pyasic-bridge.
 */
export interface EfficiencyMetric {
  unit: {
    suffix: string;
  };
  rate: number;
}

/**
 * Device information structure from pyasic-bridge.
 */
export interface DeviceInfoStructure {
  make: string;
  model: string;
  firmware: string;
  algo: string;
}

/**
 * Hashboard structure from pyasic-bridge.
 */
export interface HashboardInfo {
  slot: number;
  hashrate: HashrateMetric;
  inlet_temp: number | null;
  outlet_temp: number | null;
  temp: number | null;
  chip_temp: number | null;
  chips: number;
  expected_chips: number;
  serial_number: string | null;
  missing: boolean;
  tuned: unknown | null;
  active: boolean;
  voltage: number | null;
}

/**
 * Fan structure from pyasic-bridge.
 */
export interface FanInfo {
  speed: number;
}

/**
 * Pool configuration structure from pyasic-bridge.
 */
export interface PoolConfig {
  url: string;
  user: string;
  password: string;
}

/**
 * Pool group structure from pyasic-bridge.
 */
export interface PoolGroup {
  pools: PoolConfig[];
  quota: number;
  name: string | null;
}

/**
 * Pools configuration structure from pyasic-bridge.
 */
export interface PoolsConfig {
  groups: PoolGroup[];
}

/**
 * Fan mode configuration from pyasic-bridge.
 */
export interface FanModeConfig {
  mode: string;
  speed: number;
  minimum_fans: number;
}

/**
 * Temperature configuration from pyasic-bridge.
 */
export interface TemperatureConfig {
  target: number | null;
  hot: number | null;
  danger: number | null;
}

/**
 * Mining mode configuration from pyasic-bridge.
 */
export interface MiningModeConfig {
  mode: string;
}

/**
 * Extra configuration from pyasic-bridge (vendor-specific settings).
 */
export interface ExtraConfig {
  rotation?: number;
  invertscreen?: number;
  display_timeout?: number;
  overheat_mode?: number;
  overclock_enabled?: number;
  stats_frequency?: number;
  min_fan_speed?: number;
  [key: string]: unknown;
}

/**
 * Miner configuration structure from pyasic-bridge.
 */
export interface MinerConfig {
  pools: PoolsConfig;
  fan_mode: FanModeConfig;
  temperature: TemperatureConfig;
  mining_mode: MiningModeConfig;
  extra_config: ExtraConfig;
}

/**
 * Pyasic-bridge miner information response.
 * This matches the structure returned by pyasic-bridge `/miner/{ip}/data` endpoint.
 * All fields match the pyasic-bridge normalized response format.
 */
export interface PyasicMinerInfo {
  ip: string;
  device_info: DeviceInfoStructure;
  serial_number: string | null;
  psu_serial_number: string | null;
  mac: string;
  api_ver: string;
  fw_ver: string;
  hostname: string;
  sticker_hashrate: number | null;
  expected_hashrate: HashrateMetric;
  expected_hashboards: number;
  expected_chips: number;
  expected_fans: number;
  env_temp: number | null;
  wattage: number;
  voltage: number | null;
  network_difficulty: number;
  best_difficulty: string;
  best_session_difficulty: string;
  shares_accepted: number;
  shares_rejected: number;
  fans: FanInfo[];
  fan_psu: unknown | null;
  hashboards: HashboardInfo[];
  config: MinerConfig;
  fault_light: unknown | null;
  errors: unknown[];
  is_mining: boolean;
  uptime: number;
  pools: unknown[];
  hashrate: HashrateMetric;
  wattage_limit: number | null;
  total_chips: number;
  nominal: boolean;
  percent_expected_chips: number;
  percent_expected_hashrate: number;
  percent_expected_wattage: number | null;
  temperature_avg: number;
  efficiency: EfficiencyMetric;
  efficiency_fract: number;
  datetime: string;
  timestamp: number;
  make: string;
  model: string;
  firmware: string;
  algo: string;
  // Pluto-specific enrichment fields (added by backend, not part of pyasic response)
  frequencyOptions?: DropdownOption[];
  coreVoltageOptions?: DropdownOption[];
}

export interface Device extends Entity {
  ip: string;
  mac: string;
  type: string;
  presetUuid?: string | null;
  tracing?: boolean;
  /**
   * Miner information from pyasic-bridge.
   * Matches the structure returned by pyasic-bridge `/miner/{ip}/data` endpoint.
   * This is a breaking change from v1 (DeviceInfo) to v2 (PyasicMinerInfo).
   */
  info: PyasicMinerInfo;
  publicDashboardUrl?: string;
  /**
   * Indicates whether this device is backed by a real miner
   * or by the mock miner service.
   *
   * When omitted, callers should treat the device as real.
   */
  source?: DeviceSource;
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
