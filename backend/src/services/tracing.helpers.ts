/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
 */

import type { MinerData } from "@pluto/pyasic-bridge-client";

/**
 * Extract hostname from MinerData structure.
 * Checks multiple possible locations for hostname.
 */
export function extractHostnameFromMinerData(minerData: MinerData | null | undefined): string {
  if (!minerData) {
    return "unknown";
  }
  
  return minerData.hostname ?? minerData.ip ?? "unknown";
}

/**
 * Extract model from MinerData structure.
 * Checks multiple possible locations for model.
 */
export function extractModelFromMinerData(minerData: MinerData | null | undefined): string {
  if (!minerData) {
    return "unknown";
  }
  
  return minerData.model ?? minerData.device_info?.model ?? "unknown";
}
