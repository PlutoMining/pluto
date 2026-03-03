import { GenericMockMinerStrategy } from "@/strategies/generic-mock-miner-strategy";
import type { MinerDataGenerator } from "@/generators/miner-data-generator.interface";
import type { GenericMinerInfo } from "@/types/generic-miner.types";

describe("GenericMockMinerStrategy", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("delegates to generator and returns result", () => {
    const generator: jest.Mocked<MinerDataGenerator<GenericMinerInfo>> = {
      generate: jest.fn().mockReturnValue({ make: "Bitmain", model: "S19" }),
    };
    const strategy = new GenericMockMinerStrategy(generator);

    const result = strategy.generateSystemInfo("mock-miner-1", 123, { wattage: 3000 } as any);

    expect(generator.generate).toHaveBeenCalledWith("mock-miner-1", 123, { wattage: 3000 });
    expect(result).toEqual({ make: "Bitmain", model: "S19" });
  });

  it("returns generic api version and miner type", () => {
    const strategy = new GenericMockMinerStrategy();

    expect(strategy.getApiVersion()).toBe("generic");
    expect(strategy.getMinerType()).toBe("generic");
  });

  it("returns non-AxeOS HTML from getRootHtml", () => {
    const strategy = new GenericMockMinerStrategy();
    const html = strategy.getRootHtml();

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Miner Web UI");
    expect(html).not.toContain("AxeOS");
  });
});
