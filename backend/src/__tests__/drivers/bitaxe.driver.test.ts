import { BitaxeDriver } from "@/drivers/bitaxe.driver";
import type {
  BitaxeApiResponse,
  MinerConfig,
  MinerData,
  SelectField,
} from "@pluto/interfaces";

jest.mock("@pluto/logger", () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

const createBitaxeApiResponse = (overrides?: Partial<BitaxeApiResponse>): BitaxeApiResponse =>
  ({
    power: 10,
    voltage: 12000,
    current: 100,
    temp: 50,
    temp2: 0,
    vrTemp: 0,
    maxPower: 100,
    nominalVoltage: 12000,
    hashRate: 100,
    hashRate_1m: 100,
    hashRate_10m: 100,
    hashRate_1h: 100,
    expectedHashrate: 100,
    errorPercentage: 0,
    bestDiff: 1000,
    bestSessionDiff: 1000,
    poolDifficulty: 1000,
    isUsingFallbackStratum: 0,
    poolAddrFamily: 0,
    isPSRAMAvailable: 1,
    freeHeap: 100000,
    freeHeapInternal: 50000,
    freeHeapSpiram: 50000,
    coreVoltage: 1100,
    coreVoltageActual: 1100,
    frequency: 550,
    ssid: "",
    macAddr: "aa:bb:cc:dd:ee:ff",
    hostname: "bitaxe",
    ipv4: "192.168.1.1",
    ipv6: "",
    wifiStatus: "",
    wifiRSSI: 0,
    apEnabled: 0,
    sharesAccepted: 0,
    sharesRejected: 0,
    sharesRejectedReasons: [],
    uptimeSeconds: 3600,
    smallCoreCount: 1,
    ASICModel: "BM1368",
    stratumURL: "stratum.example.com",
    stratumPort: 3333,
    stratumUser: "user",
    stratumSuggestedDifficulty: 0,
    stratumExtranonceSubscribe: 0,
    fallbackStratumURL: "",
    fallbackStratumPort: 0,
    fallbackStratumUser: "",
    fallbackStratumSuggestedDifficulty: 0,
    fallbackStratumExtranonceSubscribe: 0,
    responseTime: 0,
    version: "1.0",
    axeOSVersion: "1.0",
    idfVersion: "5.0",
    boardVersion: "Max",
    resetReason: "power",
    runningPartition: "ota_0",
    overheat_mode: 0,
    overclockEnabled: 0,
    display: "1",
    rotation: 0,
    invertscreen: 0,
    displayTimeout: 0,
    autofanspeed: 1,
    fanspeed: 50,
    manualFanSpeed: 0,
    minFanSpeed: 20,
    temptarget: 70,
    fanrpm: 2000,
    fan2rpm: 0,
    statsFrequency: 0,
    blockFound: 0,
    blockHeight: 0,
    scriptsig: "",
    networkDifficulty: 0,
    ...overrides,
  } as BitaxeApiResponse);

describe("BitaxeDriver", () => {
  let driver: BitaxeDriver;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    driver = new BitaxeDriver();
    fetchSpy = jest.spyOn(global, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe("getConfigSchema", () => {
    it("returns sections array with hardware, fan, display, stratumFallback, general sections", () => {
      const schema = driver.getConfigSchema();
      expect(schema.sections).toBeDefined();
      const keys = schema.sections!.map((s) => s.key);
      expect(keys).toContain("general");
      expect(keys).toContain("hardware");
      expect(keys).toContain("fan");
      expect(keys).toContain("display");
      expect(keys).toContain("stratumFallback");
    });

    it("frequency and coreVoltage are select fields with options", () => {
      const schema = driver.getConfigSchema();
      const hardwareSection = schema.sections!.find((s) => s.key === "hardware");
      expect(hardwareSection).toBeDefined();
      const frequencyField = hardwareSection!.fields!.find(
        (f) => f.name === "frequency"
      ) as SelectField | undefined;
      const coreVoltageField = hardwareSection!.fields!.find(
        (f) => f.name === "coreVoltage"
      ) as SelectField | undefined;
      expect(frequencyField?.type).toBe("select");
      expect(frequencyField?.options).toHaveLength(7);
      expect(frequencyField?.options).toEqual(
        expect.arrayContaining([
          { label: "400 MHz", value: 400 },
          { label: "550 MHz", value: 550 },
          { label: "625 MHz", value: 625 },
        ])
      );
      expect(coreVoltageField?.type).toBe("select");
      expect(coreVoltageField?.options).toHaveLength(6);
      expect(coreVoltageField?.options).toEqual(
        expect.arrayContaining([
          { label: "1000 mV", value: 1000 },
          { label: "1100 mV", value: 1100 },
          { label: "1250 mV", value: 1250 },
        ])
      );
    });
  });

  describe("getEditableValues", () => {
    it("returns all fields from minerData.bitaxe", () => {
      const minerData: MinerData = {
        ip: "192.168.1.1",
        bitaxe: {
          hostname: "my-bitaxe",
          frequency: 550,
          coreVoltage: 1100,
          overclockEnabled: 1,
          overheatMode: 1,
          autofanspeed: 1,
          fanspeed: 50,
          minFanSpeed: 20,
          temptarget: 70,
          rotation: 0,
          invertscreen: 0,
          displayTimeout: 0,
          statsFrequency: 0,
          fallbackStratumURL: "stratum.example.com",
          fallbackStratumPort: 3333,
          fallbackStratumUser: "user",
          fallbackStratumSuggestedDifficulty: 0,
        } as MinerData["bitaxe"],
      };
      const values = driver.getEditableValues(minerData);
      expect(values.hostname).toBe("my-bitaxe");
      expect(values.frequency).toBe(550);
      expect(values.coreVoltage).toBe(1100);
      expect(values.fanspeed).toBe(50);
      expect(values.temptarget).toBe(70);
    });

    it("returns {} when bitaxe is absent", () => {
      const minerData: MinerData = { ip: "192.168.1.1" };
      const values = driver.getEditableValues(minerData);
      expect(values).toEqual({});
    });

    it("returns {} when minerData is null/undefined", () => {
      expect(driver.getEditableValues(null as unknown as MinerData)).toEqual({});
    });

    it("returns partial values when bitaxe has some fields undefined", () => {
      const minerData = {
        ip: "192.168.1.1",
        bitaxe: {
          hostname: "my-bitaxe",
          frequency: 550,
        },
      } as MinerData;
      const values = driver.getEditableValues(minerData);
      expect(values.hostname).toBe("my-bitaxe");
      expect(values.frequency).toBe(550);
      expect(values.coreVoltage).toBeUndefined();
    });
  });

  describe("validateConfig", () => {
    it("accepts valid frequency from VALID_FREQUENCIES", async () => {
      for (const freq of [400, 490, 525, 550, 575, 600, 625]) {
        const result = await driver.validateConfig("1.1.1.1", {
          vendorConfig: { frequency: freq },
        });
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    });

    it("rejects invalid frequency", async () => {
      const result = await driver.validateConfig("1.1.1.1", {
        vendorConfig: { frequency: 999 },
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Invalid frequency 999");
      expect(result.errors[0]).toContain("400, 490, 525, 550, 575, 600, 625");
    });

    it("accepts valid coreVoltage", async () => {
      for (const v of [1000, 1060, 1100, 1150, 1200, 1250]) {
        const result = await driver.validateConfig("1.1.1.1", {
          vendorConfig: { coreVoltage: v },
        });
        expect(result.valid).toBe(true);
      }
    });

    it("rejects invalid coreVoltage", async () => {
      const result = await driver.validateConfig("1.1.1.1", {
        vendorConfig: { coreVoltage: 999 },
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Invalid core voltage 999");
    });

    it("validates fanspeed range 0-100", async () => {
      const valid = await driver.validateConfig("1.1.1.1", {
        vendorConfig: { fanspeed: 50 },
      });
      expect(valid.valid).toBe(true);

      const invalidLow = await driver.validateConfig("1.1.1.1", {
        vendorConfig: { fanspeed: -1 },
      });
      expect(invalidLow.valid).toBe(false);
      expect(invalidLow.errors[0]).toContain("0 and 100");

      const invalidHigh = await driver.validateConfig("1.1.1.1", {
        vendorConfig: { fanspeed: 101 },
      });
      expect(invalidHigh.valid).toBe(false);
    });

    it("validates temptarget range 30-100", async () => {
      const valid = await driver.validateConfig("1.1.1.1", {
        vendorConfig: { temptarget: 70 },
      });
      expect(valid.valid).toBe(true);

      const invalidLow = await driver.validateConfig("1.1.1.1", {
        vendorConfig: { temptarget: 29 },
      });
      expect(invalidLow.valid).toBe(false);
      expect(invalidLow.errors[0]).toContain("30 and 100");

      const invalidHigh = await driver.validateConfig("1.1.1.1", {
        vendorConfig: { temptarget: 101 },
      });
      expect(invalidHigh.valid).toBe(false);
    });

    it("validates fallbackStratumPort range 1-65535", async () => {
      const valid = await driver.validateConfig("1.1.1.1", {
        vendorConfig: { fallbackStratumPort: 3333 },
      });
      expect(valid.valid).toBe(true);

      const invalidLow = await driver.validateConfig("1.1.1.1", {
        vendorConfig: { fallbackStratumPort: 0 },
      });
      expect(invalidLow.valid).toBe(false);
      expect(invalidLow.errors[0]).toContain("1 and 65535");

      const invalidHigh = await driver.validateConfig("1.1.1.1", {
        vendorConfig: { fallbackStratumPort: 65536 },
      });
      expect(invalidHigh.valid).toBe(false);
    });

    it("valid config with all nulls is valid", async () => {
      const result = await driver.validateConfig("1.1.1.1", {
        vendorConfig: {},
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("valid when vendorConfig is undefined", async () => {
      const result = await driver.validateConfig("1.1.1.1", {} as MinerConfig);
      expect(result.valid).toBe(true);
    });

    it("valid when frequency is not provided (null)", async () => {
      const result = await driver.validateConfig("1.1.1.1", {
        vendorConfig: { coreVoltage: 1100 },
      });
      expect(result.valid).toBe(true);
    });
  });

  describe("updateConfig / toBitaxePatch", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it("mock fetch returning ok response", async () => {
      fetchSpy.mockResolvedValue({ ok: true });
      const config: MinerConfig = {
        pools: {
          groups: [{ pools: [{ url: "stratum+tcp://pool.example.com:3333", user: "u" }] }],
        },
      };
      const promise = driver.updateConfig("192.168.1.1", config);
      await jest.runAllTimersAsync();
      await promise;
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://192.168.1.1/api/system",
        expect.objectContaining({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
        })
      );
      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.stratumURL).toBe("pool.example.com");
      expect(body.stratumPort).toBe(3333);
      expect(body.stratumUser).toBe("u");
    });

    it("pool URL is parsed correctly (stratum+tcp://host:port)", async () => {
      fetchSpy.mockResolvedValue({ ok: true });
      const config: MinerConfig = {
        pools: {
          groups: [{ pools: [{ url: "stratum+tcp://pool.btc.com:3333", user: "u" }] }],
        },
      };
      const promise = driver.updateConfig("192.168.1.1", config);
      await jest.runAllTimersAsync();
      await promise;
      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.stratumURL).toBe("pool.btc.com");
      expect(body.stratumPort).toBe(3333);
    });

    it("vendorConfig fields are mapped to API fields (overheat_mode from overheatMode)", async () => {
      fetchSpy.mockResolvedValue({ ok: true });
      const config: MinerConfig = {
        pools: { groups: [{ pools: [{}] }] },
        vendorConfig: {
          overheatMode: true,
          overclockEnabled: true,
          autofanspeed: true,
          fanspeed: 50,
          temptarget: 70,
          hostname: "my-bitaxe",
        },
      };
      const promise = driver.updateConfig("192.168.1.1", config);
      await jest.runAllTimersAsync();
      await promise;
      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.overheat_mode).toBe(true);
      expect(body.overclockEnabled).toBe(true);
      expect(body.autofanspeed).toBe(true);
      expect(body.fanspeed).toBe(50);
      expect(body.temptarget).toBe(70);
      expect(body.hostname).toBe("my-bitaxe");
    });

    it("throws when fetch returns non-ok with error text", async () => {
      jest.useRealTimers();
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Internal Server Error"),
      });
      const config: MinerConfig = {
        pools: { groups: [{ pools: [{ url: "x", user: "y" }] }] },
      };
      await expect(driver.updateConfig("192.168.1.1", config)).rejects.toThrow(
        "Bitaxe config update failed for 192.168.1.1: HTTP 500 Internal Server Error"
      );
    });

    it("includes pool password when provided", async () => {
      fetchSpy.mockResolvedValue({ ok: true });
      const config: MinerConfig = {
        pools: {
          groups: [{ pools: [{ url: "stratum+tcp://pool.example.com:3333", user: "u", password: "x" }] }],
        },
      };
      const promise = driver.updateConfig("192.168.1.1", config);
      await jest.runAllTimersAsync();
      await promise;
      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.stratumPassword).toBe("x");
    });

    it("pool URL with invalid port omits port", async () => {
      fetchSpy.mockResolvedValue({ ok: true });
      const config: MinerConfig = {
        pools: {
          groups: [{ pools: [{ url: "stratum+tcp://pool.example.com:abc", user: "u" }] }],
        },
      };
      const promise = driver.updateConfig("192.168.1.1", config);
      await jest.runAllTimersAsync();
      await promise;
      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.stratumURL).toBe("pool.example.com");
      expect(body.stratumPort).toBeUndefined();
    });

    it("pool URL without port returns host only", async () => {
      fetchSpy.mockResolvedValue({ ok: true });
      const config: MinerConfig = {
        pools: {
          groups: [{ pools: [{ url: "stratum+tcp://pool.example.com", user: "u" }] }],
        },
      };
      const promise = driver.updateConfig("192.168.1.1", config);
      await jest.runAllTimersAsync();
      await promise;
      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.stratumURL).toBe("pool.example.com");
      expect(body.stratumPort).toBeUndefined();
    });

    it("handles vendorConfig undefined/empty in updateConfig", async () => {
      fetchSpy.mockResolvedValue({ ok: true });
      const config: MinerConfig = {
        pools: { groups: [{ pools: [{}] }] },
      };
      const promise = driver.updateConfig("192.168.1.1", config);
      await jest.runAllTimersAsync();
      await promise;
      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body).toBeDefined();
      expect(Object.keys(body).length).toBeGreaterThanOrEqual(0);
    });

    it("includes fallbackStratumSuggestedDifficulty in patch", async () => {
      fetchSpy.mockResolvedValue({ ok: true });
      const config: MinerConfig = {
        pools: { groups: [{ pools: [{}] }] },
        vendorConfig: {
          fallbackStratumURL: "stratum.example.com",
          fallbackStratumPort: 3333,
          fallbackStratumUser: "u",
          fallbackStratumSuggestedDifficulty: 1000000,
        },
      };
      const promise = driver.updateConfig("192.168.1.1", config);
      await jest.runAllTimersAsync();
      await promise;
      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.fallbackStratumSuggestedDifficulty).toBe(1000000);
    });
  });

  describe("getConfig / toMinerConfig", () => {
    it("returns pools and vendorConfig from BitaxeApiResponse", async () => {
      const apiResponse = createBitaxeApiResponse({
        stratumURL: "pool.example.com",
        stratumPort: 3333,
        stratumUser: "user",
        hostname: "bitaxe-max",
        frequency: 550,
        coreVoltage: 1100,
      });
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(apiResponse),
      });
      const config = await driver.getConfig("192.168.1.1");
      expect(config.pools).toBeDefined();
      expect(config.pools!.groups![0].pools![0].url).toBe("pool.example.com:3333");
      expect(config.pools!.groups![0].pools![0].user).toBe("user");
      expect(config.vendorConfig).toBeDefined();
      expect(config.vendorConfig!.hostname).toBe("bitaxe-max");
      expect(config.vendorConfig!.frequency).toBe(550);
      expect(config.vendorConfig!.coreVoltage).toBe(1100);
    });

    it("throws when fetch returns non-ok", async () => {
      fetchSpy.mockResolvedValue({ ok: false, status: 404 });
      await expect(driver.getConfig("192.168.1.1")).rejects.toThrow(
        "Bitaxe 192.168.1.1 returned HTTP 404"
      );
    });
  });

  describe("detect", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it("returns null when fetch fails", async () => {
      fetchSpy.mockRejectedValue(new Error("network"));
      const promise = driver.detect("192.168.1.1");
      await jest.runAllTimersAsync();
      const result = await promise;
      expect(result).toBeNull();
    });

    it("returns null when ASICModel missing", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ...createBitaxeApiResponse(), ASICModel: undefined }),
      });
      const promise = driver.detect("192.168.1.1");
      await jest.runAllTimersAsync();
      const result = await promise;
      expect(result).toBeNull();
    });

    it("returns DetectionResult when valid", async () => {
      const apiResponse = createBitaxeApiResponse({
        ASICModel: "BM1368",
        boardVersion: "Max",
        macAddr: "aa:bb:cc:dd:ee:ff",
      });
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(apiResponse),
      });
      const promise = driver.detect("192.168.1.1");
      await jest.runAllTimersAsync();
      const result = await promise;
      expect(result).toEqual({
        type: "Bitaxe Max",
        model: "Bitaxe Max",
        mac: "aa:bb:cc:dd:ee:ff",
      });
    });

    it("produces Bitaxe without trailing space when boardVersion is undefined", async () => {
      const apiResponse = createBitaxeApiResponse({
        ASICModel: "BM1368",
        boardVersion: undefined,
        macAddr: "aa:bb:cc:dd:ee:ff",
      });
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(apiResponse),
      });
      const promise = driver.detect("192.168.1.1");
      await jest.runAllTimersAsync();
      const result = await promise;
      expect(result).toEqual({
        type: "Bitaxe",
        model: "Bitaxe",
        mac: "aa:bb:cc:dd:ee:ff",
      });
    });

    it("returns null when response is not ok", async () => {
      fetchSpy.mockResolvedValue({ ok: false, status: 404 });
      const promise = driver.detect("192.168.1.1");
      await jest.runAllTimersAsync();
      const result = await promise;
      expect(result).toBeNull();
    });
  });

  describe("fetchData", () => {
    it("calls /api/system/info", async () => {
      const apiResponse = createBitaxeApiResponse();
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(apiResponse),
      });
      await driver.fetchData("192.168.1.1");
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://192.168.1.1/api/system/info",
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });

    it("builds full MinerData with bitaxe vendor section", async () => {
      const apiResponse = createBitaxeApiResponse({
        hashRate: 150,
        temp: 55,
        power: 12,
        macAddr: "aa:bb:cc:dd:ee:ff",
        hostname: "bitaxe-max",
      });
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(apiResponse),
      });
      const data = await driver.fetchData("192.168.1.1");
      expect(data.ip).toBe("192.168.1.1");
      expect(data.mac).toBe("aa:bb:cc:dd:ee:ff");
      expect(data.hostname).toBe("bitaxe-max");
      expect(data.hashrate).toBeDefined();
      expect(data.hashrate!.rate).toBe(150);
      expect(data.temperatureAvg).toBe(55);
      expect(data.wattage).toBe(12);
      expect(data.bitaxe).toBeDefined();
      expect(data.bitaxe!.hashRate).toBe(150);
      expect(data.bitaxe!.temp).toBe(55);
    });

    it("throws when fetch returns non-ok", async () => {
      fetchSpy.mockResolvedValue({ ok: false, status: 500 });
      await expect(driver.fetchData("192.168.1.1")).rejects.toThrow(
        "Bitaxe 192.168.1.1 returned HTTP 500"
      );
    });

    it("handles sharesRejectedReasons undefined (null-coalescing)", async () => {
      const apiResponse = createBitaxeApiResponse({
        sharesRejectedReasons: undefined,
      });
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(apiResponse),
      });
      const data = await driver.fetchData("192.168.1.1");
      expect(data.bitaxe?.sharesRejectedReasons).toEqual([]);
    });
  });

  describe("restart", () => {
    it("calls /api/system/restart POST", async () => {
      fetchSpy.mockResolvedValue({ ok: true });
      await driver.restart("192.168.1.1");
      expect(fetchSpy).toHaveBeenCalledWith("http://192.168.1.1/api/system/restart", {
        method: "POST",
        signal: expect.any(AbortSignal),
      });
    });

    it("throws when response is not ok", async () => {
      fetchSpy.mockResolvedValue({ ok: false, status: 500 });
      await expect(driver.restart("192.168.1.1")).rejects.toThrow(
        "Bitaxe restart failed for 192.168.1.1: HTTP 500"
      );
    });
  });
});
