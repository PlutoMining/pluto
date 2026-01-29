/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { logger } from "@pluto/logger";
import axios from "axios";
import { config } from "../config/environment";
import { MinerValidationResult } from "./device-converter.service";

/**
 * Service for validating miners using pyasic-bridge.
 * 
 * Handles communication with pyasic-bridge service to validate
 * whether devices are supported miners.
 */
export class MinerValidationService {
  /**
   * Validate a single IP address.
   * 
   * @param ip - IP address to validate
   * @returns Validation result or null if validation fails
   */
  static async validateSingleIp(ip: string): Promise<MinerValidationResult | null> {
    try {
      const response = await axios.post<MinerValidationResult[]>(
        `${config.pyasicBridgeHost}/miners/validate`,
        { ips: [ip] },
        { timeout: config.pyasicValidationTimeout }
      );

      return response.data[0] || null;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === "ECONNABORTED") {
          logger.error(`Validation request for ${ip} timed out.`);
        } else if (error.response) {
          logger.error(
            `Pyasic-bridge returned error for ${ip}: ${error.response.status} ${error.response.statusText}`
          );
        } else {
          logger.error(`Failed to validate ${ip}:`, error.message);
        }
      } else {
        logger.error(
          `Unexpected error while validating ${ip}:`,
          error instanceof Error ? error.message : String(error)
        );
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
  static async validateBatch(ips: string[]): Promise<MinerValidationResult[]> {
    if (ips.length === 0) {
      return [];
    }

    try {
      // Timeout: base timeout + (timeout per IP * number of IPs), with a max of 30 seconds
      const chunkTimeout = Math.min(
        config.pyasicValidationTimeout + (config.pyasicValidationTimeout * ips.length),
        30000
      );

      const response = await axios.post<MinerValidationResult[]>(
        `${config.pyasicBridgeHost}/miners/validate`,
        { ips },
        { timeout: chunkTimeout }
      );

      return response.data || [];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === "ECONNABORTED") {
          logger.error(`Validation request for batch timed out.`);
        } else if (error.response) {
          logger.error(
            `Pyasic-bridge returned error: ${error.response.status} ${error.response.statusText}`
          );
        } else {
          logger.error(`Failed to validate batch:`, error.message);
        }
      } else {
        logger.error(
          `Unexpected error while validating batch:`,
          error instanceof Error ? error.message : String(error)
        );
      }
      // Return empty results on error
      return [];
    }
  }

  /**
   * Fetch full miner data for a validated IP.
   * 
   * @param ip - IP address of the validated miner
   * @returns Miner data object or empty object if fetch fails
   */
  static async fetchMinerData(ip: string): Promise<any> {
    try {
      const response = await axios.get(
        `${config.pyasicBridgeHost}/miner/${ip}/data`,
        { timeout: config.pyasicValidationTimeout }
      );
      return response.data || {};
    } catch (error) {
      logger.warn(`Failed to fetch full data for miner ${ip}, using minimal data:`, error);
      return {};
    }
  }
}
