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
  autoListen: boolean;
  discoveryServiceHost: string;
  prometheusHost: string;
  pyasicBridgeHost: string;
  deleteDataOnDeviceRemove: boolean;
  systemInfoTimeoutMs: number;
  /** Interval between backend polls per device (ms). Each poll triggers one pyasic-bridge call, which may issue several HTTP requests to the miner. */
  pollIntervalMs: number;
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
  autoListen: parseBoolean("AUTO_LISTEN"),
  discoveryServiceHost: requireEnv("DISCOVERY_SERVICE_HOST"),
  prometheusHost: process.env.PROMETHEUS_HOST || "http://prometheus:9090",
  pyasicBridgeHost: process.env.PYASIC_BRIDGE_HOST || "http://pyasic-bridge:8000",
  deleteDataOnDeviceRemove: parseBoolean("DELETE_DATA_ON_DEVICE_REMOVE"),
  systemInfoTimeoutMs: parseNumber("SYSTEM_INFO_TIMEOUT_MS", 1500),
  pollIntervalMs: parseNumber("POLL_INTERVAL_MS", 5000),
};
