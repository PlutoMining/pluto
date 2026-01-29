import type { Request, Response } from "express";

import { DeviceApiVersion } from "@/types/axeos.types";

import {
  getSystemInfo,
  patchSystemInfo,
  restartSystem,
} from "@/controllers/system.controller";
import { MockMinerContext } from "@/contexts/mock-miner-context";
import type { MockMinerStrategy } from "@/strategies/mock-miner-strategy.interface";

jest.mock("@/services/mock.service", () => ({
  generateSystemInfo: jest.fn(),
  generateSystemInfoAlt: jest.fn(),
}));

const { generateSystemInfo, generateSystemInfoAlt } = jest.requireMock(
  "@/services/mock.service"
) as {
  generateSystemInfo: jest.Mock;
  generateSystemInfoAlt: jest.Mock;
};

const mockRes = () =>
  ({
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    send: jest.fn(),
  }) as unknown as Response;

describe("system.controller", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe("getSystemInfo", () => {
    it("uses mockContext when available", async () => {
      const mockStrategy: jest.Mocked<MockMinerStrategy<any>> = {
        generateSystemInfo: jest.fn().mockReturnValue({ power: 100, temp: 50 }),
        getApiVersion: jest.fn().mockReturnValue("v1"),
        getMinerType: jest.fn().mockReturnValue("axeos"),
        getRootHtml: jest.fn().mockReturnValue(""),
      };

      const context = new MockMinerContext({
        strategy: mockStrategy,
        hostname: "mockaxe1",
        startTime: new Date(Date.now() - 10_000),
      });

      const req = {
        app: {
          locals: {
            mockContext: context,
          },
        },
      } as unknown as Request;
      const res = mockRes();

      await getSystemInfo(req, res);

      expect(mockStrategy.generateSystemInfo).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ power: 100, temp: 50 });
      expect(generateSystemInfo).not.toHaveBeenCalled();
      expect(generateSystemInfoAlt).not.toHaveBeenCalled();
    });

    it("returns legacy info for legacy API when context is missing", async () => {
      generateSystemInfo.mockReturnValueOnce({ legacy: true });
      const req = {
        app: {
          locals: {
            hostname: "mockaxe1",
            apiVersion: DeviceApiVersion.Legacy,
            startTime: new Date(Date.now() - 10_000),
            systemInfo: { power: 1 },
          },
        },
      } as unknown as Request;
      const res = mockRes();

      await getSystemInfo(req, res);

      expect(generateSystemInfo).toHaveBeenCalledWith(
        "mockaxe1",
        expect.any(Number),
        { power: 1 }
      );
      expect(res.json).toHaveBeenCalledWith({ legacy: true });
    });

    it("returns new info for new API when context is missing", async () => {
      generateSystemInfoAlt.mockReturnValueOnce({ modern: true });
      const req = {
        app: {
          locals: {
            hostname: "mockaxe2",
            apiVersion: DeviceApiVersion.New,
            startTime: new Date(Date.now() - 10_000),
            systemInfo: { power: 1 },
          },
        },
      } as unknown as Request;
      const res = mockRes();

      await getSystemInfo(req, res);

      expect(generateSystemInfoAlt).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ modern: true });
    });

    it("returns 500 when context throws", async () => {
      const mockStrategy: jest.Mocked<MockMinerStrategy<any>> = {
        generateSystemInfo: jest.fn().mockImplementation(() => {
          throw new Error("context error");
        }),
        getApiVersion: jest.fn().mockReturnValue("v1"),
        getMinerType: jest.fn().mockReturnValue("axeos"),
        getRootHtml: jest.fn().mockReturnValue(""),
      };

      const context = new MockMinerContext({
        strategy: mockStrategy,
        hostname: "mockaxe1",
      });

      const req = {
        app: {
          locals: {
            mockContext: context,
          },
        },
      } as unknown as Request;
      const res = mockRes();

      await getSystemInfo(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Failed to retrieve system info",
        details: "context error",
      });
    });

    it("returns 500 when generator throws", async () => {
      generateSystemInfo.mockImplementationOnce(() => {
        throw new Error("boom");
      });

      const req = {
        app: {
          locals: {
            hostname: "mockaxe1",
            apiVersion: DeviceApiVersion.Legacy,
            startTime: new Date(),
          },
        },
      } as unknown as Request;
      const res = mockRes();

      await getSystemInfo(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Failed to retrieve system info",
        details: "boom",
      });
    });
  });

  describe("patchSystemInfo", () => {
    it("uses mockContext when available", async () => {
      const mockStrategy: jest.Mocked<MockMinerStrategy<any>> = {
        generateSystemInfo: jest.fn().mockReturnValue({}),
        getApiVersion: jest.fn().mockReturnValue("v1"),
        getMinerType: jest.fn().mockReturnValue("axeos"),
        getRootHtml: jest.fn().mockReturnValue(""),
      };

      const context = new MockMinerContext({
        strategy: mockStrategy,
        hostname: "mockaxe1",
      });

      const req = {
        body: { power: 123, temp: 60 },
        app: {
          locals: {
            mockContext: context,
          },
        },
      } as unknown as Request;
      const res = mockRes();

      await patchSystemInfo(req, res);

      const overrides = context.getSystemInfoOverrides();
      expect(overrides).toEqual({ power: 123, temp: 60 });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: "System info updated successfully" });
    });

    it("initializes locals.systemInfo if missing when context is not available", async () => {
      const req = {
        body: { power: 123 },
        app: {
          locals: {},
        },
      } as unknown as Request;
      const res = mockRes();

      await patchSystemInfo(req, res);

      expect(req.app.locals.systemInfo).toEqual({ power: 123 });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("merges updates into existing locals.systemInfo when context is not available", async () => {
      const req = {
        body: { power: 456 },
        app: {
          locals: { systemInfo: { voltage: 1 } },
        },
      } as unknown as Request;
      const res = mockRes();

      await patchSystemInfo(req, res);

      expect(req.app.locals.systemInfo).toEqual({ voltage: 1, power: 456 });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 500 when context throws", async () => {
      const mockStrategy: jest.Mocked<MockMinerStrategy<any>> = {
        generateSystemInfo: jest.fn().mockReturnValue({}),
        getApiVersion: jest.fn().mockReturnValue("v1"),
        getMinerType: jest.fn().mockReturnValue("axeos"),
        getRootHtml: jest.fn().mockReturnValue(""),
      };

      const context = new MockMinerContext({
        strategy: mockStrategy,
        hostname: "mockaxe1",
      });

      // Mock patchSystemInfo to throw
      jest.spyOn(context, "patchSystemInfo").mockImplementation(() => {
        throw new Error("patch error");
      });

      const req = {
        body: { power: 123 },
        app: {
          locals: {
            mockContext: context,
          },
        },
      } as unknown as Request;
      const res = mockRes();

      await patchSystemInfo(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to update system info" });
    });

    it("returns 500 on error", async () => {
      const req = {
        get body() {
          throw new Error("bad body");
        },
        app: {
          locals: {},
        },
      } as unknown as Request;
      const res = mockRes();

      await patchSystemInfo(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to update system info" });
    });
  });

  describe("restartSystem", () => {
    it("sets restarting flag and clears it after timeout", async () => {
      const req = {
        app: {
          locals: {},
        },
      } as unknown as Request;
      const res = mockRes();

      const originalConsoleLog = console.log;
      console.log = jest.fn();

      try {
        await restartSystem(req, res);

        expect(req.app.locals.isRestarting).toBe(true);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalled();

        jest.advanceTimersByTime(5000);
        expect(req.app.locals.isRestarting).toBe(false);
        expect(console.log).toHaveBeenCalled();
      } finally {
        console.log = originalConsoleLog;
      }
    });

    it("returns 500 on unexpected errors", async () => {
      const req = {
        app: {
          locals: {},
        },
      } as unknown as Request;
      const res = {
        ...mockRes(),
        setHeader: jest.fn(() => {
          throw new Error("boom");
        }),
      } as unknown as Response;

      await restartSystem(req, res);

      expect((res.status as jest.Mock).mock.calls[0][0]).toBe(500);
      expect(res.json).toHaveBeenCalledWith({ error: "boom" });
    });
  });
});
