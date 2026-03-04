/**
 * Types matching pyasic-bridge JSON responses.
 *
 * Shared across backend (PyasicBridgeDriver) and discovery
 * (MinerValidationService) to avoid duplicated local type blocks.
 */

export interface PbHashrateStruct {
  rate?: number | null;
  unit?: { value?: number; suffix?: string } | null;
}

export interface PbDeviceInfo {
  make?: string | null;
  model?: string | null;
  firmware?: string | null;
  algo?: string | null;
}

export interface PbFanReading {
  speed?: number | null;
}

export interface PbHashboardReading {
  slot?: number | null;
  hashrate?: PbHashrateStruct | null;
  temp?: number | null;
  chip_temp?: number | null;
  chips?: number | null;
  expected_chips?: number | null;
  serial_number?: string | null;
  missing?: boolean | null;
  active?: boolean | null;
  voltage?: number | null;
}

export interface PbPoolEntry {
  url?: string | null;
  user?: string | null;
  password?: string | null;
}

export interface PbPoolGroup {
  pools?: PbPoolEntry[];
  quota?: number | null;
}

export interface PbPoolsConfig {
  groups?: PbPoolGroup[];
}

export interface PbMinerData {
  ip: string;
  mac?: string | null;
  hostname?: string | null;
  device_info?: PbDeviceInfo | null;
  serial_number?: string | null;
  hashrate?: PbHashrateStruct | null;
  expected_hashrate?: PbHashrateStruct | null;
  wattage?: number | null;
  wattage_limit?: number | null;
  voltage?: number | null;
  temperature_avg?: number | null;
  env_temp?: number | null;
  shares_accepted?: number | null;
  shares_rejected?: number | null;
  best_difficulty?: string | null;
  best_session_difficulty?: string | null;
  network_difficulty?: number | null;
  fans?: PbFanReading[];
  hashboards?: PbHashboardReading[];
  total_chips?: number | null;
  expected_chips?: number | null;
  expected_hashboards?: number | null;
  expected_fans?: number | null;
  is_mining?: boolean | null;
  uptime?: number | null;
  nominal?: boolean | null;
  efficiency?: PbHashrateStruct | null;
  efficiency_fract?: number | null;
  fw_ver?: string | null;
  api_ver?: string | null;
  datetime?: string | null;
  timestamp?: number | null;
  make?: string | null;
  model?: string | null;
  firmware?: string | null;
  algo?: string | null;
  config?: {
    pools?: PbPoolsConfig | null;
    fan_mode?: { mode?: string; speed?: number; minimum_fans?: number } | null;
    temperature?: { target?: number; hot?: number; danger?: number } | null;
    mining_mode?: { mode?: string } | null;
    extra_config?: Record<string, unknown> | null;
  } | null;
}

export interface PbValidationResult {
  ip: string;
  is_miner: boolean;
  model?: string | null;
  error?: string | null;
}
