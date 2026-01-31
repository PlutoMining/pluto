import type { MockMinerStrategy } from "../strategies/mock-miner-strategy.interface";

interface MockMinerContextOptions<TMinerInfo> {
  strategy: MockMinerStrategy<TMinerInfo>;
  hostname: string;
  startTime?: Date;
  initialSystemInfo?: Partial<TMinerInfo>;
}

/**
 * Runtime context for a single mock miner instance.
 *
 * Holds per-miner state (hostname, start time, overrides) and delegates
 * behaviour to a `MockMinerStrategy`.
 */
export class MockMinerContext<TMinerInfo> {
  private readonly strategy: MockMinerStrategy<TMinerInfo>;
  private readonly hostname: string;
  private readonly startTime: Date;
  private systemInfo: Partial<TMinerInfo>;

  constructor(options: MockMinerContextOptions<TMinerInfo>) {
    this.strategy = options.strategy;
    this.hostname = options.hostname;
    this.startTime = options.startTime ?? new Date();
    this.systemInfo = options.initialSystemInfo ?? {};
  }

  getSystemInfo(): Partial<TMinerInfo> {
    const uptimeSeconds = this.getUptimeSeconds();
    return this.strategy.generateSystemInfo(this.hostname, uptimeSeconds, this.systemInfo);
  }

  patchSystemInfo(updates: Partial<TMinerInfo>): void {
    this.systemInfo = {
      ...this.systemInfo,
      ...updates,
    };
  }

  getUptimeSeconds(): number {
    const now = new Date();
    const diffMs = now.getTime() - this.startTime.getTime();
    return Math.floor(diffMs / 1000);
  }

  getHostname(): string {
    return this.hostname;
  }

  getMinerType(): string {
    return this.strategy.getMinerType();
  }

  getApiVersion(): string {
    return this.strategy.getApiVersion();
  }

  getRootHtml(): string {
    return this.strategy.getRootHtml();
  }

  /**
   * Expose current overrides for testing and advanced callers.
   */
  getSystemInfoOverrides(): Partial<TMinerInfo> {
    return this.systemInfo;
  }
}

