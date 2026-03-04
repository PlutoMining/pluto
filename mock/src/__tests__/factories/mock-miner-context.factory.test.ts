import { createMockMinerContext, DEFAULT_MINER_TYPE } from "@/factories/mock-miner-context.factory";
import { DeviceApiVersion } from "@/types/axeos.types";

describe("createMockMinerContext", () => {
  it("defaults to generic miner type", () => {
    const startTime = new Date("2024-01-01T00:00:00Z");

    const ctx = createMockMinerContext({
      hostname: "mock-miner-1",
      startTime,
    });

    expect(ctx.getHostname()).toBe("mock-miner-1");
    expect(ctx.getMinerType()).toBe("generic");
    expect(ctx.getApiVersion()).toBe("generic");
    expect(DEFAULT_MINER_TYPE).toBe("generic");
  });

  it("creates axeos context when minerType is axeos", () => {
    const startTime = new Date("2024-01-01T00:00:00Z");

    const ctx = createMockMinerContext({
      minerType: "axeos",
      hostname: "bitaxe1",
      startTime,
      apiVersion: DeviceApiVersion.Legacy,
    });

    expect(ctx.getMinerType()).toBe("axeos");
    expect(ctx.getApiVersion()).toBe(DeviceApiVersion.Legacy);
  });

  it("defaults AxeOS apiVersion to Legacy when not provided", () => {
    const startTime = new Date("2024-01-01T00:00:00Z");

    const ctx = createMockMinerContext({
      minerType: "axeos",
      hostname: "bitaxe2",
      startTime,
    });

    expect(ctx.getMinerType()).toBe("axeos");
    expect(ctx.getApiVersion()).toBe(DeviceApiVersion.Legacy);
  });
});
