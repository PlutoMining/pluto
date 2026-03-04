/**
 * Canonical miner configuration model.
 *
 * Used for both reading current config and sending config updates.
 * Pool settings are universal.  Everything else (fan, temperature,
 * hardware, display, …) lives in vendorConfig and is defined by
 * each driver's ConfigFormSchema.
 */

import type { PoolsConfig } from "./miner-data.interface";

export type { PoolsConfig } from "./miner-data.interface";
export type { PoolEntry, PoolGroup } from "./miner-data.interface";

export interface MinerConfig {
  pools?: PoolsConfig;
  vendorConfig?: Record<string, unknown>;
}
