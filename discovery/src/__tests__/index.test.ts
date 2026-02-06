const closeServer = (server: any) =>
  new Promise<void>((resolve, reject) => {
    server.close((err: unknown) => {
      if (err) reject(err);
      else resolve();
    });
  });

describe("discovery entrypoint", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete (process as any).exitCode;

    process.env.MOCK_DISCOVERY_HOST = "http://mock";
    process.env.PYASIC_BRIDGE_HOST = "http://pyasic-bridge:8000";
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("starts the server", async () => {
    process.env.PORT = "0";

    const logger = {
      info: jest.fn(),
      error: jest.fn(),
    };
    jest.doMock("@pluto/logger", () => ({ logger }));

    const mod = await import("../index");
    const started = await mod.serverPromise;

    expect(started).toBeDefined();
    await closeServer(started!.server);
  });

  it("logs and sets exitCode when startup fails", async () => {
    process.env.PORT = "-1";

    const logger = {
      info: jest.fn(),
      error: jest.fn(),
    };
    jest.doMock("@pluto/logger", () => ({ logger }));

    const mod = await import("../index");
    const started = await mod.serverPromise;

    expect(started).toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(
      "Failed to start discovery server",
      expect.anything()
    );
    expect(process.exitCode).toBe(1);
  });

  it("falls back to configured port when server has no address", async () => {
    process.env.PORT = "0";

    jest.doMock("@pluto/logger", () => ({
      logger: {
        info: jest.fn(),
        error: jest.fn(),
      },
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
