/**
 * A miner discovered on the LAN and stored in the discovery/imprinted database.
 */

import type { Entity } from "./entity.interface";
import type { MinerData } from "./miner-data.interface";

export type SupportLevel = "native" | "generic";

export interface DetectionResult {
  type: string;
  model: string;
  mac?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface DiscoveredMiner extends Entity {
  ip: string;
  mac: string;

  /** Device type/model identifier (e.g. "Bitaxe 601", "Antminer S19") */
  type: string;

  /** Whether this miner has a native driver or uses the pyasic-bridge fallback. */
  supportLevel: SupportLevel;

  /** Full miner data from the last poll. */
  minerData: MinerData;

  /** Storage IP (may differ from minerData.ip for mock devices / Docker networking). */
  storageIp?: string;

  /** UUID of the preset currently assigned to this miner. */
  presetUuid?: string | null;

  /** Whether the backend is currently polling this miner successfully (online). */
  tracing?: boolean;
}
