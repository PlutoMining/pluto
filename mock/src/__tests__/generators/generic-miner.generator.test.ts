import { GenericMinerDataGenerator } from "@/generators/generic-miner.generator";

describe("GenericMinerDataGenerator", () => {
  let randomSpy: jest.SpyInstance;

  beforeEach(() => {
    randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5);
  });

  afterEach(() => {
    randomSpy.mockRestore();
  });

  it("returns generic miner info with expected shape", () => {
    const generator = new GenericMinerDataGenerator();
    const result = generator.generate("mock-miner-1", 3600);

    expect(result.hostname).toBe("mock-miner-1");
    expect(result.uptime).toBe(3600);
    expect(typeof result.mac).toBe("string");
    expect(result.mac).toMatch(/^ff:ff:ff:ff:[0-9a-f]{2}:[0-9a-f]{2}$/);
    expect(typeof result.make).toBe("string");
    expect(typeof result.model).toBe("string");
    expect(typeof result.firmware).toBe("string");
    expect(result.algo).toBe("SHA256");
    expect(typeof result.hashrate).toBe("number");
    expect(typeof result.expected_hashrate).toBe("number");
    expect(typeof result.wattage).toBe("number");
    expect(typeof result.temperature_avg).toBe("number");
    expect(typeof result.shares_accepted).toBe("number");
    expect(typeof result.is_mining).toBe("boolean");
    expect(typeof result.nominal).toBe("boolean");
    expect(typeof result.efficiency).toBe("number");
    expect(typeof result.pool_url).toBe("string");
    expect(typeof result.fw_ver).toBe("string");
    expect(typeof result.serial_number).toBe("string");
  });

  it("generates fans and hashboards arrays", () => {
    const generator = new GenericMinerDataGenerator();
    const result = generator.generate("mock-miner-1", 100);

    expect(Array.isArray(result.fans)).toBe(true);
    expect(result.fans!.length).toBeGreaterThan(0);
    for (const fan of result.fans!) {
      expect(typeof fan.speed).toBe("number");
    }

    expect(Array.isArray(result.hashboards)).toBe(true);
    expect(result.hashboards!.length).toBeGreaterThan(0);
    for (const board of result.hashboards!) {
      expect(typeof board.slot).toBe("number");
      expect(typeof board.hashrate).toBe("number");
      expect(typeof board.temp).toBe("number");
      expect(typeof board.chips).toBe("number");
      expect(board.active).toBe(true);
    }
  });

  it("uses hostname to derive MAC address", () => {
    const generator = new GenericMinerDataGenerator();
    const result1 = generator.generate("mock-miner-1", 0);
    const result2 = generator.generate("mock-miner-255", 0);

    expect(result1.mac).toBe("ff:ff:ff:ff:00:01");
    expect(result2.mac).toBe("ff:ff:ff:ff:00:ff");
  });

  it("merges overrides into generated base", () => {
    const generator = new GenericMinerDataGenerator();
    const overrides = { make: "CustomMake", hostname: "custom-host", wattage: 9999 };
    const result = generator.generate("mock-miner-1", 100, overrides);

    expect(result.make).toBe("CustomMake");
    expect(result.hostname).toBe("custom-host");
    expect(result.wattage).toBe(9999);
    expect(result.uptime).toBe(100);
  });

  it("falls back to zero-based MAC when hostname has no numeric suffix", () => {
    const generator = new GenericMinerDataGenerator();
    const result = generator.generate("miner", 0);

    expect(result.mac).toBe("ff:ff:ff:ff:00:00");
  });

  it("uses worker suffix when hostname is empty", () => {
    const generator = new GenericMinerDataGenerator();
    const result = generator.generate("", 0);

    expect(result.hostname).toBeUndefined();
    expect(result.pool_user).toMatch(/\.worker$/);
  });

  it("does not include vendor-specific fields", () => {
    const generator = new GenericMinerDataGenerator();
    const result = generator.generate("mock-miner-1", 100) as Record<string, unknown>;

    expect(result).not.toHaveProperty("frequency");
    expect(result).not.toHaveProperty("coreVoltage");
    expect(result).not.toHaveProperty("coreVoltageActual");
    expect(result).not.toHaveProperty("vrTemp");
    expect(result).not.toHaveProperty("freeHeap");
    expect(result).not.toHaveProperty("isPSRAMAvailable");
    expect(result).not.toHaveProperty("ASICModel");
    expect(result).not.toHaveProperty("boardVersion");
    expect(result).not.toHaveProperty("hashrateMonitor");
  });
});
