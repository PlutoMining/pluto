import {
  extractHostnameFromMinerData,
  extractModelFromMinerData,
} from "@/services/tracing.helpers";
import type { MinerData } from "@pluto/interfaces";

describe("tracing.helpers", () => {
  describe("extractHostnameFromMinerData", () => {
    it("returns 'unknown' for null or undefined", () => {
      expect(extractHostnameFromMinerData(null)).toBe("unknown");
      expect(extractHostnameFromMinerData(undefined)).toBe("unknown");
    });

    it("extracts hostname from top-level field", () => {
      const minerData: MinerData = {
        ip: "192.168.1.100",
        hostname: "test-miner",
      } as MinerData;
      expect(extractHostnameFromMinerData(minerData)).toBe("test-miner");
    });

    it("falls back to IP when hostname not set", () => {
      const minerData: MinerData = {
        ip: "192.168.1.100",
        deviceInfo: { model: "BM1368" },
        fans: [],
        hashboards: [],
      } as MinerData;
      expect(extractHostnameFromMinerData(minerData)).toBe("192.168.1.100");
    });

    it("falls back to IP when hostname not available", () => {
      const minerData: MinerData = {
        ip: "192.168.1.100",
      } as MinerData;
      expect(extractHostnameFromMinerData(minerData)).toBe("192.168.1.100");
    });

    it("returns 'unknown' when both hostname and ip are undefined", () => {
      const minerData = { hostname: undefined, ip: undefined } as unknown as MinerData;
      expect(extractHostnameFromMinerData(minerData)).toBe("unknown");
    });

    it("prefers top-level hostname over IP", () => {
      const minerData: MinerData = {
        ip: "192.168.1.100",
        hostname: "top-level",
      } as MinerData;
      expect(extractHostnameFromMinerData(minerData)).toBe("top-level");
    });
  });

  describe("extractModelFromMinerData", () => {
    it("returns 'unknown' for null or undefined", () => {
      expect(extractModelFromMinerData(null)).toBe("unknown");
      expect(extractModelFromMinerData(undefined)).toBe("unknown");
    });

    it("extracts model from deviceInfo", () => {
      const minerData: MinerData = {
        ip: "192.168.1.100",
        deviceInfo: { model: "BM1368" },
        fans: [],
        hashboards: [],
      } as MinerData;
      expect(extractModelFromMinerData(minerData)).toBe("BM1368");
    });

    it("returns 'unknown' when deviceInfo has no model", () => {
      const minerData: MinerData = {
        ip: "192.168.1.100",
        deviceInfo: {},
        fans: [],
        hashboards: [],
      } as MinerData;
      expect(extractModelFromMinerData(minerData)).toBe("unknown");
    });

    it("returns 'unknown' when deviceInfo is missing", () => {
      const minerData: MinerData = {
        ip: "192.168.1.100",
        fans: [],
        hashboards: [],
      } as MinerData;
      expect(extractModelFromMinerData(minerData)).toBe("unknown");
    });
  });
});
