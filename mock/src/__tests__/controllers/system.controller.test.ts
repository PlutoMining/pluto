import type { Request, Response } from "express";

import { DeviceApiVersion } from "@/types/axeos.types";

import {
  getSystemInfo,
  getRoot,
  patchSystemInfo,
  restartSystem,
} from "@/controllers/system.controller";

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
    it("returns legacy info for legacy API", async () => {
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

    it("returns new info for new API", async () => {
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
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Failed to retrieve system info" })
      );
    });

    it("delegates to context.getSystemInfo() when context is present", async () => {
      const mockContext = {
        getSystemInfo: jest.fn().mockReturnValue({ fromContext: true }),
      };
      const req = {
        app: {
          locals: { mockContext },
        },
      } as unknown as Request;
      const res = mockRes();

      await getSystemInfo(req, res);

      expect(mockContext.getSystemInfo).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ fromContext: true });
    });

    it("returns 500 with non-Error thrown value when context throws", async () => {
      const mockContext = {
        getSystemInfo: jest.fn().mockImplementation(() => {
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw "string error";
        }),
      };
      const req = {
        app: {
          locals: { mockContext },
        },
      } as unknown as Request;
      const res = mockRes();

      await getSystemInfo(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ details: "string error" })
      );
    });
  });

  describe("patchSystemInfo", () => {
    it("initializes locals.systemInfo if missing", async () => {
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

    it("merges updates into existing locals.systemInfo", async () => {
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

    it("delegates to context.patchSystemInfo() when context is present", async () => {
      const mockContext = {
        patchSystemInfo: jest.fn(),
      };
      const req = {
        body: { hashRate: 500 },
        app: {
          locals: { mockContext },
        },
      } as unknown as Request;
      const res = mockRes();

      await patchSystemInfo(req, res);

      expect(mockContext.patchSystemInfo).toHaveBeenCalledWith({ hashRate: 500 });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: "System info updated successfully" });
    });
  });

  describe("getRoot", () => {
    it("returns HTML from context.getRootHtml()", async () => {
      const mockContext = {
        getRootHtml: jest.fn().mockReturnValue("<html>miner</html>"),
      };
      const req = {
        app: { locals: { mockContext } },
      } as unknown as Request;
      const res = mockRes();

      await getRoot(req, res);

      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/html");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith("<html>miner</html>");
    });

    it("returns empty string when context is absent", async () => {
      const req = {
        app: { locals: {} },
      } as unknown as Request;
      const res = mockRes();

      await getRoot(req, res);

      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/html");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith("");
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
