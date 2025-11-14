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
  mockDeviceHost: string; // Hostname to use for mock device IPs (for Docker compatibility)
  detectMockDevices: boolean;
}

export const config: EnvConfig = {
  port: Number(process.env.PORT || 3000),
  detectMockDevices: process.env.DETECT_MOCK_DEVICES === "true",
  mockDiscoveryHost: process.env.MOCK_DISCOVERY_HOST!,
  mockDeviceHost: process.env.MOCK_DEVICE_HOST || "localhost", // Default to localhost, override for Docker
};
