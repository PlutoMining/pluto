/**
 * Generic mock miner data shape.
 *
 * Mirrors the fields a pyasic-bridge response (`PbMinerData`) would
 * contain for a non-vendor-specific miner. Vendor-specific fields
 * (frequency, coreVoltage, etc.) are intentionally absent — only
 * common MinerData fields are represented.
 */

export interface GenericMinerInfo {
  ip: string;
  mac: string;
  hostname?: string;

  make?: string;
  model?: string;
  firmware?: string;
  algo?: string;
  serial_number?: string;

  hashrate?: number;
  expected_hashrate?: number;

  wattage?: number;
  wattage_limit?: number;
  voltage?: number;

  temperature_avg?: number;
  env_temp?: number;

  shares_accepted?: number;
  shares_rejected?: number;

  best_difficulty?: string;
  best_session_difficulty?: string;
  network_difficulty?: number;

  fans?: { speed: number }[];
  hashboards?: {
    slot: number;
    hashrate?: number;
    temp?: number;
    chip_temp?: number;
    chips?: number;
    expected_chips?: number;
    active?: boolean;
    voltage?: number;
  }[];
  total_chips?: number;
  expected_chips?: number;
  expected_hashboards?: number;
  expected_fans?: number;

  is_mining?: boolean;
  uptime: number;
  nominal?: boolean;

  efficiency?: number;

  pool_url?: string;
  pool_user?: string;

  fw_ver?: string;
  api_ver?: string;

  datetime?: string;
  timestamp?: number;
}
