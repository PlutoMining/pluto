import {
  extractHostnameFromMinerData,
  extractModelFromMinerData,
} from "@/services/tracing.helpers";
import type { MinerData } from "@pluto/pyasic-bridge-client";

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

    it("falls back to IP when hostname not in top-level", () => {
      const minerData: MinerData = {
        ip: "192.168.1.100",
        device_info: {
          model: "BM1368",
        },
      } as MinerData;
      expect(extractHostnameFromMinerData(minerData)).toBe("192.168.1.100");
    });

    it("falls back to IP when hostname not available", () => {
      const minerData: MinerData = {
        ip: "192.168.1.100",
      } as MinerData;
      expect(extractHostnameFromMinerData(minerData)).toBe("192.168.1.100");
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

    it("extracts model from top-level field", () => {
      const minerData: MinerData = {
        ip: "192.168.1.100",
        model: "BM1368",
      } as MinerData;
      expect(extractModelFromMinerData(minerData)).toBe("BM1368");
    });

    it("extracts model from device_info", () => {
      const minerData: MinerData = {
        ip: "192.168.1.100",
        device_info: {
          model: "BM1370",
        },
      } as MinerData;
      expect(extractModelFromMinerData(minerData)).toBe("BM1370");
    });

    it("prefers top-level model over device_info", () => {
      const minerData: MinerData = {
        ip: "192.168.1.100",
        model: "BM1368",
        device_info: {
          model: "BM1370",
        },
      } as MinerData;
      expect(extractModelFromMinerData(minerData)).toBe("BM1368");
    });
  });
});
