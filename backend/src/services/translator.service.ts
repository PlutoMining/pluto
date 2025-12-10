/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { logger } from "@pluto/logger";
import { Device } from "@pluto/interfaces";
import { parseStratumURL, buildStratumV2URL } from "@pluto/utils";
import * as fs from "fs/promises";
import * as path from "path";

// In development, use relative paths; in production/Docker, use absolute paths
const TRANSLATOR_CONFIG_PATH = process.env.TRANSLATOR_CONFIG_PATH || 
  (process.env.NODE_ENV === 'production' ? "/etc/translator/tproxy-config.toml" : "./translator/config/tproxy-config.toml");
const JDC_CONFIG_PATH = process.env.JDC_CONFIG_PATH || 
  (process.env.NODE_ENV === 'production' ? "/etc/jdc/jdc-config.toml" : "./jdc/config/jdc-config.toml");
const TRANSLATOR_UPSTREAM_PORT = 34255;
const JDC_UPSTREAM_PORT = 34265;

export interface TranslatorConfig {
  upstream: {
    listen_address: string;
    listen_port: number;
  };
  downstream: {
    pool_address: string;
    pool_port: number;
    authority_public_key: string;
  };
  reconnect_interval_secs?: number;
  max_reconnect_attempts?: number;
  logging?: {
    level: string;
  };
}

export interface JDCConfig {
  upstream: {
    listen_address: string;
    listen_port: number;
  };
  downstream: {
    pool_address: string;
    pool_port: number;
    authority_public_key: string;
  };
  reconnect_interval_secs?: number;
  max_reconnect_attempts?: number;
  logging?: {
    level: string;
  };
}

/**
 * Updates translator configuration based on device SV2 pool settings
 */
export async function updateTranslatorConfig(device: Device): Promise<void> {
  try {
    if (device.info.stratumProtocolVersion !== 'v2') {
      logger.debug(`Device ${device.mac} is not using SV2, skipping translator config update`);
      return;
    }

    if (!device.info.stratumURL || !device.info.stratumAuthorityKey) {
      logger.warn(`Device ${device.mac} has SV2 protocol but missing URL or authority key`);
      return;
    }

    // Parse the SV2 URL to extract pool details
    const parsed = parseStratumURL(device.info.stratumURL);
    
    if (parsed.protocolVersion !== 'v2' || !parsed.authorityKey) {
      logger.warn(`Device ${device.mac} SV2 URL is invalid or missing authority key`);
      return;
    }

    // Read existing config
    let config: TranslatorConfig;
    try {
      const configContent = await fs.readFile(TRANSLATOR_CONFIG_PATH, 'utf-8');
      config = parseTomlConfig(configContent) as TranslatorConfig;
    } catch (error) {
      // In development, config might not exist yet - create default structure
      logger.debug(`Could not read translator config, creating default: ${error}`);
      config = {
        upstream: {
          listen_address: "0.0.0.0",
          listen_port: TRANSLATOR_UPSTREAM_PORT,
        },
        downstream: {
          pool_address: parsed.host,
          pool_port: parsed.port,
          authority_public_key: parsed.authorityKey,
        },
        reconnect_interval_secs: 5,
        max_reconnect_attempts: 10,
        logging: { level: "info" },
      };
    }

    // Update downstream configuration
    config.downstream.pool_address = parsed.host;
    config.downstream.pool_port = parsed.port;
    config.downstream.authority_public_key = parsed.authorityKey;

    // Write updated config
    try {
      const configToml = generateTomlConfig(config);
      // Ensure directory exists
      const configDir = path.dirname(TRANSLATOR_CONFIG_PATH);
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(TRANSLATOR_CONFIG_PATH, configToml, 'utf-8');
      logger.info(`Updated translator config for device ${device.mac} to pool ${parsed.host}:${parsed.port}`);
    } catch (error) {
      // In Docker, config is mounted read-only, so we can't write
      // Log warning but don't fail - translator will use its existing config
      logger.warn(`Could not write translator config (may be read-only mount): ${error}`);
    }
  } catch (error) {
    logger.error(`Error updating translator config for device ${device.mac}:`, error);
    throw error;
  }
}

/**
 * Updates JDC configuration based on device SV2 pool settings
 */
export async function updateJDCConfig(device: Device): Promise<void> {
  try {
    if (device.info.stratumProtocolVersion !== 'v2') {
      logger.debug(`Device ${device.mac} is not using SV2, skipping JDC config update`);
      return;
    }

    if (!device.info.stratumURL || !device.info.stratumAuthorityKey) {
      logger.warn(`Device ${device.mac} has SV2 protocol but missing URL or authority key`);
      return;
    }

    // Parse the SV2 URL to extract pool details
    const parsed = parseStratumURL(device.info.stratumURL);
    
    if (parsed.protocolVersion !== 'v2' || !parsed.authorityKey) {
      logger.warn(`Device ${device.mac} SV2 URL is invalid or missing authority key`);
      return;
    }

    // Read existing config
    let config: JDCConfig;
    try {
      const configContent = await fs.readFile(JDC_CONFIG_PATH, 'utf-8');
      config = parseTomlConfig(configContent) as JDCConfig;
    } catch (error) {
      // In development, config might not exist yet - create default structure
      logger.debug(`Could not read JDC config, creating default: ${error}`);
      config = {
        upstream: {
          listen_address: "0.0.0.0",
          listen_port: JDC_UPSTREAM_PORT,
        },
        downstream: {
          pool_address: parsed.host,
          pool_port: parsed.port,
          authority_public_key: parsed.authorityKey,
        },
        reconnect_interval_secs: 5,
        max_reconnect_attempts: 10,
        logging: { level: "info" },
      };
    }

    // Update downstream configuration
    config.downstream.pool_address = parsed.host;
    config.downstream.pool_port = parsed.port;
    config.downstream.authority_public_key = parsed.authorityKey;

    // Write updated config
    try {
      const configToml = generateTomlConfig(config);
      // Ensure directory exists
      const configDir = path.dirname(JDC_CONFIG_PATH);
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(JDC_CONFIG_PATH, configToml, 'utf-8');
      logger.info(`Updated JDC config for device ${device.mac} to pool ${parsed.host}:${parsed.port}`);
    } catch (error) {
      // In Docker, config is mounted read-only, so we can't write
      // Log warning but don't fail - JDC will use its existing config
      logger.warn(`Could not write JDC config (may be read-only mount): ${error}`);
    }
  } catch (error) {
    logger.error(`Error updating JDC config for device ${device.mac}:`, error);
    throw error;
  }
}

/**
 * Determines the connection URL for a device based on protocol version
 * Returns translator/JDC URL for SV2, or original URL for SV1
 */
export function getDeviceConnectionURL(device: Device): { url: string; port: number } {
  if (device.info.stratumProtocolVersion === 'v2') {
    // For SV2, route through translator (SV1 -> SV2) or JDC (SV2 -> SV2)
    // Default to translator for now (can be made configurable later)
    const useJDC = process.env.ENABLE_JDC === 'true';
    
    if (useJDC) {
      // Route through JDC (SV2 -> SV2)
      return {
        url: 'localhost', // JDC listening address
        port: JDC_UPSTREAM_PORT,
      };
    } else {
      // Route through translator (SV1 -> SV2)
      return {
        url: 'localhost', // Translator listening address
        port: TRANSLATOR_UPSTREAM_PORT,
      };
    }
  }

  // For SV1, use original URL and port
  return {
    url: device.info.stratumURL || '',
    port: device.info.stratumPort || 3333,
  };
}

/**
 * Simple TOML parser for basic config structures
 * Note: This is a simplified parser. For production, consider using a proper TOML library
 */
function parseTomlConfig(content: string): any {
  const config: any = {};
  let currentSection: string | null = null;

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Section header
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      currentSection = trimmed.slice(1, -1);
      if (!config[currentSection]) {
        config[currentSection] = {};
      }
      continue;
    }

    // Key-value pair
    const match = trimmed.match(/^(\w+)\s*=\s*(.+)$/);
    if (match) {
      const key = match[1];
      let value: any = match[2].trim();

      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      } else if (value === 'true') {
        value = true;
      } else if (value === 'false') {
        value = false;
      } else if (!isNaN(Number(value))) {
        value = Number(value);
      }

      if (currentSection) {
        config[currentSection][key] = value;
      } else {
        config[key] = value;
      }
    }
  }

  return config;
}

/**
 * Simple TOML generator for basic config structures
 */
function generateTomlConfig(config: any): string {
  const lines: string[] = [];
  
  for (const [section, values] of Object.entries(config)) {
    if (typeof values === 'object' && values !== null && !Array.isArray(values)) {
      lines.push(`[${section}]`);
      for (const [key, value] of Object.entries(values)) {
        if (typeof value === 'string') {
          lines.push(`${key} = "${value}"`);
        } else {
          lines.push(`${key} = ${value}`);
        }
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}
