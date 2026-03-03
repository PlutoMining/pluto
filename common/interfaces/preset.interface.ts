/**
 * A reusable mining configuration preset that can be applied to devices.
 */

import type { DiscoveredMiner } from "./discovered-miner.interface";
import type { Entity } from "./entity.interface";
import type { MinerConfig } from "./miner-config.interface";

export interface Preset extends Entity {
  uuid: string;
  name: string;
  configuration: MinerConfig;
  associatedDevices?: DiscoveredMiner[];
}
