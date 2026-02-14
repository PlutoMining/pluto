// Set required environment variables before importing modules that depend on config
process.env.MOCK_DISCOVERY_HOST = "http://mock-discovery";
process.env.PYASIC_BRIDGE_HOST = "http://pyasic-bridge:8000";

import type { Request, Response } from "express";

import { discoverDevices, getDiscoveredDevices } from "@/controllers/discover.controller";
import { logger } from "@pluto/logger";
import * as discoveryService from "@/services/discovery.service";

jest.mock("@/services/discovery.service");
jest.mock("@pluto/logger", () => ({
  logger: {
    error: jest.fn(),
  },
}));

function mockRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as Response;
  return res;
}

describe("discover.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("discoverDevices", () => {
    it("returns devices", async () => {
      (discoveryService.discoverDevices as jest.Mock).mockResolvedValue([{ ip: "10.0.0.1" }]);
      const req = { query: { ip: "10.0.0.1" } } as unknown as Request;
      const res = mockRes();

      await discoverDevices(req, res);

      expect(discoveryService.discoverDevices).toHaveBeenCalledWith({
        ip: "10.0.0.1",
        mac: undefined,
        partialMatch: false,
      });
      expect(res.json).toHaveBeenCalledWith([{ ip: "10.0.0.1" }]);
    });

    it("handles errors", async () => {
      const error = new Error("boom");
      (discoveryService.discoverDevices as jest.Mock).mockRejectedValue(error);
      const req = { query: {} } as unknown as Request;
      const res = mockRes();

      await discoverDevices(req, res);

      expect(logger.error).toHaveBeenCalledWith("Error in /discover request:", error);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to discover devices" });
    });
  });

  describe("getDiscoveredDevices", () => {
    it("parses lists and partial match defaults", async () => {
      (discoveryService.lookupMultipleDiscoveredDevices as jest.Mock).mockResolvedValue([{ ip: "x" }]);
      const req = {
        query: {
          macs: "aa,bb",
          ips: "1.1.1.1,2.2.2.2",
          hostnames: "h1,h2",
        },
      } as unknown as Request;
      const res = mockRes();

      await getDiscoveredDevices(req, res);

      expect(discoveryService.lookupMultipleDiscoveredDevices).toHaveBeenCalledWith({
        macs: ["aa", "bb"],
        ips: ["1.1.1.1", "2.2.2.2"],
        hostnames: ["h1", "h2"],
        partialMatch: {
          macs: "both",
          ips: "both",
          hostnames: "both",
        },
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([{ ip: "x" }]);
    });

    it("handles errors", async () => {
      const error = new Error("boom");
      (discoveryService.lookupMultipleDiscoveredDevices as jest.Mock).mockRejectedValue(error);
      const req = { query: {} } as unknown as Request;
      const res = mockRes();

      await getDiscoveredDevices(req, res);

      expect(logger.error).toHaveBeenCalledWith("Error in discoverDevices request:", error);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Discovery service failed" });
    });
  });
});
