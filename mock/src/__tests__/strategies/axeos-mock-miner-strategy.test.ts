import { AxeosMockMinerStrategy } from "@/strategies/axeos-mock-miner-strategy";
import { DeviceApiVersion } from "@/types/axeos.types";
import type { MinerDataGenerator } from "@/generators/miner-data-generator.interface";
import type { BitaxeAxeOSInfo } from "@/types/bitaxe-axeos.types";

describe("AxeosMockMinerStrategy", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uses legacy generator when apiVersion is Legacy", () => {
    const generator: jest.Mocked<MinerDataGenerator<BitaxeAxeOSInfo>> = {
      generate: jest.fn().mockReturnValue({ legacy: true }),
    };
    const strategy = new AxeosMockMinerStrategy(DeviceApiVersion.Legacy, generator);

    const result = strategy.generateSystemInfo("mockaxe1", 123, { power: 1 } as any);

    expect(generator.generate).toHaveBeenCalledWith(
      "mockaxe1",
      123,
      { power: 1 }
    );
    expect(result).toEqual({ legacy: true });
  });

  it("uses alt generator when apiVersion is New", () => {
    const generator: jest.Mocked<MinerDataGenerator<BitaxeAxeOSInfo>> = {
      generate: jest.fn().mockReturnValue({ modern: true }),
    };
    const strategy = new AxeosMockMinerStrategy(DeviceApiVersion.New, generator);

    const result = strategy.generateSystemInfo("mockaxe2", 456, { power: 2 } as any);

    expect(generator.generate).toHaveBeenCalledWith(
      "mockaxe2",
      456,
      { power: 2 }
    );
    expect(result).toEqual({ modern: true });
  });

  it("exposes api version and miner type", () => {
    const strategy = new AxeosMockMinerStrategy(DeviceApiVersion.Legacy);

    expect(strategy.getApiVersion()).toBe(DeviceApiVersion.Legacy);
    expect(strategy.getMinerType()).toBe("axeos");
  });

  it("returns AxeOS HTML from getRootHtml for pyasic detection", () => {
    const strategy = new AxeosMockMinerStrategy(DeviceApiVersion.Legacy);
    const html = strategy.getRootHtml();

    expect(html).toContain("AxeOS");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<title>AxeOS</title>");
  });
});

