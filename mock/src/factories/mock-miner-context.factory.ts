import { MockMinerContext } from "../contexts/mock-miner-context";
import { AxeosMockMinerStrategy } from "../strategies/axeos-mock-miner-strategy";
import { DeviceApiVersion } from "../types/axeos.types";

export type SupportedMinerType = "axeos";

export const DEFAULT_MINER_TYPE: SupportedMinerType = "axeos";

export interface MockMinerContextFactoryOptions {
  minerType?: SupportedMinerType;
  hostname: string;
  startTime: Date;
  apiVersion?: DeviceApiVersion;
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
    case "axeos":
    default: {
      const strategy = new AxeosMockMinerStrategy(
        options.apiVersion ?? DeviceApiVersion.Legacy
      );

      return new MockMinerContext({
        strategy,
        hostname: options.hostname,
        startTime: options.startTime,
      });
    }
  }
};

