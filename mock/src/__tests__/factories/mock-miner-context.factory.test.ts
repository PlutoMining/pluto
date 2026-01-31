import { DeviceApiVersion } from "@/types/axeos.types";

jest.mock("@/config/environment", () => ({
  config: {
    listingPort: 7000,
    ports: [9001, 9002],
    logsPubEnabled: false,
  },
}));

jest.mock("@/strategies/axeos-mock-miner-strategy");

import { createMockMinerContext, DEFAULT_MINER_TYPE } from "@/factories/mock-miner-context.factory";
import { AxeosMockMinerStrategy } from "@/strategies/axeos-mock-miner-strategy";

const AxeosMockMinerStrategyMock = AxeosMockMinerStrategy as jest.MockedClass<
  typeof AxeosMockMinerStrategy
>;

describe("createMockMinerContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a context with AxeosMockMinerStrategy by default", () => {
    const startTime = new Date("2024-01-01T00:00:00.000Z");

    const context = createMockMinerContext({
      hostname: "mockaxe1",
      startTime,
    });

    expect(AxeosMockMinerStrategyMock).toHaveBeenCalledWith(DeviceApiVersion.Legacy);
    // Sanity check that we got a context back and it exposes hostname
    expect(context.getHostname()).toBe("mockaxe1");
  });

  it("uses provided apiVersion when creating Axeos strategy", () => {
    const startTime = new Date("2024-01-01T00:00:00.000Z");

    createMockMinerContext({
      hostname: "mockaxe2",
      startTime,
      apiVersion: DeviceApiVersion.New,
    });

    expect(AxeosMockMinerStrategyMock).toHaveBeenCalledWith(DeviceApiVersion.New);
  });

  it("respects DEFAULT_MINER_TYPE constant", () => {
    expect(DEFAULT_MINER_TYPE).toBe("axeos");
  });
});

