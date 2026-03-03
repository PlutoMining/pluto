import type { DiscoveredMiner, MinerData } from "@pluto/interfaces";

// ---------------------------------------------------------------------------
// Mock helpers (function declarations are hoisted, so they're available
// inside the jest.mock factories that Jest also hoists)
// ---------------------------------------------------------------------------
interface MockIO {
  server: any;
  options: any;
  handlers: Record<string, (...args: any[]) => void>;
  emitted: Array<{ event: string; payload: any }>;
  on(event: string, handler: (...args: any[]) => void): void;
  emit(event: string, payload?: any): void;
}

function createMockServerIO(server: any, options: any): MockIO {
  return {
    server,
    options,
    handlers: {},
    emitted: [],
    on(event: string, handler: (...args: any[]) => void) {
      this.handlers[event] = handler;
    },
    emit(event: string, payload?: any) {
      this.emitted.push({ event, payload });
    },
  };
}

// ---------------------------------------------------------------------------
// Module mocks (hoisted by Jest, factories execute lazily on first require)
// ---------------------------------------------------------------------------
const mockUpdateDeviceMetrics = jest.fn();
const mockRemoveDeviceMetrics = jest.fn();

jest.mock("socket.io", () => ({
  Server: jest.fn(
    (server: any, options: any) => createMockServerIO(server, options)
  ),
}));

jest.mock("@pluto/logger", () => ({
  logger: { debug: jest.fn(), info: jest.fn(), error: jest.fn() },
  createCustomLogger: jest.fn(() => ({ info: jest.fn() })),
}));

jest.mock("@pluto/db", () => ({ updateOne: jest.fn() }));

jest.mock("@pluto/utils", () => ({
  asyncForEach: jest.fn(
    async (array: any[], fn: (item: any) => Promise<void>) => {
      for (const item of array) await fn(item);
    }
  ),
}));

jest.mock("../../config/environment", () => ({
  config: {
    port: 0,
    autoListen: false,
    discoveryServiceHost: "http://discovery.test",
    prometheusHost: "http://prom.test",
    pyasicBridgeHost: "http://pyasic-bridge:8000",
    deleteDataOnDeviceRemove: false,
    systemInfoTimeoutMs: 1500,
    pollIntervalMs: 5000,
  },
}));

jest.mock("../../services/metrics.service", () => ({
  updateDeviceMetrics: mockUpdateDeviceMetrics,
  removeDeviceMetrics: mockRemoveDeviceMetrics,
  updateOverviewMetrics: jest.fn(),
}));

const mockFetchData = jest.fn();
const mockConnectLogs = jest.fn();
const mockDriver = {
  driverName: "mock",
  supportLevel: "generic" as const,
  fetchData: mockFetchData,
  connectLogs: mockConnectLogs,
  getConfigSchema: () => ({ sections: [] }),
  getEditableValues: () => ({}),
};

jest.mock("../../drivers", () => ({
  driverFactory: {
    getDriver: jest.fn(() => mockDriver),
    getDriverForDevice: jest.fn(() => mockDriver),
  },
}));

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------
const makeDiscoveredMiner = (
  overrides?: Partial<DiscoveredMiner>
): DiscoveredMiner => ({
  ip: "10.0.0.1",
  mac: "aa:bb:cc:dd:ee:ff",
  type: "mock",
  supportLevel: "generic",
  minerData: {
    ip: "10.0.0.1",
    hostname: "miner-1",
    deviceInfo: { model: "BM1368" },
    hashrate: { rate: 100, unit: { suffix: "GH/s" } },
    wattage: 50,
    voltage: 12.5,
    sharesAccepted: 100,
    sharesRejected: 5,
    uptime: 3600,
    fans: [{ speed: 3000 }],
    temperatureAvg: 65,
    hashboards: [],
  },
  ...overrides,
});

/** Miner with stale/absent hashrate — forces an immediate first poll. */
const makeStaleMiner = (
  overrides?: Partial<DiscoveredMiner>
): DiscoveredMiner =>
  makeDiscoveredMiner({
    minerData: { ip: "10.0.0.1" },
    ...overrides,
  });

const makeMinerData = (overrides?: Partial<MinerData>): MinerData =>
  ({
    ip: "10.0.0.1",
    hostname: "miner-1",
    deviceInfo: { model: "BM1368" },
    hashrate: { rate: 100, unit: { suffix: "GH/s" } },
    wattage: 50,
    voltage: 12.5,
    sharesAccepted: 100,
    sharesRejected: 5,
    uptime: 3600,
    fans: [{ speed: 3000 }],
    temperatureAvg: 65,
    hashboards: [],
    ...overrides,
  }) as MinerData;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("tracing.service", () => {
  let startIoHandler: typeof import("../../services/tracing.service").startIoHandler;
  let getIoInstance: typeof import("../../services/tracing.service").getIoInstance;
  let updateOriginalIpsListeners: typeof import("../../services/tracing.service").updateOriginalIpsListeners;
  let getTracingByIp: typeof import("../../services/tracing.service").getTracingByIp;
  let _resetForTesting: typeof import("../../services/tracing.service")._resetForTesting;

  let mockLogger: { debug: jest.Mock; info: jest.Mock; error: jest.Mock };
  let mockUpdateOne: jest.Mock;
  let mockUpdateOverviewMetrics: jest.Mock;
  let mockConfig: Record<string, any>;

  beforeAll(async () => {
    const mod = await import("../../services/tracing.service");
    startIoHandler = mod.startIoHandler;
    getIoInstance = mod.getIoInstance;
    updateOriginalIpsListeners = mod.updateOriginalIpsListeners;
    getTracingByIp = mod.getTracingByIp;
    _resetForTesting = mod._resetForTesting;

    mockLogger = (await import("@pluto/logger")).logger as any;
    mockUpdateOne = (await import("@pluto/db")).updateOne as jest.Mock;
    const metrics = await import("../../services/metrics.service");
    mockUpdateOverviewMetrics = metrics.updateOverviewMetrics as jest.Mock;
    mockConfig = (await import("../../config/environment")).config as any;
  });

  beforeEach(() => {
    jest.useFakeTimers();
    _resetForTesting();
    mockConfig.deleteDataOnDeviceRemove = false;
    mockFetchData.mockReset();
    mockConnectLogs.mockReset();
    mockUpdateDeviceMetrics.mockClear();
    mockRemoveDeviceMetrics.mockClear();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  // -----------------------------------------------------------------------
  // startIoHandler
  // -----------------------------------------------------------------------
  describe("startIoHandler", () => {
    it("initializes socket.io server with correct options", () => {
      startIoHandler({} as any);
      const io = getIoInstance() as unknown as MockIO;

      expect(io).toBeDefined();
      expect(io.options.path).toBe("/socket/io");
      expect(io.options.addTrailingSlash).toBe(false);
      expect(io.options.pingInterval).toBe(10000);
      expect(io.options.pingTimeout).toBe(5000);
    });

    it("only initializes socket.io once", () => {
      startIoHandler({} as any);
      const io1 = getIoInstance();
      startIoHandler({} as any);
      const io2 = getIoInstance();

      expect(io1).toBe(io2);
    });

    it("handles enableLogsListening event", () => {
      startIoHandler({} as any);
      const io = getIoInstance() as unknown as MockIO;

      const socket = {
        on: jest.fn((event: string, handler: () => void) => {
          if (event === "enableLogsListening") handler();
        }),
      };
      io.handlers.connection(socket);

      expect(io.emitted).toContainEqual({
        event: "logsListeningStatus",
        payload: true,
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        "External WebSocket listening enabled"
      );
    });

    it("handles disableLogsListening event", () => {
      startIoHandler({} as any);
      const io = getIoInstance() as unknown as MockIO;

      const socket = {
        on: jest.fn((event: string, handler: () => void) => {
          if (event === "disableLogsListening") handler();
        }),
      };
      io.handlers.connection(socket);

      expect(io.emitted).toContainEqual({
        event: "logsListeningStatus",
        payload: false,
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        "External WebSocket listening disabled"
      );
    });

    it("handles checkLogsListening event", () => {
      startIoHandler({} as any);
      const io = getIoInstance() as unknown as MockIO;

      const socketEmits: Array<{ event: string; payload: any }> = [];
      const socket = {
        on: jest.fn((event: string, handler: () => void) => {
          if (event === "checkLogsListening") handler();
        }),
        emit: jest.fn((event: string, payload: any) => {
          socketEmits.push({ event, payload });
        }),
      };
      io.handlers.connection(socket);

      expect(socketEmits).toContainEqual({
        event: "logsListeningStatus",
        payload: false,
      });
    });
  });

  // -----------------------------------------------------------------------
  // updateOriginalIpsListeners
  // -----------------------------------------------------------------------
  describe("updateOriginalIpsListeners", () => {
    beforeEach(() => {
      startIoHandler({} as any);
    });

    it("adds new devices and starts monitoring (fresh data skips first poll)", async () => {
      const device = makeDiscoveredMiner();
      await updateOriginalIpsListeners([device], false);

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Adding new IP to the listening pool: ${device.ip}`
      );
      // Fresh data (hashrate > 0) means first poll is skipped
      expect(mockFetchData).not.toHaveBeenCalled();

      const io = getIoInstance() as unknown as MockIO;
      expect(io.emitted.some((evt) => evt.event === "stat_update")).toBe(true);
      expect(mockUpdateDeviceMetrics).toHaveBeenCalledWith(
        device.mac,
        device.minerData
      );
    });

    it("adds new devices and polls immediately when data is stale", async () => {
      const minerData = makeMinerData();
      mockFetchData.mockResolvedValue(minerData);
      mockUpdateOne.mockResolvedValue({ ok: true });

      const device = makeStaleMiner();
      await updateOriginalIpsListeners([device], false);

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Adding new IP to the listening pool: ${device.ip}`
      );
      expect(mockFetchData).toHaveBeenCalledWith(device.ip);
    });

    it("does not add device if already being monitored", async () => {
      const minerData = makeMinerData();
      mockFetchData.mockResolvedValue(minerData);
      mockUpdateOne.mockResolvedValue({ ok: true });

      const device = makeDiscoveredMiner({ minerData });
      await updateOriginalIpsListeners([device], false);
      await updateOriginalIpsListeners([device], false);

      expect(mockLogger.info).toHaveBeenCalledWith(
        `IP ${device.ip} is already being monitored.`
      );
    });

    it("removes devices that are no longer present", async () => {
      const minerData = makeMinerData();
      mockFetchData.mockResolvedValue(minerData);
      mockUpdateOne.mockResolvedValue({ ok: true });

      const device = makeDiscoveredMiner({ minerData });
      await updateOriginalIpsListeners([device], false);
      await updateOriginalIpsListeners([], false);

      const io = getIoInstance() as unknown as MockIO;
      expect(io.emitted.some((evt) => evt.event === "device_removed")).toBe(
        true
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Stopping monitoring for IP ${device.ip}`
      );
    });

    it("connects WebSocket when traceLogs is true", async () => {
      mockConnectLogs.mockResolvedValue(jest.fn());
      const minerData = makeMinerData();
      mockFetchData.mockResolvedValue(minerData);
      mockUpdateOne.mockResolvedValue({ ok: true });

      const device = makeDiscoveredMiner({ minerData });
      await updateOriginalIpsListeners([device], true);

      expect(mockConnectLogs).toHaveBeenCalledWith(
        device.ip,
        expect.any(Function),
        expect.any(Function),
        expect.any(Function)
      );
    });

    it("invokes onMessage callback and emits logs_update when isListeningLogs is true", async () => {
      const device = makeDiscoveredMiner();
      let capturedOnMessage: ((msg: string) => void) | undefined;
      mockConnectLogs.mockImplementation(async (ip, onMessage, _onError, _onClose) => {
        capturedOnMessage = onMessage;
        return () => {};
      });

      await updateOriginalIpsListeners([device], true);

      const io = getIoInstance() as unknown as MockIO;
      const socket = { on: jest.fn((event: string, handler: () => void) => { if (event === "enableLogsListening") handler(); }) };
      io.handlers.connection(socket);

      capturedOnMessage!("test log line");
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Received log message for IP 10.0.0.1")
      );
      expect(io.emitted).toContainEqual(
        expect.objectContaining({ event: "logs_update", payload: expect.objectContaining({ logMessage: "test log line" }) })
      );
    });

    it("invokes onError callback and triggers attemptReconnect", async () => {
      const device = makeDiscoveredMiner();
      let capturedOnError: ((err: Error) => void) | undefined;
      mockConnectLogs.mockImplementation(async (ip, onMessage, onError) => {
        capturedOnError = onError;
        return () => {};
      });

      await updateOriginalIpsListeners([device], true);
      expect(capturedOnError).toBeDefined();
      capturedOnError!(new Error("ws error"));
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("WebSocket error for IP"),
        expect.any(Error)
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("Attempting to reconnect WebSocket")
      );
    });

    it("invokes onClose callback and triggers attemptReconnect", async () => {
      const device = makeDiscoveredMiner();
      let capturedOnClose: (() => void) | undefined;
      mockConnectLogs.mockImplementation(async (ip, onMessage, onError, onClose) => {
        capturedOnClose = onClose;
        return () => {};
      });

      await updateOriginalIpsListeners([device], true);
      capturedOnClose!();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining("WebSocket closed for IP")
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("Attempting to reconnect WebSocket")
      );
    });

    it("handles connectLogs throw and triggers attemptReconnect", async () => {
      const device = makeDiscoveredMiner();
      mockConnectLogs.mockRejectedValue(new Error("connect failed"));

      await updateOriginalIpsListeners([device], true);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to connect WebSocket for IP"),
        expect.any(Error)
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("Attempting to reconnect WebSocket")
      );
    });

    it("exhausts max retry attempts and logs error", async () => {
      const device = makeDiscoveredMiner();
      mockConnectLogs.mockRejectedValue(new Error("connect failed"));

      await updateOriginalIpsListeners([device], true);

      await updateOriginalIpsListeners([], false);

      for (let i = 0; i < 6; i++) {
        await jest.runAllTimersAsync();
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Max retry attempts reached for IP")
      );
    });

    it("logs when Promise.allSettled has rejected startDeviceMonitoring", async () => {
      const { driverFactory } = await import("../../drivers");
      (driverFactory.getDriverForDevice as jest.Mock).mockImplementationOnce(() => {
        throw new Error("no driver");
      });

      const device = makeDiscoveredMiner();
      await updateOriginalIpsListeners([device], false);

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to start device monitoring:",
        expect.any(Error)
      );
    });

    it("calls removeDeviceMetrics when deleteDataOnDeviceRemove is enabled", async () => {
      mockConfig.deleteDataOnDeviceRemove = true;

      const minerData = makeMinerData();
      mockFetchData.mockResolvedValue(minerData);
      mockUpdateOne.mockResolvedValue({ ok: true });

      const device = makeDiscoveredMiner({ minerData });
      await updateOriginalIpsListeners([device], false);
      await updateOriginalIpsListeners([], false);

      expect(mockRemoveDeviceMetrics).toHaveBeenCalled();
    });

    it("does not remove metrics when deleteDataOnDeviceRemove is disabled", async () => {
      const minerData = makeMinerData();
      mockFetchData.mockResolvedValue(minerData);
      mockUpdateOne.mockResolvedValue({ ok: true });

      const device = makeDiscoveredMiner({ minerData });
      await updateOriginalIpsListeners([device], false);
      await updateOriginalIpsListeners([], false);

      expect(mockRemoveDeviceMetrics).not.toHaveBeenCalled();
    });

    it("handles errors when removing metrics", async () => {
      mockConfig.deleteDataOnDeviceRemove = true;
      mockRemoveDeviceMetrics.mockImplementation(() => {
        throw new Error("remove failed");
      });

      const minerData = makeMinerData();
      mockFetchData.mockResolvedValue(minerData);
      mockUpdateOne.mockResolvedValue({ ok: true });

      const device = makeDiscoveredMiner({ minerData });
      await updateOriginalIpsListeners([device], false);
      await updateOriginalIpsListeners([], false);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to remove Prometheus metrics"),
        expect.any(Error)
      );
    });
  });

  // -----------------------------------------------------------------------
  // polling behavior
  // -----------------------------------------------------------------------
  describe("polling behavior", () => {
    beforeEach(() => {
      startIoHandler({} as any);
    });

    it("polls system info successfully and calls updateDeviceMetrics", async () => {
      const minerData = makeMinerData();
      mockFetchData.mockResolvedValue(minerData);
      mockUpdateOne.mockResolvedValue({ ...makeStaleMiner(), minerData });

      const device = makeStaleMiner();
      await updateOriginalIpsListeners([device], false);

      expect(mockFetchData).toHaveBeenCalledWith(device.ip);
      expect(mockUpdateOne).toHaveBeenCalled();
      expect(mockUpdateDeviceMetrics).toHaveBeenCalledWith(device.mac, minerData);
      expect(mockUpdateOverviewMetrics).toHaveBeenCalled();

      const io = getIoInstance() as unknown as MockIO;
      expect(io.emitted.some((evt) => evt.event === "stat_update")).toBe(true);
    });

    it("handles polling errors and emits error event", async () => {
      mockFetchData.mockRejectedValue(new Error("poll failed"));
      mockUpdateOne.mockResolvedValue(makeStaleMiner());

      const device = makeStaleMiner();
      await updateOriginalIpsListeners([device], false);

      const io = getIoInstance() as unknown as MockIO;
      expect(io.emitted.some((evt) => evt.event === "error")).toBe(true);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to poll miner data"),
        expect.any(Error)
      );
    });

    it("calls updateDeviceMetrics with minimal data on poll error", async () => {
      mockFetchData.mockRejectedValue(new Error("poll failed"));
      mockUpdateOne.mockResolvedValue(makeStaleMiner());

      const device = makeStaleMiner();
      await updateOriginalIpsListeners([device], false);

      expect(mockUpdateDeviceMetrics).toHaveBeenCalledWith(
        device.mac,
        expect.objectContaining({ ip: device.ip, fans: [], hashboards: [] })
      );
    });

    it("handles null miner data", async () => {
      mockFetchData.mockResolvedValue(null);
      mockUpdateOne.mockResolvedValue(makeStaleMiner());

      const device = makeStaleMiner();
      await updateOriginalIpsListeners([device], false);

      const io = getIoInstance() as unknown as MockIO;
      expect(io.emitted.some((evt) => evt.event === "error")).toBe(true);
    });

    it("handles database errors when persisting offline state", async () => {
      mockFetchData.mockRejectedValue(new Error("poll failed"));
      mockUpdateOne.mockRejectedValue(new Error("db error"));

      const device = makeStaleMiner();
      await updateOriginalIpsListeners([device], false);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to persist offline state"),
        expect.any(Error)
      );
    });

    it("stringifies non-Error polling failures", async () => {
      mockFetchData.mockRejectedValue("string error");
      mockUpdateOne.mockResolvedValue(makeStaleMiner());

      const device = makeStaleMiner();
      await updateOriginalIpsListeners([device], false);

      const io = getIoInstance() as unknown as MockIO;
      const errorEvent = io.emitted.find((evt) => evt.event === "error");
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.payload.error).toBe("string error");
    });
  });

  // -----------------------------------------------------------------------
  // getTracingByIp
  // -----------------------------------------------------------------------
  describe("getTracingByIp", () => {
    beforeEach(() => {
      startIoHandler({} as any);
    });

    it("returns empty object when no devices monitored", () => {
      expect(getTracingByIp()).toEqual({});
    });

    it("returns tracing state per device after successful poll", async () => {
      const minerData = makeMinerData();
      mockFetchData.mockResolvedValue(minerData);
      mockUpdateOne.mockResolvedValue({ ...makeStaleMiner(), minerData });

      const device = makeStaleMiner();
      await updateOriginalIpsListeners([device], false);

      const tracing = getTracingByIp();
      expect(tracing).toEqual({ [device.ip]: true });
    });

    it("returns tracing false for device that failed poll", async () => {
      mockFetchData.mockRejectedValue(new Error("poll failed"));
      mockUpdateOne.mockResolvedValue(makeStaleMiner());

      const device = makeStaleMiner();
      await updateOriginalIpsListeners([device], false);

      const tracing = getTracingByIp();
      expect(tracing).toEqual({ [device.ip]: false });
    });
  });

  // -----------------------------------------------------------------------
  // getIoInstance
  // -----------------------------------------------------------------------
  describe("getIoInstance", () => {
    it("returns undefined when ioHandler has not been started", () => {
      expect(getIoInstance()).toBeUndefined();
    });

    it("returns io instance after startIoHandler is called", () => {
      startIoHandler({} as any);
      expect(getIoInstance()).toBeDefined();
    });
  });
});
