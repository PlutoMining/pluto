/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import type { Entity } from "./entity.interface";
import type { MinerData } from "@pluto/pyasic-bridge-client";

/**
 * Generic discovered miner interface based on pyasic-bridge MinerData structure.
 * 
 * This interface is device-agnostic and works with any miner type supported by pyasic-bridge.
 * It uses the normalized MinerData structure from pyasic-bridge, which is designed to work
 * across different miner manufacturers and models.
 * 
 * This is the primary format used by the discovery service for storing and returning miner data.
 * All discovered miners are stored in this format in the discovery database.
 */
export interface DiscoveredMiner extends Entity {
  /**
   * IP address of the miner
   */
  ip: string;

  /**
   * MAC address of the miner (if available)
   */
  mac: string;

  /**
   * Device type/model identifier (e.g., "Bitaxe", "Antminer S19", "AvalonMiner 1246")
   */
  type: string;

  /**
   * Full miner data from pyasic-bridge.
   * This contains all normalized miner information in a device-agnostic format.
   */
  minerData: MinerData;

  /**
   * Storage IP address (may differ from minerData.ip for mock devices or Docker networking)
   */
  storageIp?: string;
}
