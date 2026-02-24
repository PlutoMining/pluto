import { DeviceApiVersion } from "@/types/axeos.types";

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("mock index", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      LISTING_PORT: "7000",
      PORTS: "9001,9002",
      LOGS_PUB_ENABLED: "false",
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("starts workers and exposes listing route", async () => {
    const logger = {
      info: jest.fn(),
      error: jest.fn(),
    };
    jest.doMock("@pluto/logger", () => ({ logger }));

    const apps: any[] = [];
    const express = jest.fn(() => {
      const app = {
        get: jest.fn((path: string, handler: any) => {
          app._routes = app._routes ?? {};
          app._routes[path] = handler;
        }),
        listen: jest.fn((_port: number, cb: () => void) => cb()),
        _routes: {} as Record<string, any>,
      };
      apps.push(app);
      return app;
    });
    jest.doMock("express", () => ({
      __esModule: true,
      default: express,
    }));

    class Worker {
      handlers: Record<string, any> = {};
      workerData: any;

      constructor(_path: string, opts: any) {
        this.workerData = opts.workerData;
      }

      on(event: string, handler: any) {
        this.handlers[event] = handler;
        if (event === "message") {
          handler({ status: "noop" });
          handler({
            status: "server_started",
            port: this.workerData.port,
            hostname: this.workerData.hostname,
          });
        }
        if (event === "exit") {
          handler(0);
        }
      }
    }

    jest.doMock("worker_threads", () => ({
      Worker,
    }));

    await import("../index");
    await flushMicrotasks();

    expect(logger.info).toHaveBeenCalledWith("All mock servers started successfully");

    // Validate listing route.
    const listingApp = apps[0];
    const handler = listingApp._routes["/servers"];
    const res = { json: jest.fn() };
    handler({}, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Available servers from listing-server:7000",
        servers: [
          expect.objectContaining({ hostname: "bitaxeGamma2", port: 9001 }),
          expect.objectContaining({ hostname: "bitaxeSupra1", port: 9002 }),
        ],
      })
    );
  });

  it("logs worker errors", async () => {
    const logger = {
      info: jest.fn(),
      error: jest.fn(),
    };
    jest.doMock("@pluto/logger", () => ({ logger }));

    jest.doMock("express", () => ({
      __esModule: true,
      default: jest.fn(() => ({ get: jest.fn(), listen: jest.fn((_p: number, cb: () => void) => cb()) })),
    }));

    class Worker {
      on(event: string, handler: any) {
        if (event === "message") {
          handler({ status: "noop" });
        }
        if (event === "error") {
          handler(new Error("boom"));
        }
      }
    }

    jest.doMock("worker_threads", () => ({ Worker }));

    await import("../index");
    await flushMicrotasks();

    expect(logger.error).toHaveBeenCalledWith(
      "Error starting mock servers:",
      expect.any(Error)
    );
  });

  it("logs exit when worker stops with non-zero code", async () => {
    const logger = {
      info: jest.fn(),
      error: jest.fn(),
    };
    jest.doMock("@pluto/logger", () => ({ logger }));

    jest.doMock("express", () => ({
      __esModule: true,
      default: jest.fn(() => ({ get: jest.fn(), listen: jest.fn((_p: number, cb: () => void) => cb()) })),
    }));

    class Worker {
      on(event: string, handler: any) {
        if (event === "message") {
          handler({ status: "noop" });
        }
        if (event === "exit") {
          handler(1);
        }
      }
    }

    jest.doMock("worker_threads", () => ({ Worker }));

    await import("../index");
    await flushMicrotasks();

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("Error starting mock servers"),
      expect.any(Error)
    );
  });

  it("passes device profiles with API versions and overrides to workers", async () => {
    const logger = {
      info: jest.fn(),
      error: jest.fn(),
    };
    jest.doMock("@pluto/logger", () => ({ logger }));

    jest.doMock("express", () => ({
      __esModule: true,
      default: jest.fn(() => ({ get: jest.fn(), listen: jest.fn((_p: number, cb: () => void) => cb()) })),
    }));

    const ctorCalls: any[] = [];

    class Worker {
      workerData: any;
      constructor(_path: string, opts: any) {
        this.workerData = opts.workerData;
        ctorCalls.push(this.workerData);
      }
      on(event: string, handler: any) {
        if (event === "message") {
          handler({ status: "server_started", port: this.workerData.port, hostname: this.workerData.hostname });
        }
      }
    }

    jest.doMock("worker_threads", () => ({ Worker }));

    await import("../index");
    await flushMicrotasks();

    expect(ctorCalls[0].apiVersion).toBe(DeviceApiVersion.Legacy);
    expect(ctorCalls[1].apiVersion).toBe(DeviceApiVersion.New);

    expect(ctorCalls[0].hostname).toBe("bitaxeGamma2");
    expect(ctorCalls[0].systemInfoOverrides).toEqual(
      expect.objectContaining({ ASICModel: "BM1370" })
    );
    expect(ctorCalls[1].hostname).toBe("bitaxeSupra1");
    expect(ctorCalls[1].systemInfoOverrides).toEqual(
      expect.objectContaining({ ASICModel: "BM1368" })
    );
  });

  it("uses fallback hostname and empty hostnameOverride for profiles with no hostname", async () => {
    // Use 3 ports so we reach profile index 2 (hostname: ""), which exercises
    // the `hostname || \`mockaxe${i+1}\`` and `hostnameOverride = {}` branches.
    process.env.PORTS = "9001,9002,9003";

    const logger = { info: jest.fn(), error: jest.fn() };
    jest.doMock("@pluto/logger", () => ({ logger }));

    jest.doMock("express", () => ({
      __esModule: true,
      default: jest.fn(() => ({ get: jest.fn(), listen: jest.fn((_p: number, cb: () => void) => cb()) })),
    }));

    const ctorCalls: any[] = [];

    class Worker {
      workerData: any;
      constructor(_path: string, opts: any) {
        this.workerData = opts.workerData;
        ctorCalls.push(this.workerData);
      }
      on(event: string, handler: any) {
        if (event === "message") {
          handler({ status: "server_started", port: this.workerData.port, hostname: this.workerData.hostname });
        }
      }
    }

    jest.doMock("worker_threads", () => ({ Worker }));

    await import("../index");
    await flushMicrotasks();

    // Profile index 2 has hostname: "" → fallback to "mockaxe3"
    expect(ctorCalls[2].hostname).toBe("mockaxe3");
    // Empty-hostname profile injects { hostname: "" } into overrides
    expect(ctorCalls[2].systemInfoOverrides).toEqual(
      expect.objectContaining({ hostname: "" })
    );
    // Profile index 0 has a real hostname → no hostname override injected
    expect(ctorCalls[0].systemInfoOverrides).not.toHaveProperty("hostname");
  });

  it("listing server filters out its own port from the server list", async () => {
    // Use the listing port as one of the mock server ports so the filter
    // actually removes an entry, exercising the !== branch.
    process.env.LISTING_PORT = "9001";
    process.env.PORTS = "9001,9002";

    const logger = { info: jest.fn(), error: jest.fn() };
    jest.doMock("@pluto/logger", () => ({ logger }));

    const apps: any[] = [];
    const express = jest.fn(() => {
      const app = {
        get: jest.fn((p: string, handler: any) => {
          app._routes = app._routes ?? {};
          app._routes[p] = handler;
        }),
        listen: jest.fn((_port: number, cb: () => void) => cb()),
        _routes: {} as Record<string, any>,
      };
      apps.push(app);
      return app;
    });
    jest.doMock("express", () => ({ __esModule: true, default: express }));

    class Worker {
      workerData: any;
      constructor(_path: string, opts: any) { this.workerData = opts.workerData; }
      on(event: string, handler: any) {
        if (event === "message") {
          handler({ status: "server_started", port: this.workerData.port, hostname: this.workerData.hostname });
        }
      }
    }
    jest.doMock("worker_threads", () => ({ Worker }));

    await import("../index");
    await flushMicrotasks();

    const listingApp = apps[0];
    const handler = listingApp._routes["/servers"];
    const res = { json: jest.fn() };
    handler({}, res);

    const { servers } = res.json.mock.calls[0][0];
    // Port 9001 is the listing port itself — it must be filtered out
    expect(servers.every((s: any) => s.port !== 9001)).toBe(true);
    // Port 9002 should still be present
    expect(servers.some((s: any) => s.port === 9002)).toBe(true);
  });

});
