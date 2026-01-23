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
    it("returns raw value for non-object inputs", () => {
      expect(normalizeSystemInfo(null)).toBeNull();
      expect(normalizeSystemInfo("x")).toBe("x");
    });

    it("normalizes best diff keys and uptime", () => {
      const normalized = normalizeSystemInfo({
        best_diff: "1M",
        best_session_difficulty: "2M",
        current_difficulty: "3M",
        uptime_s: "10",
      });

      expect(normalized.bestDiff).toBe("1M");
      expect(normalized.bestSessionDiff).toBe("2M");
      expect(normalized.currentDiff).toBe("3M");
      expect(normalized.uptimeSeconds).toBe(10);
    });

    it("does not overwrite uptimeSeconds when not coercible", () => {
      const normalized = normalizeSystemInfo({
        uptime_seconds: "nope",
      });

      expect(normalized.uptimeSeconds).toBeUndefined();
    });

    it("normalizes psram availability and heap counters", () => {
      const normalizedTrue = normalizeSystemInfo({
        isPSRAMAvailable: true,
        free_heap_internal: "100",
        freeHeapSpiram: 200,
      });

      expect(normalizedTrue.isPSRAMAvailable).toBe(1);
      expect(normalizedTrue.freeHeapInternal).toBe(100);
      expect(normalizedTrue.freeHeapSpiram).toBe(200);

      const normalizedFalse = normalizeSystemInfo({
        is_psram_available: false,
      });

      expect(normalizedFalse.isPSRAMAvailable).toBe(0);

      const normalizedNumeric = normalizeSystemInfo({
        isPSRAMAvailable: "2",
      });

      expect(normalizedNumeric.isPSRAMAvailable).toBe(2);
    });
  });
});
