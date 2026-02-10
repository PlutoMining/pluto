/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { logger } from "@pluto/logger";
import type {
  MinerData,
  MinerConfigModelInput,
  ConfigValidationResponse,
} from "@pluto/pyasic-bridge-client";
import {
  getMinerDataMinerIpDataGet,
  updateMinerConfigMinerIpConfigPatch,
  restartMinerMinerIpRestartPost,
  validateMinerConfigMinerIpConfigValidatePost,
} from "@pluto/pyasic-bridge-client";
import WebSocket from "ws";
import { config } from "../config/environment";

/**
 * Interface for pyasic-bridge service following Dependency Inversion Principle.
 * Allows easy mocking in tests.
 */
export interface IPyasicBridgeService {
  /**
   * Fetch miner data for a given IP address.
   * @param ip - IP address of the miner
   * @returns Miner data or null if fetch fails
   */
  fetchMinerData(ip: string): Promise<MinerData | null>;

  /**
   * Update miner configuration.
   * @param ip - IP address of the miner
   * @param config - Configuration to update
   * @throws Error if update fails
   */
  updateMinerConfig(ip: string, config: MinerConfigModelInput): Promise<void>;

  /**
   * Restart a miner.
   * @param ip - IP address of the miner
   * @throws Error if restart fails
   */
  restartMiner(ip: string): Promise<void>;

  /**
   * Validate miner configuration without applying it.
   * @param ip - IP address of the miner
   * @param config - Configuration to validate
   * @returns Validation result with valid flag and errors array
   * @throws Error if validation request fails
   */
  validateMinerConfig(ip: string, config: MinerConfigModelInput): Promise<ConfigValidationResponse>;

  /**
   * Connect to pyasic-bridge WebSocket for miner logs.
   * @param ip - IP address of the miner
   * @param onMessage - Callback for log messages
   * @param onError - Callback for errors
   * @param onClose - Callback for connection close
   * @returns Cleanup function to close the connection
   */
  connectMinerLogsWebSocket(
    ip: string,
    onMessage: (message: string) => void,
    onError: (error: Error) => void,
    onClose: () => void
  ): Promise<() => void>;
}

/**
 * Implementation of pyasic-bridge service.
 * Handles all communication with pyasic-bridge service.
 */
class PyasicBridgeService implements IPyasicBridgeService {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async fetchMinerData(ip: string): Promise<MinerData | null> {
    try {
      logger.debug(`Fetching miner data for ${ip} from ${this.baseUrl}`);
      const result = await getMinerDataMinerIpDataGet({
        baseUrl: this.baseUrl,
        path: { ip },
        responseStyle: "data",
        throwOnError: false,
      });

      if (result && typeof result === "object" && "ip" in result) {
        logger.debug(`Successfully fetched miner data for ${ip}`);
        return result as MinerData;
      }
      return null;
    } catch (error) {
      logger.error(`Failed to fetch miner data for ${ip} via pyasic-bridge:`, error);
      if (error instanceof Error) {
        logger.error(`Error details: ${error.message}`);
      }
      return null;
    }
  }

  async updateMinerConfig(ip: string, config: MinerConfigModelInput): Promise<void> {
    try {
      logger.debug(`Updating miner config for ${ip} via ${this.baseUrl}`);
      await updateMinerConfigMinerIpConfigPatch({
        baseUrl: this.baseUrl,
        path: { ip },
        body: config,
        responseStyle: "data",
        throwOnError: true,
      });
      logger.info(`Successfully updated miner config for ${ip}`);
    } catch (error) {
      logger.error(`Failed to update miner config for ${ip} via pyasic-bridge:`, error);
      if (error instanceof Error) {
        throw new Error(`Failed to update miner config: ${error.message}`);
      }
      throw error;
    }
  }

  async restartMiner(ip: string): Promise<void> {
    try {
      logger.debug(`Restarting miner ${ip} via ${this.baseUrl}`);
      await restartMinerMinerIpRestartPost({
        baseUrl: this.baseUrl,
        path: { ip },
        responseStyle: "data",
        throwOnError: true,
      });
      logger.info(`Successfully restarted miner ${ip}`);
    } catch (error) {
      logger.error(`Failed to restart miner ${ip} via pyasic-bridge:`, error);
      if (error instanceof Error) {
        throw new Error(`Failed to restart miner: ${error.message}`);
      }
      throw error;
    }
  }

  async validateMinerConfig(ip: string, config: MinerConfigModelInput): Promise<ConfigValidationResponse> {
    try {
      logger.debug(`Validating miner config for ${ip} via ${this.baseUrl}`);
      const result = await validateMinerConfigMinerIpConfigValidatePost({
        baseUrl: this.baseUrl,
        path: { ip },
        body: config,
        responseStyle: "data",
        throwOnError: true,
      });

      // With responseStyle: "data", the generated client returns an object that
      // includes the typed response data on `.data`. Tests also mock this shape.
      const { data } = result as unknown as { data: ConfigValidationResponse };
      const validationResult = data;
      logger.debug(
        `Validation result for ${ip}: valid=${validationResult.valid}, errors=${
          validationResult.errors?.length || 0
        }`
      );
      return validationResult;
    } catch (error) {
      logger.error(`Failed to validate miner config for ${ip} via pyasic-bridge:`, error);
      if (error instanceof Error) {
        throw new Error(`Failed to validate miner config: ${error.message}`);
      }
      throw error;
    }
  }

  async connectMinerLogsWebSocket(
    ip: string,
    onMessage: (message: string) => void,
    onError: (error: Error) => void,
    onClose: () => void
  ): Promise<() => void> {
    // Convert HTTP baseUrl to WebSocket URL
    const wsUrl = this.baseUrl.replace(/^http/, "ws") + `/ws/miner/${ip}`;
    
    logger.debug(`Connecting to pyasic-bridge WebSocket for ${ip} at ${wsUrl}`);
    
    const ws = new WebSocket(wsUrl);

    ws.on("open", () => {
      logger.debug(`Connected to pyasic-bridge WebSocket for IP ${ip}`);
    });

    ws.on("message", (data: WebSocket.Data) => {
      const messageString = data.toString();
      logger.debug(`Received log message for IP ${ip}: ${messageString.substring(0, 100)}...`);
      onMessage(messageString);
    });

    ws.on("error", (error: Error) => {
      logger.error(`WebSocket error for IP ${ip}:`, error);
      onError(error);
    });

    ws.on("close", () => {
      logger.debug(`WebSocket closed for IP ${ip}`);
      onClose();
    });

    // Return cleanup function
    return () => {
      logger.debug(`Closing WebSocket connection for IP ${ip}`);
      ws.close();
    };
  }
}

// Create singleton instance
let serviceInstance: IPyasicBridgeService | null = null;

/**
 * Get or create the pyasic-bridge service instance.
 * @param baseUrl - Base URL for pyasic-bridge service (optional, uses config if not provided)
 * @returns Service instance
 */
export function getPyasicBridgeService(baseUrl?: string): IPyasicBridgeService {
  if (!serviceInstance) {
    const url = baseUrl || config.pyasicBridgeHost;
    serviceInstance = new PyasicBridgeService(url);
  }
  return serviceInstance;
}

// Export default instance getter
export const pyasicBridgeService = getPyasicBridgeService();
