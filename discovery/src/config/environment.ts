/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

// import dotenv from "dotenv";

// dotenv.config({ path: ".env.local" });

interface EnvConfig {
  port: number;
  mockDiscoveryHost: string;
  mockDeviceHost?: string; // Optional hostname for mock device IPs (Docker compatibility)
  detectMockDevices: boolean;
}

export const config: EnvConfig = {
  port: Number(process.env.PORT || 3000),
  detectMockDevices: process.env.DETECT_MOCK_DEVICES === "true",
  mockDiscoveryHost: process.env.MOCK_DISCOVERY_HOST!,
  // If unset, we fall back to extracting the host from MOCK_DISCOVERY_HOST.
  // This is important on Umbrel where discovery runs with host networking but backend does not;
  // storing "localhost" would make backend poll itself instead of the host.
  mockDeviceHost:
    typeof process.env.MOCK_DEVICE_HOST === "string" && process.env.MOCK_DEVICE_HOST.trim() !== ""
      ? process.env.MOCK_DEVICE_HOST
      : undefined,
};
