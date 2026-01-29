/**
 * Thin HTTP client for pyasic-bridge.
 *
 * This keeps all communication with the pyasic-bridge FastAPI service
 * behind a small, testable abstraction that controllers can depend on.
 */

import { logger } from "@pluto/logger";
import axios from "axios";
import { config } from "../config/environment";

export interface PyasicBridgeClient {
  restartMiner(ip: string): Promise<void>;
  updateMinerConfig(
    ip: string,
    payload: Record<string, unknown>
  ): Promise<void>;
}

class HttpPyasicBridgeClient implements PyasicBridgeClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  async restartMiner(ip: string): Promise<void> {
    // Unified endpoint - mock devices are handled transparently by pyasic-bridge
    const url = `${this.baseUrl}/miner/${ip}/restart`;

    logger.info("Calling pyasic-bridge restartMiner", {
      ip,
      url,
    });
    await axios.post(url);
  }

  async updateMinerConfig(
    ip: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    // Unified endpoint - mock devices are handled transparently by pyasic-bridge
    const url = `${this.baseUrl}/miner/${ip}/config`;

    logger.info("Calling pyasic-bridge updateMinerConfig", {
      ip,
      url,
      payloadKeys: Object.keys(payload || {}),
    });

    await axios.patch(url, payload);
  }
}

export const pyasicBridgeClient: PyasicBridgeClient = new HttpPyasicBridgeClient(
  config.pyasicBridgeHost
);

