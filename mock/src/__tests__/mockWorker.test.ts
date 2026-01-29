import { DeviceApiVersion } from "@pluto/interfaces";

describe("mockWorker", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.useFakeTimers();
    process.env = {
      ...originalEnv,
      LISTING_PORT: "7000",
      PORTS: "9001",
    };
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    process.env = originalEnv;
  });

  it("starts a websocket server when LOGS_PUB_ENABLED is true", async () => {
    process.env.LOGS_PUB_ENABLED = "true";

    const parentPort = { postMessage: jest.fn() };
    jest.doMock("worker_threads", () => ({
      parentPort,
      workerData: {
        port: 9001,
        hostname: "mockaxe1",
        apiVersion: DeviceApiVersion.Legacy,
      },
    }));

    const logger = {
      info: jest.fn(),
      debug: jest.fn(),
    };
    jest.doMock("@pluto/logger", () => ({ logger }));

    const app = {
      locals: {},
      use: jest.fn(),
    };

    const express = Object.assign(jest.fn(() => app), {
      json: jest.fn(() => "json"),
    });
    jest.doMock("express", () => ({
      __esModule: true,
      default: express,
    }));

    const server = {
      listen: jest.fn((_port: number, cb: () => void) => cb()),
    };
    jest.doMock("http", () => ({
      createServer: jest.fn(() => server),
    }));

    jest.doMock("@/routes/system.routes", () => ({
      __esModule: true,
      default: jest.fn(),
    }));

    jest.doMock("@/middlewares/checkIfRestarting", () => ({
      checkIfRestarting: jest.fn(),
    }));

    const generateFakeLog = jest.fn(() => "LOG");
    jest.doMock("@/services/mock.service", () => ({
      generateFakeLog,
    }));

    const clientOpen = { OPEN: 1, readyState: 1, send: jest.fn() };
    const clientClosed = { OPEN: 1, readyState: 0, send: jest.fn() };

    class WebSocketServer {
      static instances: WebSocketServer[] = [];
      clients: Set<any>;
      constructor(_opts: any) {
        this.clients = new Set([clientOpen, clientClosed]);
        WebSocketServer.instances.push(this);
      }
    }

    jest.doMock("ws", () => ({
      WebSocketServer,
    }));

    await import("@/mockWorker");

    expect(server.listen).toHaveBeenCalledWith(9001, expect.any(Function));
    expect(parentPort.postMessage).toHaveBeenCalledWith({
      status: "server_started",
      port: 9001,
      hostname: "mockaxe1",
    });

    expect((WebSocketServer as any).instances).toHaveLength(1);
    expect(clientOpen.send).toHaveBeenCalledWith(JSON.stringify({ log: "LOG" }));
    expect(clientClosed.send).not.toHaveBeenCalled();
  });

  it("does not start websocket server when LOGS_PUB_ENABLED is false", async () => {
    process.env.LOGS_PUB_ENABLED = "false";

    jest.doMock("worker_threads", () => ({
      parentPort: { postMessage: jest.fn() },
      workerData: {
        port: 9001,
        hostname: "mockaxe1",
        apiVersion: DeviceApiVersion.Legacy,
      },
    }));

    jest.doMock("@pluto/logger", () => ({
      logger: {
        info: jest.fn(),
        debug: jest.fn(),
      },
    }));

    const app = { locals: {}, use: jest.fn() };
    const express = Object.assign(jest.fn(() => app), {
      json: jest.fn(() => "json"),
    });
    jest.doMock("express", () => ({
      __esModule: true,
      default: express,
    }));

    jest.doMock("http", () => ({
      createServer: jest.fn(() => ({
        listen: jest.fn((_port: number, cb: () => void) => cb()),
      })),
    }));

    jest.doMock("@/routes/system.routes", () => ({
      __esModule: true,
      default: jest.fn(),
    }));
    jest.doMock("@/middlewares/checkIfRestarting", () => ({
      checkIfRestarting: jest.fn(),
    }));

    jest.doMock("@/services/mock.service", () => ({
      generateFakeLog: jest.fn(),
    }));

    const wsCtor = jest.fn();
    jest.doMock("ws", () => ({
      WebSocketServer: wsCtor,
    }));

    await import("@/mockWorker");

    expect(wsCtor).not.toHaveBeenCalled();
  });
});
