/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { UtilsService } from "@/services/utils.service";

describe("UtilsService", () => {
  describe("chunkArray", () => {
    it("should split array into chunks of specified size", () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const chunks = UtilsService.chunkArray(array, 3);

      expect(chunks).toEqual([[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]]);
    });

    it("should handle empty array", () => {
      const chunks = UtilsService.chunkArray([], 5);
      expect(chunks).toEqual([]);
    });

    it("should handle array smaller than chunk size", () => {
      const array = [1, 2];
      const chunks = UtilsService.chunkArray(array, 5);
      expect(chunks).toEqual([[1, 2]]);
    });

    it("should handle array exactly matching chunk size", () => {
      const array = [1, 2, 3, 4, 5];
      const chunks = UtilsService.chunkArray(array, 5);
      expect(chunks).toEqual([[1, 2, 3, 4, 5]]);
    });

    it("should handle chunk size of 1", () => {
      const array = [1, 2, 3];
      const chunks = UtilsService.chunkArray(array, 1);
      expect(chunks).toEqual([[1], [2], [3]]);
    });

    it("should throw error for chunk size <= 0", () => {
      expect(() => UtilsService.chunkArray([1, 2, 3], 0)).toThrow("Chunk size must be greater than 0");
      expect(() => UtilsService.chunkArray([1, 2, 3], -1)).toThrow("Chunk size must be greater than 0");
    });

    it("should work with different types", () => {
      const stringArray = ["a", "b", "c", "d"];
      const stringChunks = UtilsService.chunkArray(stringArray, 2);
      expect(stringChunks).toEqual([["a", "b"], ["c", "d"]]);

      const objectArray = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const objectChunks = UtilsService.chunkArray(objectArray, 2);
      expect(objectChunks).toEqual([[{ id: 1 }, { id: 2 }], [{ id: 3 }]]);
    });
  });

  describe("mockMacFromPort", () => {
    it("should generate MAC address from valid port number", () => {
      const mac = UtilsService.mockMacFromPort(7771);
      // 7771 = 0x1e5b, hi=0x1e (30), lo=0x5b (91)
      expect(mac).toBe("ff:ff:ff:ff:1e:5b");
    });

    it("should handle port 1", () => {
      const mac = UtilsService.mockMacFromPort(1);
      expect(mac).toBe("ff:ff:ff:ff:00:01");
    });

    it("should handle port 255", () => {
      const mac = UtilsService.mockMacFromPort(255);
      expect(mac).toBe("ff:ff:ff:ff:00:ff");
    });

    it("should handle port 256", () => {
      const mac = UtilsService.mockMacFromPort(256);
      expect(mac).toBe("ff:ff:ff:ff:01:00");
    });

    it("should handle port 65535", () => {
      const mac = UtilsService.mockMacFromPort(65535);
      expect(mac).toBe("ff:ff:ff:ff:ff:ff");
    });

    it("should handle string port number", () => {
      const mac = UtilsService.mockMacFromPort("7771");
      // 7771 = 0x1e5b, hi=0x1e (30), lo=0x5b (91)
      expect(mac).toBe("ff:ff:ff:ff:1e:5b");
    });

    it("should return undefined for invalid port", () => {
      expect(UtilsService.mockMacFromPort(0)).toBeUndefined();
      expect(UtilsService.mockMacFromPort(-1)).toBeUndefined();
      expect(UtilsService.mockMacFromPort(NaN)).toBeUndefined();
      expect(UtilsService.mockMacFromPort(Infinity)).toBeUndefined();
      expect(UtilsService.mockMacFromPort("invalid")).toBeUndefined();
      expect(UtilsService.mockMacFromPort(null)).toBeUndefined();
      expect(UtilsService.mockMacFromPort(undefined)).toBeUndefined();
    });

    it("should handle decimal numbers", () => {
      const mac = UtilsService.mockMacFromPort(7771.5);
      // 7771.5 truncated to 7771 = 0x1e5b, hi=0x1e (30), lo=0x5b (91)
      expect(mac).toBe("ff:ff:ff:ff:1e:5b");
    });
  });
});
