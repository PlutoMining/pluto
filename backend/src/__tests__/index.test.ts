const closeServer = (server: any) =>
  new Promise<void>((resolve, reject) => {
    server.close((err: unknown) => {
      if (err) reject(err);
      else resolve();
    });
  });

describe("backend entrypoint", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete (process as any).exitCode;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("starts and does not auto-listen by default", async () => {
    process.env.PORT = "0";
    process.env.AUTO_LISTEN = "false";
    process.env.DISCOVERY_SERVICE_HOST = "http://discovery.test";

    jest.doMock("@pluto/logger", () => ({
      logger: {
        info: jest.fn(),
        error: jest.fn(),
      },
    }));

    const listenToDevices = jest.fn().mockResolvedValue([]);
    jest.doMock("../services/device.service", () => ({
      listenToDevices,
    }));

    const mod = await import("../index");
    const started = await mod.serverPromise;

    expect(started).toBeDefined();
    expect(listenToDevices).not.toHaveBeenCalled();

    await closeServer(started!.server);
  });

  it("auto-listens when AUTO_LISTEN is enabled", async () => {
    process.env.PORT = "0";
    process.env.AUTO_LISTEN = "true";
    process.env.DISCOVERY_SERVICE_HOST = "http://discovery.test";

    jest.doMock("@pluto/logger", () => ({
      logger: {
        info: jest.fn(),
        error: jest.fn(),
      },
    }));

    const listenToDevices = jest.fn().mockResolvedValue([]);
    jest.doMock("../services/device.service", () => ({
      listenToDevices,
    }));

    const mod = await import("../index");
    const started = await mod.serverPromise;

    expect(listenToDevices).toHaveBeenCalledTimes(1);

    await closeServer(started!.server);
  });

  it("logs and sets exitCode when startup fails", async () => {
    process.env.PORT = "-1";
    process.env.AUTO_LISTEN = "false";
    process.env.DISCOVERY_SERVICE_HOST = "http://discovery.test";

    const logger = {
      info: jest.fn(),
      error: jest.fn(),
    };

    jest.doMock("@pluto/logger", () => ({
      logger,
    }));

    jest.doMock("../services/device.service", () => ({
      listenToDevices: jest.fn(),
    }));

    const mod = await import("../index");
    const started = await mod.serverPromise;

    expect(started).toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith("Failed to start backend server", expect.anything());
    expect(process.exitCode).toBe(1);
  });

  it("closes the server when autoListen fails", async () => {
    process.env.PORT = "0";
    process.env.AUTO_LISTEN = "true";
    process.env.DISCOVERY_SERVICE_HOST = "http://discovery.test";

    const logger = {
      info: jest.fn(),
      error: jest.fn(),
    };
    jest.doMock("@pluto/logger", () => ({ logger }));

    jest.doMock("../services/device.service", () => ({
      listenToDevices: jest.fn().mockRejectedValue(new Error("db down")),
    }));

    const mod = await import("../index");
    const started = await mod.serverPromise;

    expect(started).toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(
      "Failed to start backend server",
      expect.any(Error)
    );
    expect(process.exitCode).toBe(1);
  });

  it("falls back to configured port when server has no address", async () => {
    process.env.PORT = "0";
    process.env.AUTO_LISTEN = "false";
    process.env.DISCOVERY_SERVICE_HOST = "http://discovery.test";

    jest.doMock("@pluto/logger", () => ({
      logger: {
        info: jest.fn(),
        error: jest.fn(),
      },
    }));

    jest.doMock("../services/device.service", () => ({
      listenToDevices: jest.fn(),
    }));

    const http = await import("http");
    const originalAddress = (http as any).Server.prototype.address;
    (http as any).Server.prototype.address = () => null;

    try {
      const mod = await import("../index");
      const started = await mod.serverPromise;

      expect(started).toBeDefined();
      expect(started!.port).toBe(0);

      await closeServer(started!.server);
    } finally {
      (http as any).Server.prototype.address = originalAddress;
    }
  });
});
