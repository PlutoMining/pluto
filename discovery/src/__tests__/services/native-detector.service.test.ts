import {
  NativeMinerDetectorService,
  nativeMinerDetector,
} from "@/services/native-detector.service";
import { logger } from "@pluto/logger";

jest.mock("@pluto/logger", () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

const mockFetch = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(global, "fetch").mockImplementation(mockFetch as any);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("BitaxeDetector (via NativeMinerDetectorService.detect)", () => {
  it("returns null on fetch failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network error"));

    const result = await nativeMinerDetector.detect("192.168.1.100");

    expect(result).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith(
      "http://192.168.1.100/api/system/info",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it("returns null when res.ok is false", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({}),
    });

    const result = await nativeMinerDetector.detect("192.168.1.100");

    expect(result).toBeNull();
  });

  it("returns null when ASICModel is missing", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        macAddr: "aa:bb:cc:dd:ee:ff",
        hostname: "bitaxe-1",
        version: "1.0",
        boardVersion: "v2",
        // ASICModel intentionally omitted
      }),
    });

    const result = await nativeMinerDetector.detect("192.168.1.100");

    expect(result).toBeNull();
  });

  it("returns full NativeDetectionResult when valid Bitaxe API response", async () => {
    const bitaxeResponse = {
      ASICModel: "BM1397",
      macAddr: "aa:bb:cc:dd:ee:ff",
      hostname: "bitaxe-1",
      version: "1.0.0",
      boardVersion: "v2",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => bitaxeResponse,
    });

    const result = await nativeMinerDetector.detect("192.168.1.100");

    expect(result).not.toBeNull();
    expect(result).toEqual({
      type: "Bitaxe v2",
      model: "Bitaxe v2",
      mac: "aa:bb:cc:dd:ee:ff",
      supportLevel: "native",
      minerData: {
        ip: "192.168.1.100",
        mac: "aa:bb:cc:dd:ee:ff",
        hostname: "bitaxe-1",
        deviceInfo: {
          make: "Bitaxe",
          model: "Bitaxe v2",
          firmware: "1.0.0",
          algo: "SHA256",
        },
      },
    });
  });

  it("includes all expected fields (type, model, mac, supportLevel, minerData)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ASICModel: "BM1397",
        macAddr: "ff:ee:dd:cc:bb:aa",
        hostname: "my-bitaxe",
        version: "2.0",
        boardVersion: "",
      }),
    });

    const result = await nativeMinerDetector.detect("10.0.0.5");

    expect(result).toMatchObject({
      type: "Bitaxe",
      model: "Bitaxe",
      mac: "ff:ee:dd:cc:bb:aa",
      supportLevel: "native",
      minerData: expect.objectContaining({
        ip: "10.0.0.5",
        mac: "ff:ee:dd:cc:bb:aa",
        hostname: "my-bitaxe",
        deviceInfo: expect.objectContaining({
          make: "Bitaxe",
          model: "Bitaxe",
          firmware: "2.0",
          algo: "SHA256",
        }),
      }),
    });
  });

  it("handles undefined boardVersion (uses empty string)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ASICModel: "BM1397",
        macAddr: "aa:bb:cc",
        hostname: "bitaxe",
        version: "1.0",
        // boardVersion intentionally omitted (undefined)
      }),
    });

    const result = await nativeMinerDetector.detect("192.168.1.1");

    expect(result?.type).toBe("Bitaxe");
    expect(result?.model).toBe("Bitaxe");
  });

  it("includes boardVersion in type when present", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ASICModel: "BM1397",
        macAddr: "aa:bb:cc",
        hostname: "bitaxe",
        version: "1.0",
        boardVersion: "Ultra",
      }),
    });

    const result = await nativeMinerDetector.detect("192.168.1.1");

    expect(result?.type).toBe("Bitaxe Ultra");
    expect(result?.model).toBe("Bitaxe Ultra");
  });
});

describe("NativeMinerDetectorService.detect", () => {
  it("returns null when no detector matches", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const result = await nativeMinerDetector.detect("192.168.1.99");

    expect(result).toBeNull();
    expect(logger.debug).toHaveBeenCalledWith(
      "[discovery] Native detector: no match for 192.168.1.99"
    );
  });

  it("returns first matching result", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ASICModel: "BM1397",
        macAddr: "aa:bb:cc",
        hostname: "bitaxe",
        version: "1.0",
        boardVersion: "v1",
      }),
    });

    const result = await nativeMinerDetector.detect("192.168.1.50");

    expect(result).not.toBeNull();
    expect(result?.type).toBe("Bitaxe v1");
    expect(logger.info).toHaveBeenCalledWith(
      "[discovery] Native detector: matched 192.168.1.50 (Bitaxe v1), path=native"
    );
  });

  it("returns null when res.json throws (invalid response)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new Error("invalid JSON");
      },
    });

    const result = await nativeMinerDetector.detect("192.168.1.100");

    expect(result).toBeNull();
    expect(logger.debug).toHaveBeenCalledWith(
      "[discovery] Native detector: no match for 192.168.1.100"
    );
  });

  it("handles detector throwing (catches and continues to next)", async () => {
    const throwingDetector = {
      detect: jest.fn().mockRejectedValue(new Error("detector threw")),
    };
    const service = new NativeMinerDetectorService();
    (service as any).detectors = [throwingDetector, ...(service as any).detectors];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ASICModel: "BM1397",
        macAddr: "aa:bb:cc",
        hostname: "bitaxe",
        version: "1.0",
        boardVersion: "",
      }),
    });

    const result = await service.detect("192.168.1.100");

    expect(logger.debug).toHaveBeenCalledWith(
      "Native detector failed for 192.168.1.100:",
      expect.any(Error)
    );
    expect(result).not.toBeNull();
    expect(result?.type).toBe("Bitaxe");
  });

  it("logs appropriate messages on match", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ASICModel: "BM1397",
        macAddr: "aa:bb:cc",
        hostname: "bitaxe",
        version: "1.0",
        boardVersion: "",
      }),
    });

    await nativeMinerDetector.detect("10.0.0.1");

    expect(logger.info).toHaveBeenCalledWith(
      "[discovery] Native detector: matched 10.0.0.1 (Bitaxe), path=native"
    );
  });

  it("logs appropriate messages when no match", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await nativeMinerDetector.detect("10.0.0.2");

    expect(logger.debug).toHaveBeenCalledWith(
      "[discovery] Native detector: no match for 10.0.0.2"
    );
  });
});

describe("nativeMinerDetector export", () => {
  it("is instance of NativeMinerDetectorService", () => {
    expect(nativeMinerDetector).toBeInstanceOf(NativeMinerDetectorService);
  });
});
