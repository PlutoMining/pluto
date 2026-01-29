import { MockMinerContext } from "@/contexts/mock-miner-context";
import type { MockMinerStrategy } from "@/strategies/mock-miner-strategy.interface";

interface TestInfo {
  value?: number;
  label?: string;
}

const createStrategyMock = (): jest.Mocked<MockMinerStrategy<TestInfo>> => ({
  generateSystemInfo: jest.fn(),
  getApiVersion: jest.fn().mockReturnValue("v1"),
  getMinerType: jest.fn().mockReturnValue("test-miner"),
  getRootHtml: jest.fn().mockReturnValue(""),
});

describe("MockMinerContext", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-01-01T00:00:10.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("delegates getSystemInfo to strategy with hostname, uptime and overrides", () => {
    const strategy = createStrategyMock();
    strategy.generateSystemInfo.mockReturnValue({ value: 42 });

    const startTime = new Date("2024-01-01T00:00:00.000Z");
    const context = new MockMinerContext<TestInfo>({
      strategy,
      hostname: "mockaxe1",
      startTime,
      initialSystemInfo: { label: "initial" },
    });

    const info = context.getSystemInfo();

    expect(strategy.generateSystemInfo).toHaveBeenCalledWith(
      "mockaxe1",
      10, // uptimeSeconds
      { label: "initial" }
    );
    expect(info).toEqual({ value: 42 });
  });

  it("merges patchSystemInfo into existing overrides", () => {
    const strategy = createStrategyMock();
    strategy.generateSystemInfo.mockImplementation((_h, _u, sys) => sys);

    const context = new MockMinerContext<TestInfo>({
      strategy,
      hostname: "mockaxe1",
      startTime: new Date("2024-01-01T00:00:00.000Z"),
      initialSystemInfo: { label: "initial" },
    });

    context.patchSystemInfo({ value: 1 });

    const overrides = context.getSystemInfoOverrides();
    expect(overrides).toEqual({ label: "initial", value: 1 });
  });

  it("computes uptime in whole seconds from startTime", () => {
    const strategy = createStrategyMock();

    const context = new MockMinerContext<TestInfo>({
      strategy,
      hostname: "mockaxe1",
      startTime: new Date("2024-01-01T00:00:03.500Z"),
    });

    const uptime = context.getUptimeSeconds();
    expect(uptime).toBe(6); // floor(10 - 3.5)
  });

  it("exposes hostname, miner type and api version", () => {
    const strategy = createStrategyMock();
    const context = new MockMinerContext<TestInfo>({
      strategy,
      hostname: "mockaxe1",
    });

    expect(context.getHostname()).toBe("mockaxe1");
    expect(context.getMinerType()).toBe("test-miner");
    expect(context.getApiVersion()).toBe("v1");
  });
});

