/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { logger } from "@pluto/logger";
import {
  validateMinersMinersValidatePost,
  getMinerDataMinerIpDataGet,
  type ValidateRequest,
  type ValidateResponse,
  type MinerData,
} from "@pluto/pyasic-bridge-client";
import { config } from "../config/environment";

/**
 * Service for validating miners using pyasic-bridge TypeScript client.
 * 
 * Handles communication with pyasic-bridge service to validate
 * whether devices are supported miners and fetch miner data.
 */
export class MinerValidationService {
  /**
   * Validate a single IP address.
   * 
   * @param ip - IP address to validate
   * @returns Validation result or null if validation fails
   */
  static async validateSingleIp(ip: string): Promise<ValidateResponse[0] | null> {
    try {
      logger.info(`Validating single IP ${ip} via pyasic-bridge at ${config.pyasicBridgeHost}`);
      const result = await validateMinersMinersValidatePost({
        baseUrl: config.pyasicBridgeHost,
        body: { ips: [ip] } satisfies ValidateRequest,
        responseStyle: "data",
        throwOnError: true,
      });

      // When responseStyle is "data", result should be ValidateResponse directly
      const response = Array.isArray(result) ? result : (result as any).data || result;
      return response[0] || null;
    } catch (error) {
      logger.error(`Failed to validate IP ${ip} via pyasic-bridge at ${config.pyasicBridgeHost}:`, error);
      if (error instanceof Error) {
        logger.error(`Error details: ${error.message} (${error.name})`);
      }
      return null;
    }
  }

  /**
   * Validate multiple IP addresses in a batch.
   * 
   * @param ips - Array of IP addresses to validate
   * @returns Array of validation results
   */
  static async validateBatch(ips: string[]): Promise<ValidateResponse> {
    if (ips.length === 0) {
      return [];
    }

    try {
      logger.info(
        `Validating batch of ${ips.length} IPs via pyasic-bridge at ${config.pyasicBridgeHost}...`
      );
      
      // Calculate timeout: base timeout + (timeout per IP * number of IPs), with a max of 30 seconds
      const chunkTimeout = Math.min(
        config.pyasicValidationTimeout + (config.pyasicValidationTimeout * ips.length),
        30000
      );

      logger.debug(`Using timeout: ${chunkTimeout}ms for batch of ${ips.length} IPs`);

      const result = await validateMinersMinersValidatePost({
        baseUrl: config.pyasicBridgeHost,
        body: { ips } satisfies ValidateRequest,
        responseStyle: "data",
        throwOnError: true,
      });

      // When responseStyle is "data", result should be ValidateResponse directly
      const response = Array.isArray(result) ? result : (result as any).data || result;
      const validatedCount = response.filter((r: ValidateResponse[0]) => r.is_miner).length;
      logger.info(
        `Validation complete: ${validatedCount} of ${ips.length} IPs are valid miners`
      );

      return response as ValidateResponse;
    } catch (error) {
      logger.error(
        `Error validating batch via pyasic-bridge at ${config.pyasicBridgeHost}:`,
        error
      );
      if (error instanceof Error) {
        logger.error(`Error message: ${error.message}`);
        logger.error(`Error name: ${error.name}`);
        if ("code" in error) {
          logger.error(`Error code: ${error.code}`);
        }
      }
      // Return empty results on error
      return [];
    }
  }

  /**
   * Fetch full miner data for a validated IP.
   * 
   * @param ip - IP address of the validated miner
   * @returns Miner data object or null if fetch fails
   */
  static async fetchMinerData(ip: string): Promise<MinerData | null> {
    try {
      logger.debug(`Fetching miner data for ${ip} from ${config.pyasicBridgeHost}`);
      const result = await getMinerDataMinerIpDataGet({
        baseUrl: config.pyasicBridgeHost,
        path: { ip },
        responseStyle: "data",
        throwOnError: false, // Don't throw, return null on error
      });

      if (result && typeof result === "object" && "ip" in result) {
        logger.debug(`Successfully fetched miner data for ${ip}`);
        return result as MinerData;
      }
      return null;
    } catch (error) {
      logger.warn(`Could not fetch miner data for ${ip} via pyasic-bridge:`, error);
      if (error instanceof Error) {
        logger.warn(`Error details: ${error.message}`);
      }
      return null;
    }
  }
}
