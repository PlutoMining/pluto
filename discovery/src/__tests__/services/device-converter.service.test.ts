/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { DeviceConverterService } from "@/services/device-converter.service";

describe("DeviceConverterService", () => {
  describe("convertMinerInfoToDevice", () => {
    it("should convert miner info with all fields provided", () => {
      const ip = "192.168.1.100";
      const mac = "00:11:22:33:44:55";
      const model = "Antminer S19";
      const minerData: any = {
        hashrate: { rate: 95.0, unit: { value: 1000000000, suffix: "Th/s" } },
        temperature: 65,
        power: 3250,
      };

      const result = DeviceConverterService.convertMinerInfoToDevice(
        ip,
        mac,
        model,
        undefined,
        minerData
      );

      expect(result).toMatchObject({
        ip,
        mac,
        type: model,
        source: "real",
      });
      expect(result.info).toMatchObject(minerData);
    });

    it("should use fallback type when model is null", () => {
      const ip = "192.168.1.100";
      const mac = "00:11:22:33:44:55";
      const model = null;
      const fallbackType = "Bitmain";
      const minerData: any = {};

      const result = DeviceConverterService.convertMinerInfoToDevice(
        ip,
        mac,
        model,
        fallbackType,
        minerData
      );

      expect(result.type).toBe(fallbackType);
    });

    it("should use fallback type when model is null and fallback is provided", () => {
      const ip = "192.168.1.100";
      const mac = "00:11:22:33:44:55";
      const model = null;
      const fallbackType = "Unknown Vendor";
      const minerData: any = {};

      const result = DeviceConverterService.convertMinerInfoToDevice(
        ip,
        mac,
        model,
        fallbackType,
        minerData
      );

      expect(result.type).toBe(fallbackType);
    });

    it("should use 'unknown' when both model and fallbackType are not provided", () => {
      const ip = "192.168.1.100";
      const mac = "00:11:22:33:44:55";
      const model = null;
      const minerData: any = {};

      const result = DeviceConverterService.convertMinerInfoToDevice(
        ip,
        mac,
        model,
        undefined,
        minerData
      );

      expect(result.type).toBe("unknown");
    });

    it("should prioritize model over fallbackType when both are provided", () => {
      const ip = "192.168.1.100";
      const mac = "00:11:22:33:44:55";
      const model = "Antminer S21";
      const fallbackType = "Bitmain";
      const minerData: any = {};

      const result = DeviceConverterService.convertMinerInfoToDevice(
        ip,
        mac,
        model,
        fallbackType,
        minerData
      );

      expect(result.type).toBe(model);
    });

    it("should handle empty minerData", () => {
      const ip = "192.168.1.100";
      const mac = "00:11:22:33:44:55";
      const model = "Antminer S19";
      const minerData: any = {};

      const result = DeviceConverterService.convertMinerInfoToDevice(
        ip,
        mac,
        model,
        undefined,
        minerData
      );

      expect(result.type).toBe(model);
      expect(result.info).toBeDefined();
      expect((result.info as any).ip).toBe(ip);
      expect((result.info as any).mac).toBe(mac);
    });

    it("should handle null minerData", () => {
      const ip = "192.168.1.100";
      const mac = "00:11:22:33:44:55";
      const model = "Antminer S19";
      const minerData: any = null;

      const result = DeviceConverterService.convertMinerInfoToDevice(
        ip,
        mac,
        model,
        undefined,
        minerData
      );

      expect(result.type).toBe(model);
      expect(result.info).toBeDefined();
      expect((result.info as any).ip).toBe(ip);
      expect((result.info as any).mac).toBe(mac);
    });

    it("should handle undefined minerData", () => {
      const ip = "192.168.1.100";
      const mac = "00:11:22:33:44:55";
      const model = "Antminer S19";

      const result = DeviceConverterService.convertMinerInfoToDevice(
        ip,
        mac,
        model,
        undefined,
        null
      );

      expect(result.info).toBeDefined();
    });

    it("should handle complex minerData structure", () => {
      const ip = "192.168.1.100";
      const mac = "00:11:22:33:44:55";
      const model = "Antminer S19";
      const minerData: any = {
        hashrate: {
          rate: 95.0,
          unit: { value: 1000000000, suffix: "Th/s" },
        },
        temperature: 65,
        power: 3250,
        fans: [4500, 4600, 4700, 4800],
        pools: [
          {
            url: "stratum+tcp://pool.example.com:3333",
            user: "user.worker",
          },
        ],
      };

      const result = DeviceConverterService.convertMinerInfoToDevice(
        ip,
        mac,
        model,
        undefined,
        minerData
      );

      expect(result.info).toMatchObject(minerData);
    });

    it("should preserve all Device fields correctly", () => {
      const ip = "192.168.1.200";
      const mac = "aa:bb:cc:dd:ee:ff";
      const model = "Whatsminer M50";
      const minerData: any = { test: "data" };

      const result = DeviceConverterService.convertMinerInfoToDevice(
        ip,
        mac,
        model,
        undefined,
        minerData
      );

      expect(result).toMatchObject({
        ip,
        mac,
        type: model,
        info: minerData,
      });
      expect(result).toHaveProperty("ip");
      expect(result).toHaveProperty("mac");
      expect(result).toHaveProperty("type");
      expect(result).toHaveProperty("info");
    });

    it("should handle empty string model", () => {
      const ip = "192.168.1.100";
      const mac = "00:11:22:33:44:55";
      const model = "";
      const fallbackType = "Fallback Type";
      const minerData: any = {};

      const result = DeviceConverterService.convertMinerInfoToDevice(
        ip,
        mac,
        model,
        fallbackType,
        minerData
      );

      // Empty string is falsy, so should use fallback
      expect(result.type).toBe(fallbackType);
    });

    it("should handle empty string fallbackType", () => {
      const ip = "192.168.1.100";
      const mac = "00:11:22:33:44:55";
      const model = null;
      const fallbackType = "";
      const minerData: any = {};

      const result = DeviceConverterService.convertMinerInfoToDevice(
        ip,
        mac,
        model,
        fallbackType,
        minerData
      );

      // Empty string is falsy, so should use "unknown"
      expect(result.type).toBe("unknown");
    });

    it("should handle mock device IPs correctly", () => {
      const ip = "host.docker.internal:7771";
      const mac = "ff:ff:ff:ff:00:01";
      const model = "Mock Miner";
      const minerData: any = { mock: true };

      const result = DeviceConverterService.convertMinerInfoToDevice(
        ip,
        mac,
        model,
        undefined,
        minerData
      );

      expect(result.ip).toBe(ip);
      expect(result.mac).toBe(mac);
      expect(result.type).toBe(model);
    });
  });
});
