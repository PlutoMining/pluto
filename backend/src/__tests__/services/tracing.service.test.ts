import type { Device } from "@pluto/interfaces";

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  url: string;
  handlers: Record<string, (arg?: any) => void> = {};
  close = jest.fn();

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  on(event: string, handler: (arg?: any) => void) {
    this.handlers[event] = handler;
  }

  trigger(event: string, arg?: any) {
    this.handlers[event]?.(arg);
  }
}

class MockServerIO {
  server: any;
  options: any;
  handlers: Record<string, (...args: any[]) => void> = {};
  emitted: Array<{ event: string; payload: any }> = [];

  constructor(server: any, options: any) {
    this.server = server;
    this.options = options;
  }

  on(event: string, handler: (...args: any[]) => void) {
    this.handlers[event] = handler;
  }

  emit(event: string, payload?: any) {
    this.emitted.push({ event, payload });
  }
}

const makeDevice = (overrides?: Partial<Device>): Device =>
  ({
    ip: "10.0.0.1",
    mac: "aa:bb:cc:dd:ee:ff",
    type: "mock",
    presetUuid: "preset-1",
    info: {
      hostname: "miner-1",
      ASICModel: "BM1368",
    } as any,
    ...(overrides ?? {}),
  }) as unknown as Device;

const loadTracingService = async (opts?: { deleteDataOnDeviceRemove?: boolean }) => {
  MockWebSocket.instances = [];

  jest.doMock("axios", () => ({
    __esModule: true,
    default: {
      get: jest.fn(),
    },
  }));

  jest.doMock("ws", () => ({
    __esModule: true,
    default: MockWebSocket,
  }));

  const serverCtor = jest.fn((server, options) => new MockServerIO(server, options));
  jest.doMock("socket.io", () => ({
    Server: serverCtor,
  }));

  jest.doMock("@pluto/logger", () => ({
    logger: {
      debug: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
    },
    createCustomLogger: jest.fn(() => ({
      info: jest.fn(),
    })),
  }));

  jest.doMock("@pluto/db", () => ({
    updateOne: jest.fn(),
  }));

  jest.doMock("../../config/environment", () => ({
    config: {
      port: 0,
      autoListen: false,
      discoveryServiceHost: "http://discovery.test",
      prometheusHost: "http://prom.test",
      deleteDataOnDeviceRemove: opts?.deleteDataOnDeviceRemove ?? false,
    },
  }));

  jest.doMock("../../services/metrics.service", () => ({
    createMetricsForDevice: jest.fn(() => ({
      updatePrometheusMetrics: jest.fn(),
    })),
    deleteMetricsForDevice: jest.fn(),
    updateOverviewMetrics: jest.fn(),
  }));

  const tracingService = await import("../../services/tracing.service");

  const axios = (await import("axios")).default as any;
  const metricsService = jest.requireMock("../../services/metrics.service");
  const db = jest.requireMock("@pluto/db");
  const logger = jest.requireMock("@pluto/logger");
  const socketIo = jest.requireMock("socket.io");

  return {
    tracingService,
    axios,
    metricsService,
    db,
    logger,
    socketIo,
  };
};

const flushMicrotasks = async () => {
  // Polling happens in detached async functions; give them time to settle.
  await Promise.resolve();
  await Promise.resolve();
};

describe("tracing.service", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetModules();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("startIoHandler initializes socket.io once and toggles log listening", async () => {
    const { tracingService, socketIo } = await loadTracingService();
    const server = {} as any;

    tracingService.startIoHandler(server);
    tracingService.startIoHandler(server);

    expect(socketIo.Server).toHaveBeenCalledTimes(1);

    const io = tracingService.getIoInstance() as any as MockServerIO;
    expect(io.options.path).toBe("/socket/io");

    const socketHandlers: Record<string, () => void> = {};
    const socketEmits: Array<{ event: string; payload: any }> = [];
    const socket = {
      on: (event: string, handler: () => void) => {
        socketHandlers[event] = handler;
      },
      emit: (event: string, payload: any) => {
        socketEmits.push({ event, payload });
      },
    };

    io.handlers.connection(socket);

    socketHandlers.enableLogsListening();
    expect(io.emitted).toContainEqual({ event: "logsListeningStatus", payload: true });

    socketHandlers.checkLogsListening();
    expect(socketEmits).toContainEqual({ event: "logsListeningStatus", payload: true });

    socketHandlers.disableLogsListening();
    expect(io.emitted).toContainEqual({ event: "logsListeningStatus", payload: false });
  });

  it("polls system info successfully and updates metrics/db", async () => {
    const { tracingService, axios, metricsService, db } = await loadTracingService();
    tracingService.startIoHandler({} as any);

    axios.get.mockResolvedValue({
      data: {
        ASICModel: "BM1368",
        hostname: "miner-1",
        uptime_s: "10",
        // Ensure we cover the best_diff normalization.
        best_diff: "1M",
      },
    });

    db.updateOne.mockResolvedValue({ ok: true });

    const device = makeDevice({
      presetUuid: "preset-1",
      info: {
        hostname: "miner-1",
        ASICModel: "BM1368",
        frequencyOptions: [{ label: "x", value: 1 }],
        coreVoltageOptions: [{ label: "y", value: 2 }],
      } as any,
    });

    await tracingService.updateOriginalIpsListeners([device], false);
    await flushMicrotasks();

    expect(axios.get).toHaveBeenCalledWith("http://10.0.0.1/api/system/info");
    expect(metricsService.createMetricsForDevice).toHaveBeenCalled();
    expect(metricsService.updateOverviewMetrics).toHaveBeenCalled();
    expect(db.updateOne).toHaveBeenCalled();

    const updatePayload = db.updateOne.mock.calls[0][3];
    expect(updatePayload.presetUuid).toBeUndefined();
  });

  it("supports unknown ASICModel by falling back to existing tuning options", async () => {
    const { tracingService, axios, db } = await loadTracingService();
    tracingService.startIoHandler({} as any);

    axios.get.mockResolvedValue({
      data: {
        ASICModel: "UNKNOWN",
        hostname: "miner-1",
        frequencyOptions: [{ label: "fallback", value: 1 }],
        coreVoltageOptions: [{ label: "fallback", value: 2 }],
      },
    });

    db.updateOne.mockResolvedValue({ ok: true });

    const device = makeDevice({
      info: { hostname: "miner-1", ASICModel: "UNKNOWN" } as any,
    });

    await tracingService.updateOriginalIpsListeners([device], false);
    await flushMicrotasks();

    const updatePayload = db.updateOne.mock.calls[0][3];
    expect(updatePayload.info.frequencyOptions).toEqual([{ label: "fallback", value: 1 }]);
    expect(updatePayload.info.coreVoltageOptions).toEqual([{ label: "fallback", value: 2 }]);
  });

  it("handles polling errors and emits an error event", async () => {
    const { tracingService, axios, metricsService } = await loadTracingService();
    tracingService.startIoHandler({} as any);

    axios.get.mockRejectedValue(new Error("boom"));

    const device = makeDevice();
    await tracingService.updateOriginalIpsListeners([device], false);
    await flushMicrotasks();

    const io = tracingService.getIoInstance() as any as MockServerIO;
    expect(io.emitted.some((evt) => evt.event === "error")).toBe(true);

    const { updatePrometheusMetrics } = metricsService.createMetricsForDevice.mock.results[0].value;
    expect(updatePrometheusMetrics).toHaveBeenCalledWith(
      expect.objectContaining({ power: 0, voltage: 0, current: 0 })
    );
    expect(metricsService.updateOverviewMetrics).toHaveBeenCalled();
  });

  it("removes stale devices and optionally deletes Prometheus metrics", async () => {
    const { tracingService, axios, metricsService } = await loadTracingService({
      deleteDataOnDeviceRemove: true,
    });
    tracingService.startIoHandler({} as any);

    axios.get.mockResolvedValue({ data: { ASICModel: "BM1368", hostname: "miner-1" } });

    const device = makeDevice();
    await tracingService.updateOriginalIpsListeners([device], false);
    await flushMicrotasks();
    await tracingService.updateOriginalIpsListeners([], false);

    expect(metricsService.deleteMetricsForDevice).toHaveBeenCalled();

    const io = tracingService.getIoInstance() as any as MockServerIO;
    expect(io.emitted.some((evt) => evt.event === "device_removed")).toBe(true);
  });

  it("keeps metrics when deleteDataOnDeviceRemove is disabled and swallows delete errors", async () => {
    const { tracingService, axios, metricsService, logger } = await loadTracingService({
      deleteDataOnDeviceRemove: false,
    });
    tracingService.startIoHandler({} as any);

    axios.get.mockResolvedValue({ data: { ASICModel: "BM1368", hostname: "miner-1" } });

    const device = makeDevice();
    await tracingService.updateOriginalIpsListeners([device], false);
    await flushMicrotasks();

    (metricsService.deleteMetricsForDevice as jest.Mock).mockImplementation(() => {
      throw new Error("delete failed");
    });

    await tracingService.updateOriginalIpsListeners([], false);

    expect(metricsService.deleteMetricsForDevice).not.toHaveBeenCalled();
    expect(logger.logger.error).not.toHaveBeenCalledWith(
      expect.stringContaining("Failed to delete Prometheus metrics")
    );
  });

  it("logs delete errors when deleteDataOnDeviceRemove is enabled", async () => {
    const { tracingService, axios, metricsService, logger } = await loadTracingService({
      deleteDataOnDeviceRemove: true,
    });
    tracingService.startIoHandler({} as any);

    axios.get.mockResolvedValue({ data: { ASICModel: "BM1368", hostname: "miner-1" } });

    const device = makeDevice();
    await tracingService.updateOriginalIpsListeners([device], false);
    await flushMicrotasks();

    (metricsService.deleteMetricsForDevice as jest.Mock).mockImplementation(() => {
      throw new Error("delete failed");
    });

    await tracingService.updateOriginalIpsListeners([], false);

    expect(logger.logger.error).toHaveBeenCalledWith(
      expect.stringContaining("Failed to delete Prometheus metrics"),
      expect.any(Error)
    );
  });

  it("streams logs over socket.io when enabled", async () => {
    const { tracingService, axios, logger } = await loadTracingService();
    tracingService.startIoHandler({} as any);

    const io = tracingService.getIoInstance() as any as MockServerIO;
    const socketHandlers: Record<string, () => void> = {};
    const socket = {
      on: (event: string, handler: () => void) => {
        socketHandlers[event] = handler;
      },
      emit: jest.fn(),
    };
    io.handlers.connection(socket);
    socketHandlers.enableLogsListening();

    axios.get.mockResolvedValue({ data: { ASICModel: "BM1368", hostname: "miner-1" } });

    const device = makeDevice();
    await tracingService.updateOriginalIpsListeners([device], true);
    await flushMicrotasks();

    const ws = MockWebSocket.instances[0];
    ws.trigger("open");
    ws.trigger("message", Buffer.from("hello"));

    expect(io.emitted.some((evt) => evt.event === "logs_update")).toBe(true);
    expect(logger.createCustomLogger).toHaveBeenCalledWith("miner-1");
  });

  it("does not stream logs when listening is disabled", async () => {
    const { tracingService, axios } = await loadTracingService();
    tracingService.startIoHandler({} as any);

    axios.get.mockResolvedValue({ data: { ASICModel: "BM1368", hostname: "miner-1" } });

    const device = makeDevice();
    await tracingService.updateOriginalIpsListeners([device], true);
    await flushMicrotasks();

    const io = tracingService.getIoInstance() as any as MockServerIO;
    const ws = MockWebSocket.instances[0];
    ws.trigger("message", Buffer.from("hello"));

    expect(io.emitted.some((evt) => evt.event === "logs_update")).toBe(false);
  });

  it("retries websocket reconnects and stops after max attempts", async () => {
    const { tracingService, axios, logger } = await loadTracingService();
    tracingService.startIoHandler({} as any);

    axios.get.mockResolvedValue({ data: { ASICModel: "BM1368", hostname: "miner-1" } });

    const device = makeDevice();
    await tracingService.updateOriginalIpsListeners([device], true);
    await flushMicrotasks();

    const ws = MockWebSocket.instances[0];
    for (let i = 0; i < 6; i++) {
      ws.trigger("close");
    }

    ws.trigger("error", new Error("socket"));

    expect(logger.logger.error).toHaveBeenCalledWith(
      expect.stringContaining("Max retry attempts reached")
    );
  });

  it("marks devices as already monitored", async () => {
    const { tracingService, axios, logger } = await loadTracingService();
    tracingService.startIoHandler({} as any);

    axios.get.mockResolvedValue({ data: { ASICModel: "BM1368", hostname: "miner-1" } });

    const device = makeDevice();
    await tracingService.updateOriginalIpsListeners([device], false);
    await flushMicrotasks();

    await tracingService.updateOriginalIpsListeners([device], false);

    expect(logger.logger.info).toHaveBeenCalledWith(
      expect.stringContaining("already being monitored")
    );
  });

  it("falls back to empty tuning options when none are present", async () => {
    const { tracingService, axios, db } = await loadTracingService();
    tracingService.startIoHandler({} as any);

    axios.get.mockResolvedValue({
      data: {
        ASICModel: 123,
        hostname: "miner-1",
      },
    });

    db.updateOne.mockResolvedValue({ ok: true });

    const device = makeDevice({
      info: { hostname: "miner-1", ASICModel: 123 } as any,
    });

    await tracingService.updateOriginalIpsListeners([device], false);
    await flushMicrotasks();

    const updatePayload = db.updateOne.mock.calls[0][3];
    expect(updatePayload.info.frequencyOptions).toEqual([]);
    expect(updatePayload.info.coreVoltageOptions).toEqual([]);
  });
});
