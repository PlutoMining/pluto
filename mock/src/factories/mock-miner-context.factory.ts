import { MockMinerContext } from "../contexts/mock-miner-context";
import { GenericMockMinerStrategy } from "../strategies/generic-mock-miner-strategy";
import { AxeosMockMinerStrategy } from "../strategies/axeos-mock-miner-strategy";
import { DeviceApiVersion } from "../types/axeos.types";

export type SupportedMinerType = "generic" | "axeos";

export const DEFAULT_MINER_TYPE: SupportedMinerType = "generic";

export interface MockMinerContextFactoryOptions {
  minerType?: SupportedMinerType;
  hostname: string;
  startTime: Date;
  apiVersion?: DeviceApiVersion;
  systemInfoOverrides?: Record<string, unknown>;
}

/**
 * Factory responsible for instantiating `MockMinerContext` with the
 * appropriate strategy for the desired miner type.
 */
export const createMockMinerContext = (
  options: MockMinerContextFactoryOptions
): MockMinerContext<unknown> => {
  const minerType = options.minerType ?? DEFAULT_MINER_TYPE;

  switch (minerType) {
    case "axeos": {
      const strategy = new AxeosMockMinerStrategy(
        options.apiVersion ?? DeviceApiVersion.Legacy
      );
      return new MockMinerContext({
        strategy,
        hostname: options.hostname,
        startTime: options.startTime,
        initialSystemInfo: options.systemInfoOverrides,
      });
    }

    case "generic":
    default: {
      const strategy = new GenericMockMinerStrategy();
      return new MockMinerContext({
        strategy,
        hostname: options.hostname,
        startTime: options.startTime,
        initialSystemInfo: options.systemInfoOverrides,
      });
    }
  }
};
