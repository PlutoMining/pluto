describe("mock.service", () => {
  const originalEnv = process.env;
  const originalRandom = Math.random;

  const loadService = async (randomValue: number, ports = "9001,9002") => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      LISTING_PORT: "7000",
      PORTS: ports,
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

  it("handles hostnames with numeric suffix correctly", async () => {
    const { generateSystemInfo } = await loadService(0.01);
    const info1 = generateSystemInfo("mockaxe1", 10, {} as any);
    const info2 = generateSystemInfo("mockaxe2", 10, {} as any);
    const info10 = generateSystemInfo("mockaxe10", 10, {} as any);

    expect(info1.hostname).toBe("mockaxe1");
    expect(info2.hostname).toBe("mockaxe2");
    expect(info10.hostname).toBe("mockaxe10");
    expect(info1.version).toBeDefined();
    expect(info2.version).toBeDefined();
    expect(info10.version).toBeDefined();
  });

  it("handles hostnames without numeric suffix", async () => {
    const { generateSystemInfo } = await loadService(0.01);
    const info = generateSystemInfo("miner", 10, {} as any);
    expect(info.hostname).toBe("miner");
    expect(info.version).toBe("v2.1.8"); // Default fallback
  });

  it("handles hostnames with only numbers", async () => {
    const { generateSystemInfo } = await loadService(0.01);
    const info = generateSystemInfo("123", 10, {} as any);
    expect(info.hostname).toBe("123");
    expect(info.version).toBeDefined();
  });

  it("generates all required fields for legacy info", async () => {
    const { generateSystemInfo } = await loadService(0.5);
    const info = generateSystemInfo("mockaxe1", 100, {} as any);

    expect(info).toMatchObject({
      hostname: "mockaxe1",
      uptimeSeconds: 100,
      power: expect.any(Number),
      voltage: expect.any(Number),
      current: expect.any(Number),
      fanSpeedRpm: expect.any(Number),
      temp: expect.any(Number),
      hashRate: expect.any(Number),
      bestDiff: expect.stringMatching(/^\d+(\.\d+)?M$/),
      bestSessionDiff: expect.stringMatching(/^\d+(\.\d+)?k$/),
      freeHeap: expect.any(Number),
      coreVoltage: expect.any(Number),
      coreVoltageActual: expect.any(Number),
      frequency: expect.any(Number),
      ssid: "WiFi-SSID",
      wifiStatus: "Connected!",
      sharesAccepted: expect.any(Number),
      sharesRejected: expect.any(Number),
      ASICModel: "BM1368",
      stratumURL: "solo.ckpool.org",
      stratumPort: 3333,
      version: expect.any(String),
      boardVersion: "401",
      runningPartition: "factory",
      flipscreen: expect.any(Number),
      invertscreen: expect.any(Number),
      invertfanpolarity: expect.any(Number),
      autofanspeed: expect.any(Number),
      fanspeed: expect.any(Number),
    });
    expect(info.stratumUser).toContain("mockaxe1");
  });

  it("generates all required fields for new API info", async () => {
    const { generateSystemInfoAlt } = await loadService(0.5);
    const info = generateSystemInfoAlt("mockaxe2", 200, {} as any);

    expect(info).toMatchObject({
      hostname: "mockaxe2",
      uptimeSeconds: 200,
      power: expect.any(Number),
      maxPower: 70,
      minPower: 30,
      voltage: expect.any(Number),
      maxVoltage: 13,
      minVoltage: 11,
      current: expect.any(Number),
      temp: expect.any(Number),
      vrTemp: expect.any(Number),
      hashRateTimestamp: expect.any(Number),
      hashRate_10m: expect.any(Number),
      hashRate_1h: expect.any(Number),
      hashRate_1d: expect.any(Number),
      jobInterval: 1200,
      bestDiff: expect.stringMatching(/^\d+(\.\d+)?M$/),
      bestSessionDiff: expect.stringMatching(/^\d+(\.\d+)?M$/),
      freeHeap: expect.any(Number),
      coreVoltage: expect.any(Number),
      coreVoltageActual: expect.any(Number),
      frequency: expect.any(Number),
      ssid: "EMN_Guest",
      wifiStatus: "Connected!",
      sharesAccepted: expect.any(Number),
      sharesRejected: expect.any(Number),
      asicCount: expect.any(Number),
      smallCoreCount: expect.any(Number),
      ASICModel: "BM1368",
      deviceModel: "NerdQAxe+",
      stratumURL: "solo.ckpool.org",
      stratumPort: 3333,
      version: expect.any(String),
      runningPartition: "ota_1",
      flipscreen: expect.any(Number),
      overheat_temp: 75,
      invertscreen: expect.any(Number),
      autoscreenoff: expect.any(Number),
      invertfanpolarity: expect.any(Number),
      autofanspeed: expect.any(Number),
      fanspeed: expect.any(Number),
      fanrpm: expect.any(Number),
      lastResetReason: "Power on reset",
    });
    expect(info.stratumUser).toContain("mockaxe2");
    expect(info.history).toBeDefined();
    expect(info.history?.hashrate_10m).toHaveLength(4);
    expect(info.history?.hashrate_1h).toHaveLength(4);
    expect(info.history?.hashrate_1d).toHaveLength(4);
    expect(info.history?.timestamps).toHaveLength(4);
    expect(info.history?.timestampBase).toBeDefined();
  });

  it("merges overrides correctly for legacy info", async () => {
    const { generateSystemInfo } = await loadService(0.5);
    const overrides = {
      power: 999,
      temp: 88,
      hostname: "custom",
    } as any;

    const info = generateSystemInfo("mockaxe1", 50, overrides);

    expect(info.power).toBe(999);
    expect(info.temp).toBe(88);
    expect(info.hostname).toBe("custom"); // Override takes precedence
    expect(info.voltage).toBeDefined(); // Other fields still generated
  });

  it("merges overrides correctly for new API info", async () => {
    const { generateSystemInfoAlt } = await loadService(0.5);
    const overrides = {
      power: 888,
      maxPower: 100,
      temp: 77,
      hostname: "custom2",
    } as any;

    const info = generateSystemInfoAlt("mockaxe2", 75, overrides);

    expect(info.power).toBe(888);
    expect(info.maxPower).toBe(100);
    expect(info.temp).toBe(77);
    expect(info.hostname).toBe("custom2"); // Override takes precedence
    expect(info.voltage).toBeDefined(); // Other fields still generated
  });

  it("handles firmware distribution with single port", async () => {
    const { generateSystemInfo } = await loadService(0.01, "9001");
    const info = generateSystemInfo("mockaxe1", 10, {} as any);
    expect(info.version).toBeDefined();
  });

  it("handles firmware distribution with multiple ports", async () => {
    const { generateSystemInfo } = await loadService(0.01, "9001,9002,9003");
    const info1 = generateSystemInfo("mockaxe1", 10, {} as any);
    const info2 = generateSystemInfo("mockaxe2", 10, {} as any);
    const info3 = generateSystemInfo("mockaxe3", 10, {} as any);

    expect(info1.version).toBeDefined();
    expect(info2.version).toBeDefined();
    expect(info3.version).toBeDefined();
  });

  it("handles port index wrapping correctly", async () => {
    const { generateSystemInfo } = await loadService(0.01, "9001,9002");
    // mockaxe3 should wrap to port index 0 (9001) since 3 % 2 = 1, but numericPart - 1 = 2, 2 % 2 = 0
    const info = generateSystemInfo("mockaxe3", 10, {} as any);
    expect(info.version).toBeDefined();
  });

  it("generates different log messages", async () => {
    const logs = new Set<string>();
    const originalRandom = Math.random;

    // Generate logs with different random values
    for (let i = 0; i < 20; i++) {
      Math.random = () => i / 20;
      jest.resetModules();
      process.env = {
        ...originalEnv,
        LISTING_PORT: "7000",
        PORTS: "9001,9002",
        LOGS_PUB_ENABLED: "false",
      };
      const { generateFakeLog: logFn } = await import("../../services/mock.service");
      logs.add(logFn());
    }

    Math.random = originalRandom;
    // Should generate multiple different log messages
    expect(logs.size).toBeGreaterThan(1);
  });
});
