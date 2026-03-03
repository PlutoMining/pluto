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

    const listingApp = apps[0];
    const handler = listingApp._routes["/servers"];
    const res = { json: jest.fn() };
    handler({}, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Available servers from listing-server:7000",
        servers: [
          expect.objectContaining({ hostname: "antminer-s19-pro-01", port: 9001 }),
          expect.objectContaining({ hostname: "whatsminer-m30s-01", port: 9002 }),
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

  it("passes generic profiles with overrides to workers", async () => {
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

    expect(ctorCalls[0].minerType).toBe("generic");
    expect(ctorCalls[0].hostname).toBe("antminer-s19-pro-01");
    expect(ctorCalls[0].systemInfoOverrides).toEqual(
      expect.objectContaining({ make: "Bitmain", model: "Antminer S19 Pro" })
    );
    expect(ctorCalls[1].minerType).toBe("generic");
    expect(ctorCalls[1].hostname).toBe("whatsminer-m30s-01");
    expect(ctorCalls[1].systemInfoOverrides).toEqual(
      expect.objectContaining({ make: "MicroBT", model: "Whatsminer M30S++" })
    );
  });

  it("uses fallback hostname for profiles with empty hostname", async () => {
    process.env.PORTS = "9001,9002,9003,9004,9005";

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

    // Profile index 4 has hostname: "" → fallback to "mock-miner-5"
    expect(ctorCalls[4].hostname).toBe("mock-miner-5");
    expect(ctorCalls[4].systemInfoOverrides).toEqual(
      expect.objectContaining({ hostname: "" })
    );
    // Profile index 0 has a real hostname → no hostname override injected
    expect(ctorCalls[0].systemInfoOverrides).not.toHaveProperty("hostname");
  });

  it("listing server filters out its own port from the server list", async () => {
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
    expect(servers.every((s: any) => s.port !== 9001)).toBe(true);
    expect(servers.some((s: any) => s.port === 9002)).toBe(true);
  });
});
