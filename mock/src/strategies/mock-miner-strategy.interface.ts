/**
 * Strategy interface for mock miner behaviours.
 *
 * Each miner family (e.g. AxeOS, Bitaxe, etc.) should provide its own
 * implementation of this interface. The mock worker and controllers only
 * depend on this abstraction, not on concrete miner types.
 */

export interface MockMinerStrategy<TMinerInfo> {
  /**
   * Generate miner-specific system information snapshot.
   *
   * @param hostname - Miner hostname (e.g. "mockaxe1")
   * @param uptimeSeconds - Current uptime in seconds
   * @param systemInfo - Partial overrides persisted for this miner
   */
  generateSystemInfo(
    hostname: string,
    uptimeSeconds: number,
    systemInfo: Partial<TMinerInfo>
  ): Partial<TMinerInfo>;

  /**
   * Return a stable identifier for the API version used by this strategy.
   * For AxeOS this matches `DeviceApiVersion` values.
   */
  getApiVersion(): string;

  /**
   * Return the miner type handled by this strategy (e.g. "axeos").
   */
  getMinerType(): string;

  /**
   * Generate HTML response for the root route (GET /).
   * Used by detection libraries (e.g. pyasic) to identify miner type.
   *
   * @returns HTML string to return for the root endpoint
   */
  getRootHtml(): string;
}

