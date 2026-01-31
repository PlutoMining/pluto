import {
  coerceFiniteNumber,
  normalizeSystemInfo,
  pickFirstValue,
  resolveAsicModelKey,
} from "@/services/tracing.helpers";

describe("tracing.helpers", () => {
  describe("resolveAsicModelKey", () => {
    it("returns undefined for non-strings", () => {
      expect(resolveAsicModelKey(undefined)).toBeUndefined();
      expect(resolveAsicModelKey(123)).toBeUndefined();
    });

    it("returns undefined for blank strings", () => {
      expect(resolveAsicModelKey("  ")).toBeUndefined();
    });

    it("extracts BM ASIC model tokens", () => {
      expect(resolveAsicModelKey("BM1368 rev1")).toBe("BM1368");
      expect(resolveAsicModelKey("  BM1370  ")).toBe("BM1370");
    });

    it("falls back to trimmed input when no BM match", () => {
      expect(resolveAsicModelKey(" NerdQAxe+ ")).toBe("NerdQAxe+");
    });
  });

  describe("pickFirstValue", () => {
    it("returns the first defined key value", () => {
      expect(pickFirstValue({ a: 1, b: 2 }, ["a", "b"])).toBe(1);
      expect(pickFirstValue({ a: null, b: 2 }, ["a", "b"])).toBe(2);
    });

    it("returns undefined when none are present", () => {
      expect(pickFirstValue({ a: undefined }, ["a", "b"]))
        .toBeUndefined();
    });
  });

  describe("coerceFiniteNumber", () => {
    it("returns finite numbers", () => {
      expect(coerceFiniteNumber(5)).toBe(5);
      expect(coerceFiniteNumber(" 42 ")).toBe(42);
    });

    it("returns undefined for non-finite values", () => {
      expect(coerceFiniteNumber(Number.POSITIVE_INFINITY)).toBeUndefined();
      expect(coerceFiniteNumber("NaN")).toBeUndefined();
      expect(coerceFiniteNumber({})).toBeUndefined();
    });
  });

  describe("normalizeSystemInfo", () => {
    it("returns raw value as-is (no transformation)", () => {
      // normalizeSystemInfo is deprecated and now just passes through the raw value
      expect(normalizeSystemInfo(null)).toBeNull();
      expect(normalizeSystemInfo("x")).toBe("x");
      
      const pyasicData = {
        best_difficulty: "1M",
        best_session_difficulty: "2M",
        uptime: 10,
        wattage: 100,
      };
      
      const result = normalizeSystemInfo(pyasicData);
      expect(result).toEqual(pyasicData);
      expect(result.best_difficulty).toBe("1M");
      expect(result.best_session_difficulty).toBe("2M");
      expect(result.uptime).toBe(10);
    });
  });
});
