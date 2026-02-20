/**
 * Helper functions for building MinerConfigModelInput from form state.
 * Used by DeviceSettingsAccordion to convert UI form data to backend format.
 */

import type { MinerConfigModelInput } from "@pluto/pyasic-bridge-client";
import type { MinerSettingsModel } from "./minerSettingsFactory";

export interface StratumFormState {
  stratumURL: string;
  stratumPort: number | undefined;
  stratumUser: string;
  stratumPassword: string;
  workerName: string;
}

export interface ExtraConfigFormState {
  frequency?: number;
  coreVoltage?: number;
  fanspeed?: number;
  autofanspeed?: number;
  flipscreen?: number;
  invertfanpolarity?: number;
}

/**
 * Parse stratum URL to extract base URL and port.
 * Handles formats like `stratum+tcp://pool:3333` or `stratum+tcp://pool:3333/`
 */
export function parseStratumUrl(url: string): { url: string; port?: number } {
  if (!url || typeof url !== "string") {
    return { url: "" };
  }

  try {
    // Handle stratum+tcp://pool:port format
    const match = url.match(/^(stratum\+tcp:\/\/[^:]+)(?::(\d+))?(\/.*)?$/);
    if (match) {
      const baseUrl = match[1];
      const portStr = match[2];
      const port = portStr ? parseInt(portStr, 10) : undefined;
      return {
        url: portStr ? `${baseUrl}:${portStr}` : baseUrl,
        port: port && Number.isFinite(port) && port > 0 ? port : undefined,
      };
    }

    // Fallback: return as-is if no match
    return { url };
  } catch {
    return { url };
  }
}

/**
 * Build full stratum URL from base URL and port.
 * If port is provided separately, combine with URL.
 */
export function buildStratumUrl(baseUrl: string, port?: number): string {
  if (!baseUrl) return "";

  // If URL already contains port, return as-is
  if (baseUrl.includes(":")) {
    return baseUrl;
  }

  // If port is provided, append it
  if (port && Number.isFinite(port) && port > 0) {
    return `${baseUrl}:${port}`;
  }

  return baseUrl;
}

/**
 * Build MinerConfigModelInput from form state using miner-specific model.
 * Combines pool config (URL, user, password) with extra_config from MinerSettingsModel.
 * Handles worker name suffix: appends `.${workerName}` to `user` field.
 * Merges with existing `extra_config` to preserve other fields.
 */
export function buildMinerConfigFromFormWithModel(
  stratumState: StratumFormState,
  minerSettingsModel: MinerSettingsModel,
  existingExtraConfig?: Record<string, unknown> | null
): MinerConfigModelInput {
  const config: MinerConfigModelInput = {};

  // Build pool config
  const poolUrl = buildStratumUrl(stratumState.stratumURL, stratumState.stratumPort);
  if (poolUrl || stratumState.stratumUser || stratumState.stratumPassword) {
    config.pools = {
      groups: [
        {
          quota: 1,
          pools: [
            {
              url: poolUrl || "",
              user: stratumState.workerName
                ? `${stratumState.stratumUser}.${stratumState.workerName}`
                : stratumState.stratumUser,
              password: stratumState.stratumPassword || "",
            },
          ],
        },
      ],
    };
  }

  // Build extra_config from miner-specific model (always available, uses default for unknown types)
  const modelExtraConfig = minerSettingsModel.toExtraConfig();
  const extraConfig: Record<string, unknown> = {
    ...(existingExtraConfig && typeof existingExtraConfig === "object" && !Array.isArray(existingExtraConfig)
      ? existingExtraConfig
      : {}),
    ...modelExtraConfig,
  };

  // Only include extra_config if it has fields (preserve empty extra_config if it existed)
  if (Object.keys(extraConfig).length > 0 || (existingExtraConfig && Object.keys(existingExtraConfig).length === 0)) {
    config.extra_config = extraConfig;
  }

  return config;
}

/**
 * Build MinerConfigModelInput from form state (legacy function for backward compatibility).
 * Combines pool config (URL, user, password) with extra_config fields.
 * Handles worker name suffix: appends `.${workerName}` to `user` field.
 * Merges with existing `extra_config` to preserve other fields.
 * 
 * @deprecated Use buildMinerConfigFromFormWithModel instead for miner-specific validation.
 */
export function buildMinerConfigFromForm(
  stratumState: StratumFormState,
  extraConfigState: ExtraConfigFormState,
  existingExtraConfig?: Record<string, unknown> | null
): MinerConfigModelInput {
  const config: MinerConfigModelInput = {};

  // Build pool config
  const poolUrl = buildStratumUrl(stratumState.stratumURL, stratumState.stratumPort);
  if (poolUrl || stratumState.stratumUser || stratumState.stratumPassword) {
    config.pools = {
      groups: [
        {
          quota: 1,
          pools: [
            {
              url: poolUrl || "",
              user: stratumState.workerName
                ? `${stratumState.stratumUser}.${stratumState.workerName}`
                : stratumState.stratumUser,
              password: stratumState.stratumPassword || "",
            },
          ],
        },
      ],
    };
  }

  // Build extra_config (merge with existing to preserve other fields)
  const extraConfig: Record<string, unknown> = {
    ...(existingExtraConfig && typeof existingExtraConfig === "object" && !Array.isArray(existingExtraConfig)
      ? existingExtraConfig
      : {}),
  };

  if (extraConfigState.frequency !== undefined) {
    extraConfig.frequency = extraConfigState.frequency;
  }
  if (extraConfigState.coreVoltage !== undefined) {
    extraConfig.core_voltage = extraConfigState.coreVoltage;
  }
  if (extraConfigState.fanspeed !== undefined) {
    extraConfig.fanspeed = extraConfigState.fanspeed;
  }
  if (extraConfigState.autofanspeed !== undefined) {
    extraConfig.autofanspeed = extraConfigState.autofanspeed;
  }
  if (extraConfigState.flipscreen !== undefined) {
    extraConfig.flipscreen = extraConfigState.flipscreen;
  }
  if (extraConfigState.invertfanpolarity !== undefined) {
    extraConfig.invertfanpolarity = extraConfigState.invertfanpolarity;
  }

  if (Object.keys(extraConfig).length > 0) {
    config.extra_config = extraConfig;
  }

  return config;
}
