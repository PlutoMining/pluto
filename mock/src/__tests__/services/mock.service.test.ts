describe("mock.service", () => {
  const originalEnv = process.env;
  const originalRandom = Math.random;

  const loadService = async (randomValue: number) => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      LISTING_PORT: "7000",
      PORTS: "9001,9002",
      LOGS_PUB_ENABLED: "false",
    };
    Math.random = () => randomValue;
    return import("../../services/mock.service");
  };

  afterEach(() => {
    process.env = originalEnv;
    Math.random = originalRandom;
  });

  it("generates legacy info with firmware chosen from distribution", async () => {
    const { generateSystemInfo } = await loadService(0.01);

    const info = generateSystemInfo("mockaxe1", 10, { power: 123 } as any);
    expect(info.hostname).toBe("mockaxe1");
    expect(info.uptimeSeconds).toBe(10);
    expect(info.power).toBe(123);
    expect(info.version).toBe("v2.2.2");
  });

  it("supports omitted overrides for legacy info", async () => {
    const { generateSystemInfo } = await loadService(0.01);
    const info = generateSystemInfo("mockaxe1", 10);
    expect(info.hostname).toBe("mockaxe1");
  });

  it("falls back to default firmware when hostname has no index", async () => {
    const { generateSystemInfo } = await loadService(0.01);

    const info = generateSystemInfo("miner", 10, {} as any);
    expect(info.version).toBe("v2.1.8");
  });

  it("uses fallback firmware when random selection exceeds configured percentages", async () => {
    const { generateSystemInfo } = await loadService(0.9);
    const info = generateSystemInfo("mockaxe1", 10, {} as any);

    expect(info.version).toBe("v2.1.8");
  });

  it("generates new API info and merges overrides", async () => {
    const { generateSystemInfoAlt } = await loadService(0.01);

    const info = generateSystemInfoAlt("mockaxe2", 20, { maxPower: 999 } as any);
    expect(info.hostname).toBe("mockaxe2");
    expect(info.uptimeSeconds).toBe(20);
    expect(info.maxPower).toBe(999);
    expect(info.version).toBe("v2.2.2");
    expect(info.history?.hashrate_10m).toHaveLength(4);
  });

  it("supports omitted overrides for new API info", async () => {
    const { generateSystemInfoAlt } = await loadService(0.01);
    const info = generateSystemInfoAlt("mockaxe2", 20);
    expect(info.hostname).toBe("mockaxe2");
  });

  it("generates fake logs", async () => {
    const { generateFakeLog } = await loadService(0);
    expect(generateFakeLog()).toBe("System started");

    const { generateFakeLog: generateFakeLogLast } = await loadService(0.99);
    expect(generateFakeLogLast()).toBe("Fan is operating within limits");
  });
});
