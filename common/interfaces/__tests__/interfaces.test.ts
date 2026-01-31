import {
  DeviceFrequencyOptions,
  DeviceVoltageOptions,
  getMinerExtraFieldConfig,
  resolveMinerType,
} from "../index";

describe("@pluto/interfaces", () => {
  it("exports frequency options for known ASIC models", () => {
    expect(DeviceFrequencyOptions.BM1397).toBeDefined();
    expect(Array.isArray(DeviceFrequencyOptions.BM1397)).toBe(true);

    const defaultOption = DeviceFrequencyOptions.BM1397.find((opt) =>
      opt.label.includes("default"),
    );

    expect(defaultOption).toEqual({ label: "425 (default)", value: 425 });
  });

  it("exports voltage options for known ASIC models", () => {
    expect(DeviceVoltageOptions.BM1370).toBeDefined();
    expect(Array.isArray(DeviceVoltageOptions.BM1370)).toBe(true);

    const defaultOption = DeviceVoltageOptions.BM1370.find((opt) =>
      opt.label.includes("default"),
    );

    expect(defaultOption).toEqual({ label: "1150 (default)", value: 1150 });
  });

  describe("miner-type factory", () => {
    it("resolveMinerType returns bitaxe when make or model contains bitaxe", () => {
      expect(resolveMinerType({ make: "Bitaxe", model: "BM1397" })).toBe("bitaxe");
      expect(resolveMinerType({ make: "Other", model: "BitAxe 1" })).toBe("bitaxe");
      expect(resolveMinerType({ make: "", model: "bitaxe" })).toBe("bitaxe");
      expect(resolveMinerType({ make: "Acme", model: "X1" })).toBe(null);
      expect(resolveMinerType({})).toBe(null);
    });

    it("getMinerExtraFieldConfig returns BitAxe presets for bitaxe", () => {
      const config = getMinerExtraFieldConfig("bitaxe");
      expect(config.frequency?.presetOptions?.length).toBeGreaterThan(0);
      expect(config.frequency?.defaultValue).toBe(525);
      expect(config.frequency?.allowCustom).toBe(true);
      expect(config.core_voltage?.presetOptions?.length).toBeGreaterThan(0);
      expect(config.core_voltage?.defaultValue).toBe(1150);
    });

    it("getMinerExtraFieldConfig returns input-only for null or unknown miner type", () => {
      const defaultConfig = getMinerExtraFieldConfig(null);
      expect(defaultConfig.frequency?.presetOptions).toEqual([]);
      expect(defaultConfig.frequency?.allowCustom).toBe(true);
      expect(defaultConfig.core_voltage?.presetOptions).toEqual([]);

      const unknownConfig = getMinerExtraFieldConfig("unknown");
      expect(unknownConfig.frequency?.presetOptions).toEqual([]);
      expect(unknownConfig.core_voltage?.presetOptions).toEqual([]);
    });
  });
});
