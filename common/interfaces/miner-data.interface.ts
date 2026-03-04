/**
 * Canonical miner data model used across the entire application.
 *
 * This is the source of truth -- all drivers (native and pyasic-bridge)
 * map their responses into this shape. Vendor-specific data lives in
 * optional typed sections (e.g. `bitaxe`) rather than untyped bags.
 */

import type { BitaxeData } from "./vendors/bitaxe.interface";

/* ---------- Nested value types ------------------------------------------ */

export interface HashrateUnit {
  value?: number;
  suffix?: string;
}

export interface HashrateStruct {
  unit?: HashrateUnit;
  rate?: number;
}

export interface FanReading {
  speed?: number;
}

export interface HashboardReading {
  slot?: number;
  hashrate?: HashrateStruct;
  inletTemp?: number;
  outletTemp?: number;
  temp?: number;
  chipTemp?: number;
  chips?: number;
  expectedChips?: number;
  serialNumber?: string;
  missing?: boolean;
  active?: boolean;
  voltage?: number;
}

export interface DeviceInfo {
  make?: string;
  model?: string;
  firmware?: string;
  algo?: string;
}

/* ---------- Pool configuration ------------------------------------------ */

export interface PoolEntry {
  url?: string;
  user?: string;
  password?: string;
}

export interface PoolGroup {
  pools: PoolEntry[];
  quota?: number;
  name?: string;
}

export interface PoolsConfig {
  groups: PoolGroup[];
}

/* ---------- MinerData ---------------------------------------------------- */

export interface MinerData {
  ip: string;
  mac?: string;
  hostname?: string;
  deviceInfo?: DeviceInfo;
  serialNumber?: string;

  // Hashrate
  hashrate?: HashrateStruct;
  expectedHashrate?: HashrateStruct;

  // Power / electrical
  wattage?: number;
  wattageLimit?: number;
  voltage?: number;

  // Thermal
  temperatureAvg?: number;
  envTemp?: number;

  // Shares
  sharesAccepted?: number;
  sharesRejected?: number;

  // Difficulty
  bestDifficulty?: string;
  bestSessionDifficulty?: string;
  networkDifficulty?: number;

  // Hardware
  fans?: FanReading[];
  hashboards?: HashboardReading[];
  totalChips?: number;
  expectedChips?: number;
  expectedHashboards?: number;
  expectedFans?: number;

  // Status
  isMining?: boolean;
  uptime?: number;
  nominal?: boolean;

  // Efficiency
  efficiency?: HashrateStruct;
  efficiencyFract?: number;

  // Pools (current active config)
  pools?: PoolsConfig;

  // Firmware
  fwVer?: string;
  apiVer?: string;

  // Timestamps
  datetime?: string;
  timestamp?: number;

  // Vendor-specific typed extensions -- only one is populated at a time.
  bitaxe?: BitaxeData;
  // Future vendor sections:
  // antminer?: AntminerData;
  // whatsminer?: WhatsminerData;
}
