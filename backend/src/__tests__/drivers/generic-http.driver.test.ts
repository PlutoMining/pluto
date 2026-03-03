import { GenericHttpDriver } from "@/drivers/generic-http.driver";

jest.mock("@pluto/logger", () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

const mockWsHandlers: Record<string, (...args: unknown[]) => void> = {};
const mockWsClose = jest.fn();
jest.mock("ws", () => {
  return jest.fn().mockImplementation(() => {
    const instance = {
      on: (event: string, handler: (...args: unknown[]) => void) => {
        mockWsHandlers[event] = handler;
        return instance;
      },
      close: mockWsClose,
    };
    return instance;
  });
});

describe("GenericHttpDriver", () => {
  let driver: GenericHttpDriver;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    driver = new GenericHttpDriver();
    fetchSpy = jest.spyOn(global, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe("getConfigSchema", () => {
    it("returns empty sections", () => {
      const schema = driver.getConfigSchema();
      expect(schema.sections).toEqual([]);
    });
  });

  describe("getEditableValues", () => {
    it("returns empty object", () => {
      const result = driver.getEditableValues({ ip: "192.168.1.1" } as never);
      expect(result).toEqual({});
    });
  });

  describe("detect", () => {
    it("returns null always", async () => {
      const result = await driver.detect("192.168.1.1");
      expect(result).toBeNull();
    });
  });

  describe("fetchData", () => {
    it("calls /api/system/info and maps to MinerData", async () => {
      const raw = {
        mac: "aa:bb:cc:dd:ee:ff",
        hostname: "miner-1",
        make: "Generic",
        model: "Miner",
        firmware: "1.0",
        algo: "SHA256",
        hashrate: 100,
        expected_hashrate: 100,
        wattage: 50,
        voltage: 12,
        temperature_avg: 55,
        shares_accepted: 10,
        shares_rejected: 0,
        is_mining: true,
        uptime: 3600,
      };
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(raw),
      });
      const data = await driver.fetchData("192.168.1.1");
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://192.168.1.1/api/system/info",
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
      expect(data.ip).toBe("192.168.1.1");
      expect(data.mac).toBe("aa:bb:cc:dd:ee:ff");
      expect(data.hostname).toBe("miner-1");
      expect(data.deviceInfo).toEqual({
        make: "Generic",
        model: "Miner",
        firmware: "1.0",
        algo: "SHA256",
      });
      expect(data.hashrate?.rate).toBe(100);
      expect(data.temperatureAvg).toBe(55);
      expect(data.isMining).toBe(true);
    });

    it("throws when fetch returns non-ok", async () => {
      fetchSpy.mockResolvedValue({ ok: false, status: 404 });
      await expect(driver.fetchData("192.168.1.1")).rejects.toThrow(
        "generic-http /api/system/info for 192.168.1.1 returned 404"
      );
    });
  });

  describe("getConfig", () => {
    it("returns pools from pool_url", async () => {
      const raw = {
        pool_url: "stratum+tcp://pool.example.com:3333",
        pool_user: "user",
      };
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(raw),
      });
      const config = await driver.getConfig("192.168.1.1");
      expect(config.pools).toBeDefined();
      expect(config.pools!.groups![0].pools![0].url).toBe("stratum+tcp://pool.example.com:3333");
      expect(config.pools!.groups![0].pools![0].user).toBe("user");
    });

    it("returns pool_user undefined when absent", async () => {
      const raw = { pool_url: "stratum+tcp://pool.example.com:3333" };
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(raw),
      });
      const config = await driver.getConfig("192.168.1.1");
      expect(config.pools!.groups![0].pools![0].user).toBeUndefined();
    });

    it("returns empty config when no pool_url", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });
      const config = await driver.getConfig("192.168.1.1");
      expect(config).toEqual({});
    });

    it("throws when fetch returns non-ok", async () => {
      fetchSpy.mockResolvedValue({ ok: false, status: 500 });
      await expect(driver.getConfig("192.168.1.1")).rejects.toThrow(
        "generic-http config fetch for 192.168.1.1 returned 500"
      );
    });
  });

  describe("updateConfig", () => {
    it("PATCHes with pool fields", async () => {
      fetchSpy.mockResolvedValue({ ok: true });
      await driver.updateConfig("192.168.1.1", {
        pools: {
          groups: [
            {
              pools: [
                { url: "stratum+tcp://pool.example.com:3333", user: "miner" },
              ],
            },
          ],
        },
      });
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://192.168.1.1/api/system",
        expect.objectContaining({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
        })
      );
      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.pool_url).toBe("stratum+tcp://pool.example.com:3333");
      expect(body.pool_user).toBe("miner");
    });

    it("handles non-ok response", async () => {
      fetchSpy.mockResolvedValue({ ok: false, status: 500 });
      await expect(
        driver.updateConfig("192.168.1.1", {
          pools: { groups: [{ pools: [{ url: "x", user: "y" }] }] },
        })
      ).rejects.toThrow("generic-http config update for 192.168.1.1 failed: 500");
    });
  });

  describe("validateConfig", () => {
    it("returns valid: true always", async () => {
      const result = await driver.validateConfig("192.168.1.1", {} as never);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe("restart", () => {
    it("POSTs to /api/system/restart", async () => {
      fetchSpy.mockResolvedValue({ ok: true });
      await driver.restart("192.168.1.1");
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://192.168.1.1/api/system/restart",
        expect.objectContaining({
          method: "POST",
          signal: expect.any(AbortSignal),
        })
      );
    });

    it("throws when response is not ok", async () => {
      fetchSpy.mockResolvedValue({ ok: false, status: 500 });
      await expect(driver.restart("192.168.1.1")).rejects.toThrow(
        "generic-http restart for 192.168.1.1 failed: 500"
      );
    });
  });

  describe("fetchData toMinerData", () => {
    it("handles empty fans array", async () => {
      const raw = {
        mac: "aa:bb:cc",
        fans: [],
        hashboards: [],
      };
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(raw),
      });
      const data = await driver.fetchData("192.168.1.1");
      expect(data.fans).toEqual([]);
    });

    it("handles hashboards with optional fields undefined", async () => {
      const raw = {
        mac: "aa:bb:cc",
        hashboards: [
          { slot: 0 },
          { hashrate: 50, temp: undefined, chip_temp: undefined },
        ],
      };
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(raw),
      });
      const data = await driver.fetchData("192.168.1.1");
      expect(data.hashboards).toHaveLength(2);
      expect(data.hashboards![0]).toEqual({
        slot: 0,
        hashrate: undefined,
        temp: undefined,
        chipTemp: undefined,
        chips: undefined,
        expectedChips: undefined,
        active: undefined,
        voltage: undefined,
      });
    });

    it("handles raw without fans or hashboards arrays", async () => {
      const raw = { mac: "aa:bb:cc", hashrate: 100 };
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(raw),
      });
      const data = await driver.fetchData("192.168.1.1");
      expect(data.fans).toBeUndefined();
      expect(data.hashboards).toBeUndefined();
    });

    it("returns deviceInfo undefined when make/model/firmware/algo all falsy", async () => {
      const raw = {
        mac: "aa:bb:cc",
        hashrate: 100,
      };
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(raw),
      });
      const data = await driver.fetchData("192.168.1.1");
      expect(data.deviceInfo).toBeUndefined();
    });

    it("maps fans and hashboards arrays", async () => {
      const raw = {
        mac: "aa:bb:cc",
        fans: [{ speed: 2000 }, { speed: 2100 }],
        hashboards: [
          {
            slot: 0,
            hashrate: 50,
            temp: 60,
            chip_temp: 65,
            chips: 100,
            expected_chips: 100,
            active: true,
            voltage: 12,
          },
        ],
      };
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(raw),
      });
      const data = await driver.fetchData("192.168.1.1");
      expect(data.fans).toEqual([{ speed: 2000 }, { speed: 2100 }]);
      expect(data.hashboards).toHaveLength(1);
      expect(data.hashboards![0]).toEqual({
        slot: 0,
        hashrate: { rate: 50 },
        temp: 60,
        chipTemp: 65,
        chips: 100,
        expectedChips: 100,
        active: true,
        voltage: 12,
      });
    });
  });

  describe("connectLogs", () => {
    it("returns disconnect function and wires WebSocket handlers", async () => {
      const WebSocket = jest.requireMock("ws") as jest.Mock;
      const onMessage = jest.fn();
      const onError = jest.fn();
      const onClose = jest.fn();
      const disconnect = await driver.connectLogs("192.168.1.1", onMessage, onError, onClose);
      expect(WebSocket).toHaveBeenCalledWith("ws://192.168.1.1");
      mockWsHandlers.open?.();
      mockWsHandlers.message?.(Buffer.from("log line"));
      expect(onMessage).toHaveBeenCalledWith("log line");
      mockWsHandlers.error?.(new Error("ws error"));
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
      disconnect();
      expect(mockWsClose).toHaveBeenCalled();
      mockWsHandlers.close?.();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
