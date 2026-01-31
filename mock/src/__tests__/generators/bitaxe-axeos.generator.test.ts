import { BitaxeAxeOSDataGenerator } from "@/generators/bitaxe-axeos.generator";

describe("BitaxeAxeOSDataGenerator", () => {
  let randomSpy: jest.SpyInstance;

  beforeEach(() => {
    // Use deterministic "random" so output is predictable
    randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5);
  });

  afterEach(() => {
    randomSpy.mockRestore();
  });

  it("returns partial BitaxeAxeOSInfo with expected shape", () => {
    const generator = new BitaxeAxeOSDataGenerator();
    const result = generator.generate("mockaxe1", 3600);

    expect(result).toMatchObject({
      hostname: "mockaxe1",
      uptimeSeconds: 3600,
      temp2: -1,
      maxPower: 40,
      nominalVoltage: 5,
      poolDifficulty: 2048,
      isUsingFallbackStratum: 0,
      poolAddrFamily: 2,
      isPSRAMAvailable: 1,
      coreVoltage: 1100,
      frequency: 490,
      ssid: "FRITZ!Box 5530 AG",
      ipv4: "192.168.178.229",
      ipv6: "FE80::32ED:A0FF:FE30:1030",
      wifiStatus: "Connected!",
      wifiRSSI: -44,
      apEnabled: 0,
      smallCoreCount: 2040,
      stratumURL: "stratum+tcp://192.168.178.28:2018",
      stratumPort: 2018,
      stratumSuggestedDifficulty: 1000,
      stratumExtranonceSubscribe: 0,
      idfVersion: "v5.5.1",
      resetReason: "Software reset via esp_restart",
      runningPartition: "ota_0",
      overheat_mode: 0,
      overclockEnabled: 0,
      display: "SSD1306 (128x32)",
      rotation: 0,
      invertscreen: 0,
      displayTimeout: 1,
      autofanspeed: 0,
      fanspeed: 60,
      manualFanSpeed: 60,
      minFanSpeed: 25,
      temptarget: 65,
      fan2rpm: 0,
      statsFrequency: 0,
      blockFound: 0,
      blockHeight: 934200,
      networkDifficulty: 141_668_107_417_558,
    });

    expect(typeof result.power).toBe("number");
    expect(typeof result.voltage).toBe("number");
    expect(typeof result.temp).toBe("number");
    expect(typeof result.hashRate).toBe("number");
    expect(typeof result.macAddr).toBe("string");
    expect(result.macAddr).toMatch(/^ff:ff:ff:ff:[0-9a-f]{2}:[0-9a-f]{2}$/);
    expect(Array.isArray(result.sharesRejectedReasons)).toBe(true);
    expect(result.hashrateMonitor).toBeDefined();
    expect(Array.isArray(result.hashrateMonitor?.asics)).toBe(true);
  });

  it("uses hostname to derive MAC address", () => {
    const generator = new BitaxeAxeOSDataGenerator();
    const result1 = generator.generate("mockaxe1", 0);
    const result2 = generator.generate("mockaxe255", 0);

    expect(result1.macAddr).toBe("ff:ff:ff:ff:00:01");
    expect(result2.macAddr).toBe("ff:ff:ff:ff:00:ff");
  });

  it("merges overrides into generated base", () => {
    const generator = new BitaxeAxeOSDataGenerator();
    const overrides = { power: 99, hostname: "custom-host" };
    const result = generator.generate("mockaxe1", 100, overrides);

    expect(result.power).toBe(99);
    expect(result.hostname).toBe("custom-host");
    expect(result.uptimeSeconds).toBe(100);
  });

  it("accepts empty overrides", () => {
    const generator = new BitaxeAxeOSDataGenerator();
    const result = generator.generate("mockaxe1", 0, {});

    expect(result.hostname).toBe("mockaxe1");
    expect(result.uptimeSeconds).toBe(0);
  });

  it("selects ASIC model and board version from known set", () => {
    const generator = new BitaxeAxeOSDataGenerator();
    const validAsicModels = ["BM1370", "BM1368", "BM1366", "BM1397"];
    const validBoardVersions = ["601", "401", "201", "101"];

    const result = generator.generate("mockaxe1", 0);

    expect(validAsicModels).toContain(result.ASICModel);
    expect(validBoardVersions).toContain(result.boardVersion);
    expect(typeof result.version).toBe("string");
    expect(result.version).toMatch(/^v\d+\.\d+\.\d+$/);
  });
});
