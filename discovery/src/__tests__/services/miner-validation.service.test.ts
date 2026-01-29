/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import axios from "axios";
import { MinerValidationService } from "@/services/miner-validation.service";

jest.mock("axios");
jest.mock("@/config/environment", () => ({
  config: {
    pyasicBridgeHost: "http://pyasic-bridge:8000",
    pyasicValidationTimeout: 3000,
  },
}));

jest.mock("@pluto/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("MinerValidationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock axios.isAxiosError to check error.isAxiosError property
    (axios.isAxiosError as any) = jest.fn((error: any) => error?.isAxiosError === true);
  });

  describe("validateSingleIp", () => {
    it("should return validation result for valid miner", async () => {
      const mockResult = {
        ip: "192.168.1.100",
        is_miner: true,
        model: "Antminer S19",
        error: null,
      };

      mockedAxios.post.mockResolvedValue({
        data: [mockResult],
      } as any);

      const result = await MinerValidationService.validateSingleIp("192.168.1.100");

      expect(result).toEqual(mockResult);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        "http://pyasic-bridge:8000/miners/validate",
        { ips: ["192.168.1.100"] },
        { timeout: 3000 }
      );
    });

    it("should return null when validation result is empty", async () => {
      mockedAxios.post.mockResolvedValue({
        data: [],
      } as any);

      const result = await MinerValidationService.validateSingleIp("192.168.1.100");

      expect(result).toBeNull();
    });

    it("should return null for non-miner device", async () => {
      const mockResult = {
        ip: "192.168.1.100",
        is_miner: false,
        model: null,
        error: "Timeout",
      };

      mockedAxios.post.mockResolvedValue({
        data: [mockResult],
      } as any);

      const result = await MinerValidationService.validateSingleIp("192.168.1.100");

      expect(result).toEqual(mockResult);
    });

    it("should handle timeout errors", async () => {
      const error = new Error("timeout");
      (error as any).code = "ECONNABORTED";
      (error as any).isAxiosError = true;
      (axios.isAxiosError as any) = jest.fn().mockReturnValue(true);
      mockedAxios.post.mockRejectedValue(error);

      const result = await MinerValidationService.validateSingleIp("192.168.1.100");

      expect(result).toBeNull();
    });

    it("should handle HTTP errors", async () => {
      const error = new Error("Server error");
      (error as any).response = { status: 500, statusText: "Internal Server Error" };
      (error as any).isAxiosError = true;
      (axios.isAxiosError as any) = jest.fn().mockReturnValue(true);
      mockedAxios.post.mockRejectedValue(error);

      const result = await MinerValidationService.validateSingleIp("192.168.1.100");

      expect(result).toBeNull();
    });

    it("should handle network errors", async () => {
      const error = new Error("Network error");
      (error as any).isAxiosError = true;
      (axios.isAxiosError as any) = jest.fn().mockReturnValue(true);
      mockedAxios.post.mockRejectedValue(error);

      const result = await MinerValidationService.validateSingleIp("192.168.1.100");

      expect(result).toBeNull();
    });

    it("should handle unexpected errors", async () => {
      const error = new Error("Unexpected error");
      (axios.isAxiosError as any) = jest.fn().mockReturnValue(false);
      mockedAxios.post.mockRejectedValue(error);

      const result = await MinerValidationService.validateSingleIp("192.168.1.100");

      expect(result).toBeNull();
    });
  });

  describe("validateBatch", () => {
    it("should return validation results for batch", async () => {
      const mockResults = [
        { ip: "192.168.1.100", is_miner: true, model: "Antminer S19", error: null },
        { ip: "192.168.1.101", is_miner: false, model: null, error: "Timeout" },
      ];

      mockedAxios.post.mockResolvedValue({
        data: mockResults,
      } as any);

      const results = await MinerValidationService.validateBatch(["192.168.1.100", "192.168.1.101"]);

      expect(results).toEqual(mockResults);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        "http://pyasic-bridge:8000/miners/validate",
        { ips: ["192.168.1.100", "192.168.1.101"] },
        expect.objectContaining({ timeout: expect.any(Number) })
      );
    });

    it("should return empty array for empty input", async () => {
      const results = await MinerValidationService.validateBatch([]);

      expect(results).toEqual([]);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it("should calculate timeout correctly for batch", async () => {
      mockedAxios.post.mockResolvedValue({
        data: [],
      } as any);

      await MinerValidationService.validateBatch(["192.168.1.100", "192.168.1.101", "192.168.1.102"]);

      const timeout = mockedAxios.post.mock.calls[0][2]?.timeout;
      expect(timeout).toBeLessThanOrEqual(30000); // Max 30 seconds
      expect(timeout).toBeGreaterThan(3000); // At least base timeout
    });

    it("should handle errors and return empty array", async () => {
      const error = new Error("Network error");
      (error as any).isAxiosError = true;
      (axios.isAxiosError as any) = jest.fn().mockReturnValue(true);
      mockedAxios.post.mockRejectedValue(error);

      const results = await MinerValidationService.validateBatch(["192.168.1.100"]);

      expect(results).toEqual([]);
    });

    it("should handle timeout errors", async () => {
      const error = new Error("timeout");
      (error as any).code = "ECONNABORTED";
      (error as any).isAxiosError = true;
      (axios.isAxiosError as any) = jest.fn().mockReturnValue(true);
      mockedAxios.post.mockRejectedValue(error);

      const results = await MinerValidationService.validateBatch(["192.168.1.100"]);

      expect(results).toEqual([]);
    });
  });

  describe("fetchMinerData", () => {
    it("should fetch miner data successfully", async () => {
      const mockData = {
        hashrate: { rate: 95.0, unit: { value: 1000000000, suffix: "Th/s" } },
        temperature: 65,
        power: 3250,
      };

      mockedAxios.get.mockResolvedValue({
        data: mockData,
      } as any);

      const result = await MinerValidationService.fetchMinerData("192.168.1.100");

      expect(result).toEqual(mockData);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        "http://pyasic-bridge:8000/miner/192.168.1.100/data",
        { timeout: 3000 }
      );
    });

    it("should return empty object on error", async () => {
      const error = new Error("Network error");
      mockedAxios.get.mockRejectedValue(error);

      const result = await MinerValidationService.fetchMinerData("192.168.1.100");

      expect(result).toEqual({});
    });

    it("should return empty object when data is null", async () => {
      mockedAxios.get.mockResolvedValue({
        data: null,
      } as any);

      const result = await MinerValidationService.fetchMinerData("192.168.1.100");

      expect(result).toEqual({});
    });
  });

  describe("validateBatch error handling", () => {
    it("should handle HTTP response errors", async () => {
      const error = new Error("Server error");
      (error as any).response = { status: 500, statusText: "Internal Server Error" };
      (error as any).isAxiosError = true;
      (axios.isAxiosError as any) = jest.fn().mockReturnValue(true);
      mockedAxios.post.mockRejectedValue(error);

      const results = await MinerValidationService.validateBatch(["192.168.1.100"]);

      expect(results).toEqual([]);
    });

    it("should handle network errors without response", async () => {
      const error = new Error("Network error");
      (error as any).isAxiosError = true;
      (error as any).message = "Network error";
      (axios.isAxiosError as any) = jest.fn().mockReturnValue(true);
      mockedAxios.post.mockRejectedValue(error);

      const results = await MinerValidationService.validateBatch(["192.168.1.100"]);

      expect(results).toEqual([]);
    });

    it("should handle non-Error objects", async () => {
      const error = "String error";
      (axios.isAxiosError as any) = jest.fn().mockReturnValue(false);
      mockedAxios.post.mockRejectedValue(error);

      const results = await MinerValidationService.validateBatch(["192.168.1.100"]);

      expect(results).toEqual([]);
    });
  });
});
