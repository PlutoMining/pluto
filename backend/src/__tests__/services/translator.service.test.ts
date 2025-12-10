/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { Device } from "@pluto/interfaces";
import { getDeviceConnectionURL } from "../../services/translator.service";

describe("Translator Service", () => {
  describe("getDeviceConnectionURL", () => {
    it("should return translator URL for SV2 device when JDC is disabled", () => {
      const device: Device = {
        mac: "aa:bb:cc:dd:ee:ff",
        ip: "192.168.1.100",
        type: "bitaxe",
        info: {
          stratumProtocolVersion: "v2",
          stratumURL: "stratum2+tcp://pool.com:34254/key",
          stratumPort: 3333,
          stratumUser: "user",
        },
      };

      process.env.ENABLE_JDC = "false";
      const result = getDeviceConnectionURL(device);

      expect(result.url).toBe("localhost");
      expect(result.port).toBe(34254); // Translator port
    });

    it("should return JDC URL for SV2 device when JDC is enabled", () => {
      const device: Device = {
        mac: "aa:bb:cc:dd:ee:ff",
        ip: "192.168.1.100",
        type: "bitaxe",
        info: {
          stratumProtocolVersion: "v2",
          stratumURL: "stratum2+tcp://pool.com:34254/key",
          stratumPort: 3333,
          stratumUser: "user",
        },
      };

      process.env.ENABLE_JDC = "true";
      const result = getDeviceConnectionURL(device);

      expect(result.url).toBe("localhost");
      expect(result.port).toBe(34255); // JDC port
    });

    it("should return original URL for SV1 device", () => {
      const device: Device = {
        mac: "aa:bb:cc:dd:ee:ff",
        ip: "192.168.1.100",
        type: "bitaxe",
        info: {
          stratumProtocolVersion: "v1",
          stratumURL: "pool.com",
          stratumPort: 3333,
          stratumUser: "user",
        },
      };

      const result = getDeviceConnectionURL(device);

      expect(result.url).toBe("pool.com");
      expect(result.port).toBe(3333);
    });

    it("should return original URL for device without protocol version", () => {
      const device: Device = {
        mac: "aa:bb:cc:dd:ee:ff",
        ip: "192.168.1.100",
        type: "bitaxe",
        info: {
          stratumURL: "pool.com",
          stratumPort: 3333,
          stratumUser: "user",
        },
      };

      const result = getDeviceConnectionURL(device);

      expect(result.url).toBe("pool.com");
      expect(result.port).toBe(3333);
    });
  });
});
