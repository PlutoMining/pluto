/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { logger } from "@pluto/logger";
import type { MinerData, PbMinerData, PbValidationResult } from "@pluto/interfaces";
import { config } from "../config/environment";

export type MinerValidationResult = PbValidationResult;

/* ----- Service ---------------------------------------------------------- */

/**
 * Validates miners using pyasic-bridge REST API (direct HTTP).
 */
export class MinerValidationService {
  static async validateSingleIp(ip: string): Promise<MinerValidationResult | null> {
    try {
      logger.info(`Validating single IP ${ip} via pyasic-bridge at ${config.pyasicBridgeHost}`);
      const res = await fetch(`${config.pyasicBridgeHost}/miners/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ips: [ip] }),
        signal: AbortSignal.timeout(config.pyasicValidationTimeout + 5000),
      });
      if (!res.ok) return null;
      const data: MinerValidationResult[] = await res.json();
      return data?.[0] ?? null;
    } catch (error) {
      logger.error(`Failed to validate IP ${ip} via pyasic-bridge:`, error);
      return null;
    }
  }

  static async validateBatch(ips: string[]): Promise<MinerValidationResult[]> {
    if (ips.length === 0) return [];

    try {
      logger.info(`Validating batch of ${ips.length} IPs via pyasic-bridge at ${config.pyasicBridgeHost}...`);

      const chunkTimeout = Math.min(
        config.pyasicValidationTimeout + config.pyasicValidationTimeout * ips.length,
        30000
      );

      const res = await fetch(`${config.pyasicBridgeHost}/miners/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ips }),
        signal: AbortSignal.timeout(chunkTimeout),
      });
      if (!res.ok) {
        logger.error(`pyasic-bridge validation returned ${res.status}`);
        return [];
      }
      const data: MinerValidationResult[] = await res.json();

      const validatedCount = data.filter((r) => r.is_miner).length;
      logger.info(`Validation complete: ${validatedCount} of ${ips.length} IPs are valid miners`);

      return data;
    } catch (error) {
      logger.error(`Error validating batch via pyasic-bridge:`, error);
      return [];
    }
  }

  static async fetchMinerData(ip: string): Promise<MinerData | null> {
    try {
      logger.debug(`Fetching miner data for ${ip} from ${config.pyasicBridgeHost}`);
      const res = await fetch(`${config.pyasicBridgeHost}/miner/${ip}/data`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return null;
      const raw: PbMinerData = await res.json();

      if (!raw || !raw.ip) return null;

      const minerData: MinerData = {
        ip: raw.ip,
        mac: raw.mac ?? undefined,
        hostname: raw.hostname ?? undefined,
        deviceInfo: raw.device_info
          ? {
              make: raw.device_info.make ?? undefined,
              model: raw.device_info.model ?? undefined,
              firmware: raw.device_info.firmware ?? undefined,
              algo: raw.device_info.algo ?? undefined,
            }
          : undefined,
        serialNumber: raw.serial_number ?? undefined,
        hashrate: raw.hashrate
          ? { rate: raw.hashrate.rate ?? undefined, unit: raw.hashrate.unit ?? undefined }
          : undefined,
        expectedHashrate: raw.expected_hashrate
          ? { rate: raw.expected_hashrate.rate ?? undefined, unit: raw.expected_hashrate.unit ?? undefined }
          : undefined,
        wattage: raw.wattage ?? undefined,
        wattageLimit: raw.wattage_limit ?? undefined,
        voltage: raw.voltage ?? undefined,
        temperatureAvg: raw.temperature_avg ?? undefined,
        envTemp: raw.env_temp ?? undefined,
        sharesAccepted: raw.shares_accepted ?? undefined,
        sharesRejected: raw.shares_rejected ?? undefined,
        bestDifficulty: raw.best_difficulty ?? undefined,
        bestSessionDifficulty: raw.best_session_difficulty ?? undefined,
        networkDifficulty: raw.network_difficulty ?? undefined,
        fans: (raw.fans ?? []).map((f) => ({ speed: f.speed ?? undefined })),
        hashboards: (raw.hashboards ?? []).map((h) => ({
          slot: h.slot ?? undefined,
          temp: h.temp ?? undefined,
          chipTemp: h.chip_temp ?? undefined,
          chips: h.chips ?? undefined,
          expectedChips: h.expected_chips ?? undefined,
          serialNumber: h.serial_number ?? undefined,
          missing: h.missing ?? undefined,
          active: h.active ?? undefined,
          voltage: h.voltage ?? undefined,
        })),
        totalChips: raw.total_chips ?? undefined,
        expectedChips: raw.expected_chips ?? undefined,
        expectedHashboards: raw.expected_hashboards ?? undefined,
        expectedFans: raw.expected_fans ?? undefined,
        isMining: raw.is_mining ?? undefined,
        uptime: raw.uptime ?? undefined,
        nominal: raw.nominal ?? undefined,
        fwVer: raw.fw_ver ?? undefined,
        apiVer: raw.api_ver ?? undefined,
        datetime: raw.datetime ?? undefined,
        timestamp: raw.timestamp ?? undefined,
        pools: raw.config?.pools
          ? {
              groups: (raw.config.pools.groups ?? []).map((g) => ({
                pools: (g.pools ?? []).map((p) => ({
                  url: p.url ?? undefined,
                  user: p.user ?? undefined,
                  password: p.password ?? undefined,
                })),
                quota: g.quota ?? undefined,
              })),
            }
          : undefined,
      };

      logger.debug(`Successfully fetched miner data for ${ip}`);
      return minerData;
    } catch (error) {
      logger.warn(`Could not fetch miner data for ${ip} via pyasic-bridge:`, error);
      return null;
    }
  }
}
