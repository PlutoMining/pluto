import { PyasicBridgeDriver } from "@/drivers/pyasic-bridge.driver";
import type { MinerConfig, PbMinerData, PbValidationResult } from "@pluto/interfaces";

jest.mock("@pluto/logger", () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

const mockPbWsHandlers: Record<string, (...args: unknown[]) => void> = {};
const mockPbWsClose = jest.fn();
jest.mock("ws", () => {
  return jest.fn().mockImplementation(() => {
    const instance = {
      on: (event: string, handler: (...args: unknown[]) => void) => {
        mockPbWsHandlers[event] = handler;
        return instance;
      },
      close: mockPbWsClose,
    };
    return instance;
  });
});

jest.mock("../../config/environment", () => ({
  config: {
    pyasicBridgeHost: "http://pyasic:8080",
    systemInfoTimeoutMs: 5000,
  },
}));

const createPbMinerData = (overrides?: Partial<PbMinerData>): PbMinerData => ({
  ip: "192.168.1.1",
  mac: "aa:bb:cc:dd:ee:ff",
  hostname: "miner",
  device_info: { make: "Antminer", model: "S19", firmware: "1.0", algo: "SHA256" },
  hashrate: { rate: 100, unit: { value: 1, suffix: "TH/s" } },
  temperature_avg: 60,
  is_mining: true,
  uptime: 3600,
  ...overrides,
});

describe("PyasicBridgeDriver", () => {
  let driver: PyasicBridgeDriver;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    driver = new PyasicBridgeDriver();
    fetchSpy = jest.spyOn(global, "fetch");
    Object.keys(mockPbWsHandlers).forEach((k) => delete mockPbWsHandlers[k]);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe("getConfigSchema", () => {
    it("returns fan, temperature, mining sections", () => {
      const schema = driver.getConfigSchema();
      expect(schema.sections).toBeDefined();
      const keys = schema.sections!.map((s) => s.key);
      expect(keys).toContain("fan");
      expect(keys).toContain("temperature");
      expect(keys).toContain("mining");
    });
  });

  describe("getEditableValues", () => {
    it("returns temperatureAvg as temperatureTarget if present", () => {
      const minerData = {
        ip: "192.168.1.1",
        temperatureAvg: 65,
      };
      const values = driver.getEditableValues(minerData as never);
      expect(values.temperatureTarget).toBe(65);
    });

    it("returns empty object when temperatureAvg is absent", () => {
      const minerData = { ip: "192.168.1.1" };
      const values = driver.getEditableValues(minerData as never);
      expect(values).toEqual({});
    });
  });

  describe("detect", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it("returns null on fetch fail", async () => {
      fetchSpy.mockRejectedValue(new Error("network"));
      const promise = driver.detect("192.168.1.1");
      await jest.runAllTimersAsync();
      const result = await promise;
      expect(result).toBeNull();
    });

    it("returns null when is_miner false", async () => {
      const results: PbValidationResult[] = [
        { ip: "192.168.1.1", is_miner: false },
      ];
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(results),
      });
      const promise = driver.detect("192.168.1.1");
      await jest.runAllTimersAsync();
      const result = await promise;
      expect(result).toBeNull();
    });

    it("returns DetectionResult when valid", async () => {
      const results: PbValidationResult[] = [
        { ip: "192.168.1.1", is_miner: true, model: "Antminer S19" },
      ];
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(results),
      });
      const promise = driver.detect("192.168.1.1");
      await jest.runAllTimersAsync();
      const result = await promise;
      expect(result).toEqual({
        type: "Antminer S19",
        model: "Antminer S19",
      });
    });

    it("returns null when response is not ok", async () => {
      fetchSpy.mockResolvedValue({ ok: false });
      const promise = driver.detect("192.168.1.1");
      await jest.runAllTimersAsync();
      const result = await promise;
      expect(result).toBeNull();
    });
  });

  describe("fetchData", () => {
    it("calls /miner/{ip}/data and maps response", async () => {
      const raw = createPbMinerData();
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(raw),
      });
      const data = await driver.fetchData("192.168.1.1");
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://pyasic:8080/miner/192.168.1.1/data",
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
      expect(data.ip).toBe("192.168.1.1");
      expect(data.mac).toBe("aa:bb:cc:dd:ee:ff");
      expect(data.deviceInfo?.model).toBe("S19");
      expect(data.hashrate?.rate).toBe(100);
      expect(data.temperatureAvg).toBe(60);
    });

    it("throws when fetch returns non-ok", async () => {
      fetchSpy.mockResolvedValue({ ok: false, status: 500 });
      await expect(driver.fetchData("192.168.1.1")).rejects.toThrow(
        "pyasic-bridge /miner/192.168.1.1/data returned 500"
      );
    });
  });

  describe("getConfig", () => {
    it("maps raw response to MinerConfig with vendorConfig", async () => {
      const raw = {
        pools: {
          groups: [
            {
              pools: [{ url: "stratum.example.com:3333", user: "u", password: "p" }],
              quota: 100,
            },
          ],
        },
        fan_mode: { mode: "manual", speed: 80, minimum_fans: 2 },
        temperature: { target: 70, hot: 80, danger: 90 },
        mining_mode: { mode: "normal" },
      };
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(raw),
      });
      const config = await driver.getConfig("192.168.1.1");
      expect(config.pools).toBeDefined();
      expect(config.pools!.groups![0].pools![0].url).toBe("stratum.example.com:3333");
      expect(config.pools!.groups![0].pools![0].user).toBe("u");
      expect(config.pools!.groups![0].pools![0].password).toBe("p");
      expect(config.vendorConfig).toBeDefined();
      expect(config.vendorConfig!.fanMode).toBe("manual");
      expect(config.vendorConfig!.fanSpeed).toBe(80);
      expect(config.vendorConfig!.minimumFans).toBe(2);
      expect(config.vendorConfig!.temperatureTarget).toBe(70);
      expect(config.vendorConfig!.temperatureHot).toBe(80);
      expect(config.vendorConfig!.temperatureDanger).toBe(90);
      expect(config.vendorConfig!.miningMode).toBe("normal");
    });

    it("throws when fetch returns non-ok", async () => {
      fetchSpy.mockResolvedValue({ ok: false, status: 404 });
      await expect(driver.getConfig("192.168.1.1")).rejects.toThrow(
        "pyasic-bridge /miner/192.168.1.1/config returned 404"
      );
    });

    it("maps pools from config when present", async () => {
      const raw = createPbMinerData({
        config: {
          pools: {
            groups: [{ pools: [{ url: "stratum.example.com:3333", user: "u", password: "p" }], quota: 50 }],
          },
        },
      });
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(raw),
      });
      const data = await driver.fetchData("192.168.1.1");
      expect(data.pools).toBeDefined();
      expect(data.pools!.groups![0].pools![0].url).toBe("stratum.example.com:3333");
      expect(data.pools!.groups![0].quota).toBe(50);
    });

    it("returns empty vendorConfig when no fan_mode, temperature, mining_mode", async () => {
      const raw = { pools: { groups: [{ pools: [] }] } };
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(raw),
      });
      const config = await driver.getConfig("192.168.1.1");
      expect(config.vendorConfig).toBeUndefined();
    });
  });

  describe("updateConfig", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it("builds patch with only fan_mode when only fan fields provided", async () => {
      fetchSpy.mockResolvedValue({ ok: true });
      const config: MinerConfig = {
        vendorConfig: { fanMode: "manual", fanSpeed: 80 },
      };
      const promise = driver.updateConfig("192.168.1.1", config);
      await jest.runAllTimersAsync();
      await promise;
      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.fan_mode).toEqual({ mode: "manual", speed: 80, minimum_fans: undefined });
    });

    it("builds correct patch body", async () => {
      fetchSpy.mockResolvedValue({ ok: true });
      const config: MinerConfig = {
        pools: {
          groups: [{ pools: [{ url: "pool.example.com:3333", user: "u" }] }],
        },
        vendorConfig: {
          fanMode: "manual",
          fanSpeed: 80,
          minimumFans: 2,
          temperatureTarget: 70,
          temperatureHot: 80,
          temperatureDanger: 90,
          miningMode: "high",
        },
      };
      const promise = driver.updateConfig("192.168.1.1", config);
      await jest.runAllTimersAsync();
      await promise;
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://pyasic:8080/miner/192.168.1.1/config",
        expect.objectContaining({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
        })
      );
      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.pools).toBeDefined();
      expect(body.fan_mode).toEqual({
        mode: "manual",
        speed: 80,
        minimum_fans: 2,
      });
      expect(body.temperature).toEqual({
        target: 70,
        hot: 80,
        danger: 90,
      });
      expect(body.mining_mode).toEqual({ mode: "high" });
    });
  });

  describe("validateConfig", () => {
    it("calls pyasic-bridge validate endpoint", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ valid: true, errors: [] }),
      });
      const result = await driver.validateConfig("192.168.1.1", {} as MinerConfig);
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://pyasic:8080/miner/192.168.1.1/config/validate",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("returns valid: false when bridge returns invalid", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ valid: false, errors: ["Invalid pool URL"] }),
      });
      const result = await driver.validateConfig("192.168.1.1", {} as MinerConfig);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(["Invalid pool URL"]);
    });

    it("returns valid: false when HTTP not ok", async () => {
      fetchSpy.mockResolvedValue({ ok: false, status: 400 });
      const result = await driver.validateConfig("192.168.1.1", {} as MinerConfig);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(["HTTP 400"]);
    });
  });

  describe("restart", () => {
    it("POSTs to restart endpoint", async () => {
      fetchSpy.mockResolvedValue({ ok: true });
      await driver.restart("192.168.1.1");
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://pyasic:8080/miner/192.168.1.1/restart",
        expect.objectContaining({
          method: "POST",
          signal: expect.any(AbortSignal),
        })
      );
    });

    it("throws when response is not ok", async () => {
      fetchSpy.mockResolvedValue({ ok: false, status: 500 });
      await expect(driver.restart("192.168.1.1")).rejects.toThrow(
        "pyasic-bridge restart for 192.168.1.1 failed: 500"
      );
    });
  });

  describe("updateConfig failure", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it("throws when fetch returns non-ok with error text", async () => {
      jest.useRealTimers();
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Bridge error"),
      });
      const config: MinerConfig = {
        pools: { groups: [{ pools: [{ url: "x", user: "y" }] }] },
      };
      await expect(
        driver.updateConfig("192.168.1.1", config)
      ).rejects.toThrow(
        "pyasic-bridge config update for 192.168.1.1 failed: 500 Bridge error"
      );
    });
  });

  describe("connectLogs", () => {
    it("returns disconnect function and connects to correct WebSocket URL", async () => {
      const WebSocket = jest.requireMock("ws") as jest.Mock;
      const onMessage = jest.fn();
      const onError = jest.fn();
      const onClose = jest.fn();
      const disconnect = await driver.connectLogs(
        "192.168.1.1",
        onMessage,
        onError,
        onClose
      );
      expect(WebSocket).toHaveBeenLastCalledWith("ws://pyasic:8080/ws/miner/192.168.1.1");
      expect(typeof disconnect).toBe("function");
      expect(() => disconnect()).not.toThrow();
    });

    it("wires onMessage, onError, onClose callbacks to WebSocket events", async () => {
      const onMessage = jest.fn();
      const onError = jest.fn();
      const onClose = jest.fn();
      await driver.connectLogs("192.168.1.1", onMessage, onError, onClose);

      mockPbWsHandlers.message?.(Buffer.from("log line"));
      expect(onMessage).toHaveBeenCalledWith("log line");

      const err = new Error("ws error");
      mockPbWsHandlers.error?.(err);
      expect(onError).toHaveBeenCalledWith(err);

      mockPbWsHandlers.close?.();
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("fetchData toMinerData", () => {
    it("handles fans with null speed", async () => {
      const raw = createPbMinerData({
        fans: [{ speed: null }, { speed: 2000 }],
      });
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(raw),
      });
      const data = await driver.fetchData("192.168.1.1");
      expect(data.fans).toEqual([{ speed: undefined }, { speed: 2000 }]);
    });

    it("handles hashrate with unit undefined", async () => {
      const raw = createPbMinerData({
        hashrate: { rate: 100, unit: undefined },
      });
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(raw),
      });
      const data = await driver.fetchData("192.168.1.1");
      expect(data.hashrate?.unit).toBeUndefined();
    });

    it("handles hashboards with null slot", async () => {
      const raw = createPbMinerData({
        hashboards: [{ slot: null, hashrate: { rate: 50 } }],
      });
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(raw),
      });
      const data = await driver.fetchData("192.168.1.1");
      expect(data.hashboards).toHaveLength(1);
      expect(data.hashboards![0].slot).toBeUndefined();
    });

    it("maps device_info with optional fields undefined", async () => {
      const raw = createPbMinerData({
        device_info: { make: "Ant", model: undefined, firmware: undefined, algo: undefined },
      });
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(raw),
      });
      const data = await driver.fetchData("192.168.1.1");
      expect(data.deviceInfo?.make).toBe("Ant");
      expect(data.deviceInfo?.model).toBeUndefined();
    });

    it("maps hashboards with hashrate unit", async () => {
      const raw = createPbMinerData({
        hashboards: [
          {
            slot: 0,
            hashrate: { rate: 50, unit: { value: 1, suffix: "TH/s" } },
            temp: 60,
          },
        ],
      });
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(raw),
      });
      const data = await driver.fetchData("192.168.1.1");
      expect(data.hashboards).toHaveLength(1);
      expect(data.hashboards![0].hashrate).toEqual({
        rate: 50,
        unit: { value: 1, suffix: "TH/s" },
      });
    });
  });
});
