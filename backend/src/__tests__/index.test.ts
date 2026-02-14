// ---------------------------------------------------------------------------
// Module mocks (hoisted by Jest — keep all routes and heavy deps mocked so
// importing index.ts doesn't pull in the entire controller/service tree)
// ---------------------------------------------------------------------------
jest.mock("@pluto/logger", () => ({
  logger: { info: jest.fn(), error: jest.fn() },
}));

jest.mock("../services/device.service", () => ({
  listenToDevices: jest.fn().mockResolvedValue([]),
}));

jest.mock("../routes/metrics.routes", () => jest.fn());
jest.mock("../routes/devices.routes", () => jest.fn());
jest.mock("../routes/presets.routes", () => jest.fn());
jest.mock("../routes/socket.routes", () => jest.fn());
jest.mock("../routes/prometheus.routes", () => jest.fn());

jest.mock("../middleware/remove-secrets.middleware", () => ({
  removeSecretsMiddleware: jest.fn(
    (_req: any, _res: any, next: () => void) => next()
  ),
}));

jest.mock("../config/environment", () => ({
  config: {
    port: 0,
    autoListen: false,
  },
}));

// ---------------------------------------------------------------------------
// Imports (resolved against the mocks above — no side effects because
// require.main !== module inside Jest)
// ---------------------------------------------------------------------------
import { createBackendServer, startServer, main } from "../index";
import { logger } from "@pluto/logger";
import { listenToDevices } from "../services/device.service";
import { config } from "../config/environment";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const closeServer = (server: any) =>
  new Promise<void>((resolve, reject) => {
    server.close((err: unknown) => {
      if (err) reject(err);
      else resolve();
    });
  });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("backend entrypoint", () => {
  beforeEach(() => {
    // Reset mutable config defaults
    Object.assign(config, { port: 0, autoListen: false });
    delete (process as any).exitCode;
    // Ensure listenToDevices always starts with a clean default
    jest.mocked(listenToDevices).mockReset().mockResolvedValue([]);
  });

  // -----------------------------------------------------------------------
  // createBackendServer
  // -----------------------------------------------------------------------
  describe("createBackendServer", () => {
    it("creates express app and http server", () => {
      const { app, server } = createBackendServer();

      expect(app).toBeDefined();
      expect(server).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // startServer
  // -----------------------------------------------------------------------
  describe("startServer", () => {
    it("starts server and does not auto-listen by default", async () => {
      const started = await startServer({ port: 0, autoListen: false });

      expect(started).toBeDefined();
      expect(started.server).toBeDefined();
      expect(started.port).toBeGreaterThanOrEqual(0);
      expect(listenToDevices).not.toHaveBeenCalled();
      expect(jest.mocked(logger.info)).toHaveBeenCalledWith(
        expect.stringContaining("Server running on")
      );

      await closeServer(started.server);
    });

    it("auto-listens when autoListen is enabled", async () => {
      const started = await startServer({ port: 0, autoListen: true });

      expect(started).toBeDefined();
      expect(listenToDevices).toHaveBeenCalledTimes(1);

      await closeServer(started.server);
    });

    it("uses config values when options are not provided", async () => {
      (config as any).port = 0;
      (config as any).autoListen = false;

      const started = await startServer();

      expect(started).toBeDefined();
      expect(listenToDevices).not.toHaveBeenCalled();

      await closeServer(started.server);
    });

    it("handles server listen errors", async () => {
      await expect(
        startServer({ port: -1, autoListen: false })
      ).rejects.toThrow();
    });

    it("closes server when autoListen fails", async () => {
      jest
        .mocked(listenToDevices)
        .mockRejectedValueOnce(new Error("db down"));

      await expect(
        startServer({ port: 0, autoListen: true })
      ).rejects.toThrow("db down");
    });

    it("falls back to configured port when server has no address", async () => {
      const http = await import("http");
      const origAddress = http.Server.prototype.address;
      http.Server.prototype.address = () => null;

      try {
        const started = await startServer({ port: 0, autoListen: false });

        expect(started).toBeDefined();
        expect(started.port).toBe(0);

        await closeServer(started.server);
      } finally {
        http.Server.prototype.address = origAddress;
      }
    });
  });

  // -----------------------------------------------------------------------
  // main (replaces the old module-level serverPromise)
  // -----------------------------------------------------------------------
  describe("main", () => {
    it("starts server successfully", async () => {
      const result = await main();

      expect(result).toBeDefined();
      expect(result?.server).toBeDefined();

      await closeServer(result!.server);
    });

    it("handles startup errors and sets exitCode", async () => {
      (config as any).port = -1;

      const result = await main();

      expect(result).toBeUndefined();
      expect(jest.mocked(logger.error)).toHaveBeenCalledWith(
        "Failed to start backend server",
        expect.anything()
      );
      expect(process.exitCode).toBe(1);
    });

    it("handles autoListen errors and sets exitCode", async () => {
      (config as any).autoListen = true;
      jest
        .mocked(listenToDevices)
        .mockRejectedValueOnce(new Error("db down"));

      const result = await main();

      expect(result).toBeUndefined();
      expect(jest.mocked(logger.error)).toHaveBeenCalledWith(
        "Failed to start backend server",
        expect.any(Error)
      );
      expect(process.exitCode).toBe(1);
    });
  });
});
