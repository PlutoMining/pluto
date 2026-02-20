import type { DiscoveredMiner } from "@pluto/interfaces";
import type { MinerData } from "@pluto/pyasic-bridge-client";

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
const mockUpdatePrometheusMetrics = jest.fn();

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
  sanitizeHostname: jest.fn((h: string) => h),
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
  createMetricsForDevice: jest.fn(() => ({
    updatePrometheusMetrics: mockUpdatePrometheusMetrics,
  })),
  deleteMetricsForDevice: jest.fn(),
  updateOverviewMetrics: jest.fn(),
}));

jest.mock("../../services/pyasic-bridge.service", () => ({
  pyasicBridgeService: {
    fetchMinerData: jest.fn(),
    connectMinerLogsWebSocket: jest.fn(),
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
  minerData: {
    ip: "10.0.0.1",
    hostname: "miner-1",
    model: "BM1368",
    device_info: { model: "BM1368" },
    hashrate: { rate: 100, unit: "GH/s" },
    wattage: 50,
    voltage: 12.5,
    shares_accepted: 100,
    shares_rejected: 5,
    uptime: 3600,
    fans: [{ speed: 3000 }],
    temperature_avg: 65,
    hashboards: [],
  } as MinerData,
  ...overrides,
});

const makeMinerData = (overrides?: Partial<MinerData>): MinerData =>
  ({
    ip: "10.0.0.1",
    hostname: "miner-1",
    model: "BM1368",
    device_info: { model: "BM1368" },
    hashrate: { rate: 100, unit: "GH/s" },
    wattage: 50,
    voltage: 12.5,
    shares_accepted: 100,
    shares_rejected: 5,
    uptime: 3600,
    fans: [{ speed: 3000 }],
    temperature_avg: 65,
    hashboards: [],
    ...overrides,
  }) as MinerData;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("tracing.service", () => {
  // SUT references (loaded once in beforeAll, state reset per test)
  let startIoHandler: typeof import("../../services/tracing.service").startIoHandler;
  let getIoInstance: typeof import("../../services/tracing.service").getIoInstance;
  let updateOriginalIpsListeners: typeof import("../../services/tracing.service").updateOriginalIpsListeners;
  let _resetForTesting: typeof import("../../services/tracing.service")._resetForTesting;

  // Mock references (obtained after SUT loads its mocked dependencies)
  let mockLogger: { debug: jest.Mock; info: jest.Mock; error: jest.Mock };
  let mockUpdateOne: jest.Mock;
  let mockDeleteMetricsForDevice: jest.Mock;
  let mockUpdateOverviewMetrics: jest.Mock;
  let mockFetchMinerData: jest.Mock;
  let mockConnectMinerLogsWebSocket: jest.Mock;
  let mockConfig: Record<string, any>;

  beforeAll(async () => {
    // Dynamic import triggers all mock factories (consts above are initialised)
    const mod = await import("../../services/tracing.service");
    startIoHandler = mod.startIoHandler;
    getIoInstance = mod.getIoInstance;
    updateOriginalIpsListeners = mod.updateOriginalIpsListeners;
    _resetForTesting = mod._resetForTesting;

    // Obtain typed references to the mock objects the SUT uses
    mockLogger = (await import("@pluto/logger")).logger as any;
    mockUpdateOne = (await import("@pluto/db")).updateOne as jest.Mock;
    const metrics = await import("../../services/metrics.service");
    mockDeleteMetricsForDevice = metrics.deleteMetricsForDevice as jest.Mock;
    mockUpdateOverviewMetrics = metrics.updateOverviewMetrics as jest.Mock;
    const pyasic = await import("../../services/pyasic-bridge.service");
    mockFetchMinerData = (pyasic.pyasicBridgeService as any).fetchMinerData;
    mockConnectMinerLogsWebSocket = (pyasic.pyasicBridgeService as any)
      .connectMinerLogsWebSocket;
    mockConfig = (await import("../../config/environment")).config as any;
  });

  beforeEach(() => {
    jest.useFakeTimers();
    _resetForTesting();
    mockConfig.deleteDataOnDeviceRemove = false;
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

    it("adds new devices and starts monitoring", async () => {
      const minerData = makeMinerData();
      mockFetchMinerData.mockResolvedValue(minerData);
      mockUpdateOne.mockResolvedValue({ ok: true });

      const device = makeDiscoveredMiner({ minerData });
      await updateOriginalIpsListeners([device], false);

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Adding new IP to the listening pool: ${device.ip}`
      );
      expect(mockFetchMinerData).toHaveBeenCalledWith(device.ip);
    });

    it("does not add device if already being monitored", async () => {
      const minerData = makeMinerData();
      mockFetchMinerData.mockResolvedValue(minerData);
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
      mockFetchMinerData.mockResolvedValue(minerData);
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
      mockConnectMinerLogsWebSocket.mockResolvedValue(jest.fn());
      const minerData = makeMinerData();
      mockFetchMinerData.mockResolvedValue(minerData);
      mockUpdateOne.mockResolvedValue({ ok: true });

      const device = makeDiscoveredMiner({ minerData });
      await updateOriginalIpsListeners([device], true);

      expect(mockConnectMinerLogsWebSocket).toHaveBeenCalledWith(
        device.ip,
        expect.any(Function),
        expect.any(Function),
        expect.any(Function)
      );
    });

    it("deletes metrics when deleteDataOnDeviceRemove is enabled", async () => {
      mockConfig.deleteDataOnDeviceRemove = true;

      const minerData = makeMinerData();
      mockFetchMinerData.mockResolvedValue(minerData);
      mockUpdateOne.mockResolvedValue({ ok: true });

      const device = makeDiscoveredMiner({ minerData });
      await updateOriginalIpsListeners([device], false);
      await updateOriginalIpsListeners([], false);

      expect(mockDeleteMetricsForDevice).toHaveBeenCalled();
    });

    it("does not delete metrics when deleteDataOnDeviceRemove is disabled", async () => {
      // mockConfig.deleteDataOnDeviceRemove is already false (from beforeEach)
      const minerData = makeMinerData();
      mockFetchMinerData.mockResolvedValue(minerData);
      mockUpdateOne.mockResolvedValue({ ok: true });

      const device = makeDiscoveredMiner({ minerData });
      await updateOriginalIpsListeners([device], false);
      await updateOriginalIpsListeners([], false);

      expect(mockDeleteMetricsForDevice).not.toHaveBeenCalled();
    });

    it("handles errors when deleting metrics", async () => {
      mockConfig.deleteDataOnDeviceRemove = true;
      mockDeleteMetricsForDevice.mockImplementation(() => {
        throw new Error("delete failed");
      });

      const minerData = makeMinerData();
      mockFetchMinerData.mockResolvedValue(minerData);
      mockUpdateOne.mockResolvedValue({ ok: true });

      const device = makeDiscoveredMiner({ minerData });
      await updateOriginalIpsListeners([device], false);
      await updateOriginalIpsListeners([], false);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to delete Prometheus metrics"),
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

    it("polls system info successfully and updates metrics", async () => {
      const minerData = makeMinerData();
      mockFetchMinerData.mockResolvedValue(minerData);
      mockUpdateOne.mockResolvedValue({ ...makeDiscoveredMiner(), minerData });

      const device = makeDiscoveredMiner({ minerData });
      await updateOriginalIpsListeners([device], false);

      expect(mockFetchMinerData).toHaveBeenCalledWith(device.ip);
      expect(mockUpdateOne).toHaveBeenCalled();
      expect(mockUpdatePrometheusMetrics).toHaveBeenCalled();
      expect(mockUpdateOverviewMetrics).toHaveBeenCalled();

      const io = getIoInstance() as unknown as MockIO;
      expect(io.emitted.some((evt) => evt.event === "stat_update")).toBe(true);
    });

    it("handles polling errors and emits error event", async () => {
      mockFetchMinerData.mockRejectedValue(new Error("poll failed"));
      mockUpdateOne.mockResolvedValue(makeDiscoveredMiner());

      const device = makeDiscoveredMiner();
      await updateOriginalIpsListeners([device], false);

      const io = getIoInstance() as unknown as MockIO;
      expect(io.emitted.some((evt) => evt.event === "error")).toBe(true);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to poll miner data"),
        expect.any(Error)
      );
    });

    it("handles null miner data", async () => {
      mockFetchMinerData.mockResolvedValue(null);
      mockUpdateOne.mockResolvedValue(makeDiscoveredMiner());

      const device = makeDiscoveredMiner();
      await updateOriginalIpsListeners([device], false);

      const io = getIoInstance() as unknown as MockIO;
      expect(io.emitted.some((evt) => evt.event === "error")).toBe(true);
    });

    it("handles database errors when persisting offline state", async () => {
      mockFetchMinerData.mockRejectedValue(new Error("poll failed"));
      mockUpdateOne.mockRejectedValue(new Error("db error"));

      const device = makeDiscoveredMiner();
      await updateOriginalIpsListeners([device], false);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to persist offline state"),
        expect.any(Error)
      );
    });

    it("stringifies non-Error polling failures", async () => {
      mockFetchMinerData.mockRejectedValue("string error");
      mockUpdateOne.mockResolvedValue(makeDiscoveredMiner());

      const device = makeDiscoveredMiner();
      await updateOriginalIpsListeners([device], false);

      const io = getIoInstance() as unknown as MockIO;
      const errorEvent = io.emitted.find((evt) => evt.event === "error");
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.payload.error).toBe("string error");
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
