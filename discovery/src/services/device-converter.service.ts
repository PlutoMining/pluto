/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import type { DiscoveredMiner, MinerData, SupportLevel } from "@pluto/interfaces";
import type { MinerValidationResult } from "./miner-validation.service";
import type { ArpScanResult } from "./arpScanWrapper";

/**
 * Service for creating DiscoveredMiner objects from validation / detection data.
 */
export class DeviceConverterService {
  /**
   * Create a DiscoveredMiner from pyasic-bridge validation data (generic support).
   */
  static createDiscoveredMiner(
    storageIp: string,
    mac: string,
    validationResult: MinerValidationResult | null,
    arpResult: ArpScanResult | null,
    minerData: MinerData | null,
    supportLevel: SupportLevel = "generic"
  ): DiscoveredMiner {
    const model =
      validationResult?.model ??
      minerData?.deviceInfo?.model ??
      arpResult?.type ??
      "unknown";

    const fullMinerData: MinerData = minerData || {
      ip: storageIp,
      mac: mac !== "unknown" ? mac : undefined,
      hostname: storageIp,
      deviceInfo: model !== "unknown" ? { model } : undefined,
      fans: [],
      hashboards: [],
    };

    return {
      ip: storageIp,
      mac,
      type: model,
      supportLevel,
      minerData: fullMinerData,
      storageIp,
    };
  }
}
