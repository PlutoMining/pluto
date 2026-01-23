import { formatDifficulty, parseDifficulty } from "@/utils/formatDifficulty";

describe("formatDifficulty", () => {
  describe("parseDifficulty", () => {
    it("parses numbers and rejects non-finite values", () => {
      expect(parseDifficulty(123)).toBe(123);
      expect(parseDifficulty(Number.NaN)).toBeNull();
      expect(parseDifficulty(Number.POSITIVE_INFINITY)).toBeNull();
    });

    it("returns null for non-string inputs", () => {
      expect(parseDifficulty(null)).toBeNull();
      expect(parseDifficulty(undefined)).toBeNull();
      expect(parseDifficulty({})).toBeNull();
    });

    it("parses SI suffixes and exponents", () => {
      expect(parseDifficulty("1K")).toBe(1000);
      expect(parseDifficulty("2m")).toBe(2_000_000);
      expect(parseDifficulty("3.5 G")).toBe(3_500_000_000);
      expect(parseDifficulty("1e3")).toBe(1000);
      expect(parseDifficulty("1.5e3")).toBe(1500);
      expect(parseDifficulty(".5K")).toBe(500);
    });

    it("treats unknown suffixes as no suffix and rejects empty/invalid strings", () => {
      expect(parseDifficulty("  ")).toBeNull();
      expect(parseDifficulty("abc")).toBeNull();
      expect(parseDifficulty("10Z")).toBe(10);

      // Covers the non-finite base branch.
      expect(parseDifficulty("1e309")).toBeNull();
    });
  });

  it("formats as - for invalid values", () => {
    expect(formatDifficulty(undefined)).toBe("-");
    expect(formatDifficulty("")).toBe("-");
    expect(formatDifficulty("NaN")).toBe("-");

    // Covers `parseDifficulty` returning Infinity, and the post-parse finite guard.
    expect(formatDifficulty("1e308E")).toBe("-");
  });

  it("formats scaled values with sensible precision", () => {
    expect(formatDifficulty(0)).toBe("0");
    expect(formatDifficulty(999)).toBe("999");
    expect(formatDifficulty(1000)).toBe("1K");
    expect(formatDifficulty(1234)).toBe("1.23K");
    expect(formatDifficulty(9999)).toBe("10K");
    expect(formatDifficulty(12_345)).toBe("12.3K");
    expect(formatDifficulty(123_456)).toBe("123K");
    expect(formatDifficulty(-1234)).toBe("-1.23K");
  });
});
