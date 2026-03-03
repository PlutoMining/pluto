import type { Request, Response } from "express";

import {
  getSystemInfo,
  getRoot,
  patchSystemInfo,
  restartSystem,
} from "@/controllers/system.controller";

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

    it("returns 500 when context is absent", async () => {
      const req = {
        app: { locals: {} },
      } as unknown as Request;
      const res = mockRes();

      await getSystemInfo(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "MockMinerContext not initialised" })
      );
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

    it("returns 500 with Error message when context throws Error", async () => {
      const mockContext = {
        getSystemInfo: jest.fn().mockImplementation(() => {
          throw new Error("boom");
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
        expect.objectContaining({ error: "Failed to retrieve system info", details: "boom" })
      );
    });
  });

  describe("patchSystemInfo", () => {
    it("delegates to context.patchSystemInfo() when context is present", async () => {
      const mockContext = {
        patchSystemInfo: jest.fn(),
      };
      const req = {
        body: { hashrate: 500 },
        app: {
          locals: { mockContext },
        },
      } as unknown as Request;
      const res = mockRes();

      await patchSystemInfo(req, res);

      expect(mockContext.patchSystemInfo).toHaveBeenCalledWith({ hashrate: 500 });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: "System info updated successfully" });
    });

    it("returns 500 when context is absent", async () => {
      const req = {
        body: { power: 123 },
        app: { locals: {} },
      } as unknown as Request;
      const res = mockRes();

      await patchSystemInfo(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "MockMinerContext not initialised" })
      );
    });

    it("returns 500 on error", async () => {
      const req = {
        get body() {
          throw new Error("bad body");
        },
        app: {
          locals: { mockContext: { patchSystemInfo: jest.fn() } },
        },
      } as unknown as Request;
      const res = mockRes();

      await patchSystemInfo(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to update system info" });
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
