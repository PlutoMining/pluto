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
  pyasicBridgeHost: string;
  pyasicValidationBatchSize: number;
  pyasicValidationConcurrency: number;
  pyasicValidationTimeout: number;
}

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
};

const parseNumber = (name: string, fallback: number): number => {
  const value = process.env[name];
  if (typeof value !== "string" || value.trim() === "") {
    return fallback;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid number for ${name}: "${value}"`);
  }
  return parsed;
};

const parseBoolean = (name: string, fallback = false): boolean => {
  const value = process.env[name];
  if (typeof value !== "string" || value.trim() === "") {
    return fallback;
  }
  return value === "true";
};

export const config: EnvConfig = {
  port: parseNumber("PORT", 3000),
  detectMockDevices: parseBoolean("DETECT_MOCK_DEVICES"),
  mockDiscoveryHost: requireEnv("MOCK_DISCOVERY_HOST"),
  // If unset, we fall back to extracting the host from MOCK_DISCOVERY_HOST.
  // This is important on Umbrel where discovery runs with host networking but backend does not;
  // storing "localhost" would make backend poll itself instead of the host.
  mockDeviceHost:
    typeof process.env.MOCK_DEVICE_HOST === "string" && process.env.MOCK_DEVICE_HOST.trim() !== ""
      ? process.env.MOCK_DEVICE_HOST
      : undefined,
  pyasicBridgeHost: requireEnv("PYASIC_BRIDGE_HOST"),
  pyasicValidationBatchSize: parseNumber("PYASIC_VALIDATION_BATCH_SIZE", 10),
  pyasicValidationConcurrency: parseNumber("PYASIC_VALIDATION_CONCURRENCY", 3),
  pyasicValidationTimeout: parseNumber("PYASIC_VALIDATION_TIMEOUT", 3000),
};
